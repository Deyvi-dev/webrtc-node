const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input')
const connectButton = document.getElementById('connect-button')

const videoChatContainer = document.getElementById('video-chat-container')
const localVideoComponent = document.getElementById('local-video')


const socket = io()
const mediaConstraints = {
  audio: true,
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}
const offerOptions = {
  offerToReceiveVideo: 1,
  offerToReceiveAudio: 1,
};


var peerConnections = {}; 

let localPeerId;
let localStream;
let rtcPeerConnection
let roomId; 

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}


connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value)
})

socket.on('room_created', async (event) => {
  localPeerId = event.peerId
  console.log(`Current peer ID: ${localPeerId}`)
  console.log(`Socket event callback: room_created with by peer ${localPeerId}, created room ${event.roomId}`)
 
  await setLocalStream(mediaConstraints)
  saveLocalStreamToFile();
})


socket.on('room_joined', async (event) => {
  localPeerId = event.peerId
  console.log(`Current peer ID: ${localPeerId}`)
  console.log(`Socket event callback: room_joined by peer ${localPeerId}, joined room ${event.roomId}`)

  // await setLocalStream(mediaConstraints)
  console.log(`Emit start_call from peer ${localPeerId}`)
  socket.emit('start_call', {
    roomId: event.roomId,
    senderId: localPeerId
  })
})


socket.on('start_call', async (event) => {
  const remotePeerId = event.senderId;
  console.log(`Socket event callback: start_call. RECEIVED from ${remotePeerId}`)

  peerConnections[remotePeerId] = new RTCPeerConnection(iceServers)
  addLocalTracks(peerConnections[remotePeerId])
  // peerConnections[remotePeerId].ontrack = (event) => setRemoteStream(event, remotePeerId)
  peerConnections[remotePeerId].oniceconnectionstatechange = (event) => checkPeerDisconnect(event, remotePeerId);
  peerConnections[remotePeerId].onicecandidate = (event) => sendIceCandidate(event, remotePeerId)
  await createOffer(peerConnections[remotePeerId], remotePeerId)
})


socket.on('webrtc_offer', async (event) => {
  console.log(`Socket event callback: webrtc_offer. RECEIVED from ${event.senderId}`)
  const remotePeerId = event.senderId;

  peerConnections[remotePeerId] = new RTCPeerConnection(iceServers)
  console.log(new RTCSessionDescription(event.sdp))
  peerConnections[remotePeerId].setRemoteDescription(new RTCSessionDescription(event.sdp))
  console.log(`Remote description set on peer ${localPeerId} after offer received`)
  // addLocalTracks(peerConnections[remotePeerId])

  peerConnections[remotePeerId].ontrack = (event) => setRemoteStream(event, remotePeerId)
  peerConnections[remotePeerId].oniceconnectionstatechange = (event) => checkPeerDisconnect(event, remotePeerId);
  peerConnections[remotePeerId].onicecandidate = (event) => sendIceCandidate(event, remotePeerId)
  await createAnswer(peerConnections[remotePeerId], remotePeerId)
})


socket.on('webrtc_answer', async (event) => {
  console.log(`Socket event callback: webrtc_answer. RECEIVED from ${event.senderId}`)

  console.log(`Remote description set on peer ${localPeerId} after answer received`)
  peerConnections[event.senderId].setRemoteDescription(new RTCSessionDescription(event.sdp))
  addLocalTracks(peerConnections[event.senderId])
  console.log(new RTCSessionDescription(event.sdp))
})


socket.on('webrtc_ice_candidate', (event) => {
  const senderPeerId = event.senderId;
  console.log(`Socket event callback: webrtc_ice_candidate. RECEIVED from ${senderPeerId}`)

  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  peerConnections[senderPeerId].addIceCandidate(candidate)
})


function joinRoom(room) {
  if (room === '') {
    alert('Please type a room ID')
  } else {
    roomId = room
    socket.emit('join', {room: room, peerUUID: localPeerId})
    showVideoConference()
  }
}


function showVideoConference() {
  roomSelectionContainer.style = 'display: none'
  videoChatContainer.style = 'display: block'
}


async function setLocalStream(mediaConstraints) {
  console.log('Local stream set')
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideoComponent.srcObject = stream
}


function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
  console.log("Local tracks added")
}


async function createOffer(rtcPeerConnection, remotePeerId) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer(offerOptions)
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  console.log(`Sending offer from peer ${localPeerId} to peer ${remotePeerId}`)
  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomId: roomId,
    senderId: localPeerId,
    receiverId: remotePeerId
  })
}


async function createAnswer(rtcPeerConnection, remotePeerId) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer(offerOptions)
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  console.log(`Sending answer from peer ${localPeerId} to peer ${remotePeerId}`)
  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomId: roomId,
    senderId: localPeerId,
    receiverId: remotePeerId
  })
}


function setRemoteStream(event, remotePeerId) {
  console.log('Remote stream set')
  if(event.track.kind == "video") {
    const videoREMOTO = document.createElement('video')
    videoREMOTO.srcObject = event.streams[0];
    videoREMOTO.id = 'remotevideo_' + remotePeerId;
    videoREMOTO.setAttribute('autoplay', '');
    videoREMOTO.style.backgroundColor = "red";
    videoChatContainer.append(videoREMOTO)
  } 
}


function sendIceCandidate(event, remotePeerId) {
  if (event.candidate) {
    console.log(`Sending ICE Candidate from peer ${localPeerId} to peer ${remotePeerId}`)
    socket.emit('webrtc_ice_candidate', {
      senderId: localPeerId,
      receiverId: remotePeerId,
      roomId: roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}


function checkPeerDisconnect(event, remotePeerId) {
  var state = peerConnections[remotePeerId].iceConnectionState;
  console.log(`connection with peer ${remotePeerId}: ${state}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
   
    console.log(`Peer ${remotePeerId} has disconnected`);
    const videoDisconnected = document.getElementById('remotevideo_' + remotePeerId)
    videoDisconnected.remove()
  }
}


function saveLocalStreamToFile() {
  console.log('Recording and sending the local stream to the server');

  const mediaRecorder = new MediaRecorder(localStream);
  const recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[^0-9]/g, '');

    const blob = new Blob(recordedChunks, { type: 'video/webm' });

    const formData = new FormData();
    formData.append('media', blob, `localVideo_${timestamp}.webm`);

    fetch('/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
      })
      .catch((error) => {
        console.error('Error uploading media to the server', error);
      });
  };

  mediaRecorder.start();
  setTimeout(() => {
    mediaRecorder.stop();
  }, 50000); 
}
