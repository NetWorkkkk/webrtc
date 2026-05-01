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

function testJoinRoom() {
    const ws = new WebSocket('ws://localhost:3000/ws');

    function testMsg(msg) {
        console.log('Sending msg: ', msg);
        ws.send(msg);
    }


    ws.on('open', () => {
        console.log('Connected to server');

        // create one room
        testMsg(JSON.stringify({
            type: 'createRoom',
            roomId: '123',
            username: 'owner'
        }));

        // correct
        testMsg(JSON.stringify({
            type: 'joinRoom',
            roomId: '123',
            username: 'testUser'
        }));

        // username exist
        testMsg(JSON.stringify({
            type: 'joinRoom',
            roomId: '123',
            username: 'testUser'
        }));

        // room not exist
        testMsg(JSON.stringify({
            type: 'joinRoom',
            roomId: 'aaa',
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

function createClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function sendMsg(ws, msg) {
  console.log('Sending:', JSON.stringify(msg));
  ws.send(JSON.stringify(msg));
}

function waitForMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      const parsed = JSON.parse(data.toString());
      console.log('Received:', parsed);
      resolve(parsed);
    });
  });
}

function sendAndWait(ws, msg, wait=true) {
  sendMsg(ws, msg);
  if (wait)
      return waitForMessage(ws);
}

async function testLeaveRoom() {
  const URL = 'ws://localhost:3000/ws';

  // --- Setup: Create 2 clients, each bound to their own ws ---
  const ownerWs = await createClient(URL);
  const testUserWs = await createClient(URL);
  const intruderWs = await createClient(URL); // a ws that never joined room '123'

  console.log('\n=== Setup: Create and join room ===');

  // owner creates the room → server sets ownerWs.currentRoomId='123', currentUsername='owner'
  await sendAndWait(ownerWs, { type: 'createRoom', roomId: '123', username: 'owner' });

  // testUser joins → server sets testUserWs.currentRoomId='123', currentusername='testUser'
  await sendAndWait(testUserWs, { type: 'joinRoom', roomId: '123', username: 'testUser' });

  console.log('\n=== Test 1: Wrong username (intruder ws sends leaveRoom as "hihi") ===');
  // intruderWs never joined → currentusername=null, currentRoomId=null → mismatch
  await sendAndWait(intruderWs, { type: 'leaveRoom', roomId: '123', username: 'hihi' });

  console.log('\n=== Test 1b: Wrong username (intruder ws in the same room, sends leaveRoom as "hihi") ===');
  await sendAndWait(intruderWs, { type: 'joinRoom', roomId: '123', username: 'intruder' });
  await sendAndWait(intruderWs, { type: 'leaveRoom', roomId: '123', username: 'hihi' });

  console.log('\n=== Test 2: Wrong roomId (testUserWs is in room "123", sends "aaa") ===');
  // testUserWs.currentRoomId='123' but msg says 'aaa' → mismatch
  await sendAndWait(testUserWs, { type: 'leaveRoom', roomId: 'aaa', username: 'testUser' });

  console.log('\n=== Test 3: Correct leave — testUser leaves room 123 ===');
  // Both roomId and username match → success
  await sendAndWait(testUserWs, { type: 'leaveRoom', roomId: '123', username: 'testUser' }, false);

  console.log('\n=== Test 4: Correct leave — owner leaves room 123 (room now empty) ===');
  // owner is the last member → room becomes empty after this
  await sendAndWait(ownerWs, { type: 'leaveRoom', roomId: '123', username: 'owner' });
  await sendAndWait(intruderWs, { type: 'leaveRoom', roomId: '123', username: 'intruder' });
  await sendAndWait(testUserWs, { type: 'leaveRoom', roomId: '123', username: 'testUser' });


  console.log('\n=== Cleanup ===');
  ownerWs.close();
  testUserWs.close();
  intruderWs.close();
  console.log('All clients disconnected');
}

testLeaveRoom().catch(console.error);

