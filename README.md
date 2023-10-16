# N:N Videoconferencing Made Simple Using WebRTC

Prototype of a multi-user video conference using WebRTC with pure JavaScript and HTML. For signaling, it uses Node.js, and all multimedia streams are sent directly between users (P2P) after the signaling process is completed.

<!--
Demo [here!](https://multiuser-videochat-webrtc.herokuapp.com/)
-->

## Signaling

The signaling process is based on [this amazing article by Borja Nebbal](https://acidtango.com/thelemoncrunch/how-to-implement-a-video-conference-with-webrtc-and-node/) and adapted for N:N communications. The messages used in this signaling process are illustrated in the image below.

<p align="center">
 <img src="https://i.imgur.com/2cKtNtO.png" width="600" height="auto">
</p>

## Usage

Simply enter the code of your video conference room and share this code so that others can join the same room.

# webrtc-node
