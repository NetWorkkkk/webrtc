const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
    console.log('Connected to server');

    ws.send(JSON.stringify({
        type: 'joinRoom',
        roomId: '123',
        username: 'testUser'
    }));

    ws.send(JSON.stringify({
        type: 'leaveRoom',
        roomId: '123',
        username: 'testUser'
    }));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});

ws.on('close', () => {
    console.log('Disconnected');
});
