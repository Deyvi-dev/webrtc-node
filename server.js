const path = require('path')
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const multer = require('multer'); // For handling file uploads
const fs = require('fs');



// Define a storage engine for multer to save uploaded files in the "uploads" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); 
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); 
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('media'), (req, res) => {
  console.log('File uploaded:', req.file.originalname);



  res.sendStatus(200);
});
app.use('/', express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`User connected`)
  socket.on('join', (payload) => {
    const roomId = payload.room
    const roomClients = io.sockets.adapter.rooms[roomId] || { length: 0 }
    const numberOfClients = roomClients.length
    console.log(`Room ID: ${roomId}`)
    console.log(`roomClients: ${roomClients}`)
    console.log(`numberOfClients of ${roomId}: ${numberOfClients}`)


    // These events are emitted only to the sender socket.
    if (numberOfClients == 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', {
        roomId: roomId,
        peerId: socket.id
      })
    } else {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', {
        roomId: roomId,
        peerId: socket.id
      })
    } 
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (event) => {
    console.log(`Broadcasting start_call event to peers in room ${event.roomId} from peer ${event.senderId}`)
    socket.broadcast.to(event.roomId).emit('start_call', {
      senderId: event.senderId
  })})

  //Events emitted to only one peer
  socket.on('webrtc_offer', (event) => {
    console.log(`Sending webrtc_offer event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_offer', {
      sdp: event.sdp,
      senderId: event.senderId
  })})

  socket.on('webrtc_answer', (event) => {
    console.log(`Sending webrtc_answer event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_answer', {
      sdp: event.sdp,
      senderId: event.senderId
  })})

  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Sending webrtc_ice_candidate event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_ice_candidate', event)
  })
})

// START THE SERVER =================================================================
const port = process.env.PORT || 3001
server.listen(port, () => {
  console.log(`Express server listening on port ${port}`)
})