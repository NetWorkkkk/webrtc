const fs = require('fs');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const SignalingHandler = require('./signalingHandler');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: "/ws" });

app.use(express.static(path.join(__dirname, '../public')));

// Khởi tạo signaling handler
const signalingHandler = new SignalingHandler();

wss.on('connection', (ws) => {
    signalingHandler.handleConnection(ws);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
