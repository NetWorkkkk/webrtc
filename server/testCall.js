const WebSocket = require('ws');

// Helper to create a WebSocket client (with optional rejectUnauthorized for WSS)
function createClient(url, options = {}) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, options);
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

function sendAndWait(ws, msg, wait = true) {
    sendMsg(ws, msg);
    if (wait) return waitForMessage(ws);
    return Promise.resolve();
}

async function testCallFlow() {
    const URL = 'ws://localhost:3000/ws';   // adjust to your server's actual URL/port
    // For self-signed certificates, add rejectUnauthorized: false
    const options = { rejectUnauthorized: false };

    console.log('\n=== Setup: Create room with owner and add a test user ===');
    const ownerWs = await createClient(URL, options);
    const testUserWs = await createClient(URL, options);
    const extraUserWs = await createClient(URL, options);

    // Owner creates room
    await sendAndWait(ownerWs, { type: 'createRoom', roomId: 'callRoom', username: 'Alice' });
    // Test user joins room
    await sendAndWait(testUserWs, { type: 'joinRoom', roomId: 'callRoom', username: 'Bob' });
    // Extra user joins room
    await sendAndWait(extraUserWs, { type: 'joinRoom', roomId: 'callRoom', username: 'Charlie' });

    console.log('\n=== Test 1: Start call by owner (Alice) ===');
    await sendAndWait(ownerWs, { type: 'startCall', roomId: 'callRoom', username: 'Alice' });

    console.log('\n=== Test 2: Try to start call again (should fail) ===');
    const startCallAgain = await sendAndWait(ownerWs, { type: 'startCall', roomId: 'callRoom', username: 'Alice' });
    if (startCallAgain.type === 'error') console.log('✅ Correctly rejected duplicate startCall');

    console.log('\n=== Test 3: Bob joins the call ===');
    await sendAndWait(testUserWs, { type: 'joinCall', roomId: 'callRoom', username: 'Bob' });
    // Bob should receive callMembers list
    // Meanwhile, Alice should receive memberJoinCall broadcast
    // (We don't wait for that here, but logs will show)

    console.log('\n=== Test 4: Charlie joins the call ===');
    await sendAndWait(extraUserWs, { type: 'joinCall', roomId: 'callRoom', username: 'Charlie' });

    console.log('\n=== Test 5: Bob leaves the call ===');
    await sendAndWait(testUserWs, { type: 'leaveCall', roomId: 'callRoom', username: 'Bob' });
    // Should broadcast memberLeaveCall

    console.log('\n=== Test 6: Bob tries to leave again (should fail) ===');
    const leaveAgain = await sendAndWait(testUserWs, { type: 'leaveCall', roomId: 'callRoom', username: 'Bob' });
    if (leaveAgain.type === 'error') console.log('✅ Correctly rejected duplicate leaveCall');

    console.log('\n=== Test 7: Try to join a non‑existent call (should fail) ===');
    const fakeJoin = await sendAndWait(ownerWs, { type: 'joinCall', roomId: 'callRoom', username: 'FakeUser' });
    if (fakeJoin.type === 'error') console.log('✅ Correctly rejected joinCall for user not in room');

    console.log('\n=== Cleanup: leave room and disconnect ===');
    await sendAndWait(ownerWs, { type: 'leaveRoom', roomId: 'callRoom', username: 'Alice' });
    await sendAndWait(testUserWs, { type: 'leaveRoom', roomId: 'callRoom', username: 'Bob' });
    await sendAndWait(extraUserWs, { type: 'leaveRoom', roomId: 'callRoom', username: 'Charlie' });

    ownerWs.close();
    testUserWs.close();
    extraUserWs.close();
    console.log('All clients disconnected');
}

testCallFlow().catch(console.error);