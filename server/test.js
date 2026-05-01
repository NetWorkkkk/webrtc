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

async function testOffer() {
    const URL = 'ws://localhost:3000/ws';
    const ownerWs = await createClient(URL);
    const testUserWs = await createClient(URL);
    // const intruderWs = await createClient(URL);

    console.log('\n=== Setup: Create and join room ===');
    console.log('1. Owner creates room 123');
    await sendAndWait(ownerWs, { type: 'createRoom', roomId: '123', username: 'owner' });
    
    console.log('2. TestUser joins room 123');
    await sendAndWait(testUserWs, { type: 'joinRoom', roomId: '123', username: 'testUser' });
    waitForMessage(ownerWs); // wait for 'memberJoinRoom' msg

    console.log('\n=== Test: owner creates call ===');
    await sendAndWait(ownerWs, { type: 'offer', roomId: '123', username: 'owner' }, wait=false);
    
    waitForMessage(testUserWs); // wait for 'offer' msg
    waitForMessage(ownerWs); // wait for 'offer' msg

    console.log('\n=== Cleanup ===');
    ownerWs.close();
    testUserWs.close();
    // intruderWs.close();
    console.log('All clients disconnected');
}

// testLeaveRoom().catch(console.error);
// testOffer().catch(console.error);

async function testFullSignalingFlow() {
    const URL = 'ws://localhost:3000/ws';
    
    console.log('\n=== SETUP: Initialize connections and room ===');
    const senderWs = await createClient(URL);   // sander (A)
    const receiverWs = await createClient(URL); // receiver (B)

    // 1. A create room 123 with username 'A'
    await sendAndWait(senderWs, { 
        type: 'createRoom', roomId: '123', username: 'A' 
    });
    
    // 2. B join room 123 with username 'B' 
    await sendAndWait(receiverWs, { 
        type: 'joinRoom', roomId: '123', username: 'B' 
    });
    
    // wait for 'memberJoinRoom' message on senderWs to ensure B has joined before A sends offer
    await waitForMessage(senderWs); 

    console.log('\n=== TEST 1: Send OFFER from A to B ===');
    // A send offer to B with target='Bình' (server should route this to receiverWs)
    const offerPayload = {
        roomId: '123',
        username: 'A',
        type: 'offer',
        target: 'B',
        sdp: 'v=0\r\no=- 421... Bruhlmao'
    };
    sendMsg(senderWs, offerPayload);

    // B should receive the offer with sender='A'
    const receivedOffer = await waitForMessage(receiverWs);
    if (receivedOffer.type === 'offer' && receivedOffer.sender === 'A') {
        console.log('[Success] B received OFFER from A');
    }

    console.log('\n=== TEST 2: Send ANSWER from B to A ===');
    // B creates answer and specifies target as 'A'
    const answerPayload = {
        roomId: '123',
        username: 'B',
        type: 'answer',
        target: 'A',
        sdp: 'v=0\r\no=- 532... BruhlmaoAnswer'
    };
    sendMsg(receiverWs, answerPayload);

    // A should receive the answer with sender='B'
    const receivedAnswer = await waitForMessage(senderWs);
    if (receivedAnswer.type === 'answer' && receivedAnswer.sender === 'B') {
        console.log('[Success] A received ANSWER from B');
    }

    console.log('\n=== TEST 3: Send CANDIDATE from A to B ===');
    // A sends candidate to B
    const candidatePayload = {
        roomId: '123',
        username: 'A',
        type: 'candidate',
        target: 'B',
        candidate: { candidate: 'abc-xyz', sdpMid: '0' }
    };
    sendMsg(senderWs, candidatePayload);

    // B should receive the candidate with sender='A'
    const receivedCandidate = await waitForMessage(receiverWs);
    if (receivedCandidate.type === 'candidate' && receivedCandidate.sender === 'A') {
        console.log('[Success] B received CANDIDATE from A');
    }

    console.log('\n=== TEST 4: Send OFFER to non-existent target ===');
    sendMsg(senderWs, {
        roomId: '123',
        username: 'A',
        type: 'offer',
        target: 'BRUHLMAO', // target does not exist in room
        sdp: '...'
    });
    
    const errorMsg = await waitForMessage(senderWs);
    if (errorMsg.type === 'ERROR') {
        console.log('[Success] Received error when sending to non-existent target: ', errorMsg.message);
    }

    console.log('\n=== CLEANUP ===');
    senderWs.close();
    receiverWs.close();
    console.log('All clients disconnected');
}

testFullSignalingFlow().catch(console.error);