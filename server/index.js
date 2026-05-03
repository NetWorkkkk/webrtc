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

const signalingHandler = new SignalingHandler();

const HEARTBEAT_INTERVAL_MS = 30000;

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    signalingHandler.handleConnection(ws);
});

// Ping all clients every 30s. No pong back → abrupt disconnect → terminate.
// ws.terminate() fires the 'close' event, so handleDisconnect runs as normal.
const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log('[Heartbeat] client unresponsive, terminating');
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeat));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
