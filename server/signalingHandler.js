const WebSocket = require('ws');
const RoomManager = require('./roomManager');

class SignalingHandler {
    constructor() {
        this.clients = new Map();   // key "roomId:username" -> WebSocket
        this.roomManager = new RoomManager();
    }

    // CONNECTION & DISCONNECT

    handleConnection(ws) {
        ws.currentRoomId = null;
        ws.currentUsername = null;

        ws.on('close', () => {
            this.handleDisconnect(ws);
        });

        ws.on('message', (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw);
            } catch (e) {
                console.error('Invalid JSON:', e);
                return;
            }
            this.handleMessage(ws, msg);
            console.log("[Msg]", msg);
            console.log("[*]", this.roomManager);
        });
    }

    handleDisconnect(ws, msg) {}

    handleMessage(ws, msg) {
        const { type } = msg;

        switch (type) {
            case 'createRoom':
                this.handleCreateRoom(ws, msg);
                break;
            case 'joinRoom':
                this.handleJoinRoom(ws, msg);
                break;
            case 'leaveRoom':
                this.handleLeaveRoom(ws, msg);
                break;
            case 'joinCall':
                this.handleJoinCall(ws, msg);
                break;
            case 'leaveCall':
                this.handleLeaveCall(ws, msg);
                break;
            case 'offer':
                this.handleOffer(ws, msg);
                break;
            case 'answer':
                this.handleAnswer(ws, msg);
                break;
            case 'candidate':
                this.handleCandidate(ws, msg);
                break;
            default:
                console.warn('Unknown message type:', type);
        }
    }

    // DETAILED MESSAGE HANDLER


    handleCreateRoom(ws, msg) {
        const { roomId, username } = msg;
        
        if (!username || username.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username: username must contain non-space character.' }));
            return;
        }

        if (!roomId || roomId.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.createRoom(roomId, username);
        
        if (!result.success) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Room already exists, please join it or create another one' 
            }));
            return;
        }

        ws.currentRoomId = roomId;
        ws.currentUsername = username;
        const key = this.getClientKey(roomId, username);
        this.clients.set(key, ws);

        // Gửi danh sách thành viên (chỉ có mình), ở client handle như join room
        ws.send(JSON.stringify({
            type: 'roomMembers',
            roomId,
            members: [username]
        }));

        console.log(`[${roomId}] ${username} created room`);
    }

    handleJoinRoom(ws, msg) {
        const { roomId, username } = msg;
        
        if (!username || username.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username: username must contain non-space character.' }));
            return;
        }

        if (!roomId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.joinRoom(roomId, username);
        
        if (!result.success) {
            if (result.error === 'room not exist') {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Room not found, please create or join another one' 
                }));
            } else if (result.error === 'username exist') {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Username already taken in this room, please choose another name' 
                }));
            }
            return;
        }

        ws.currentRoomId = roomId;
        ws.currentUsername = username;
        const key = this.getClientKey(roomId, username);
        this.clients.set(key, ws);

        // to the new member
        ws.send(JSON.stringify({
            type: 'roomMembers',
            roomId,
            members: result.members
        }));

        // to all remaining member
        this.broadcastToRoom(roomId, {
            type: 'memberJoinRoom',
            roomId,
            username: username
        }, username);

        // to the new member
        const callMembers = this.roomManager.getCallMembers(roomId);
        if (callMembers.length > 0) {
            ws.send(JSON.stringify({
                type: 'callMembers',
                roomId,
                members: callMembers
            }));
        }

        console.log(`[${roomId}] ${username} joined room`);
    }

    handleLeaveRoom(ws, msg) {}


    handleJoinCall(ws, msg) {}
    handleLeaveCall(ws, msg) {}
    handleOffer(ws, msg) {}
    handleAnswer(ws, msg) {}
    handleCandidate(ws, msg) {}


    // ---------- Helpers ----------

    getClientKey(roomId, username) {
        return `${roomId}:${username}`;
    }

    broadcastToRoom(roomId, message, excludeUsername = null) {
        const members = this.roomManager.getRoomMembers(roomId);
        for (const username of members) {
            if (username === excludeUsername) continue;
            const key = this.getClientKey(roomId, username);
            const clientWs = this.clients.get(key);
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify(message));
            }
        }
    }

}

module.exports = SignalingHandler;
