const WebSocket = require('ws');


function testCreateRoom() {
    const ws = new WebSocket('ws://localhost:3000/ws');

    function testMsg(msg) {
        console.log('Sending msg: ', msg);
        ws.send(msg);
    }


    ws.on('open', () => {
        console.log('Connected to server');
        // correct
        testMsg(JSON.stringify({
            type: 'createRoom',
            roomId: '123',
            username: 'testUser'
        }));

        // empty username
        testMsg(JSON.stringify({
            type: 'createRoom',
            roomId: '123',
        }));

        // empty roomid
        testMsg(JSON.stringify({
            type: 'createRoom',
            username: 'testUser'
        }));
    });

    ws.on('message', (data) => {
        console.log('Received:', data.toString());
    });

    ws.on('close', () => {
        console.log('Disconnected');
    });
}

testCreateRoom();
