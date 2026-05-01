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

    handleDisconnect(ws, msg) {
        if (ws.currentRoomId && ws.currentUsername) {
            const roomId = ws.currentRoomId;
            const username = ws.currentUsername;
            
            if (this.roomManager.getCallMembers(roomId).includes(username)) {
                // try leave call
                // this.handleLeaveCall(ws, { roomId, username });
            }

            // leave room
            if (this.roomManager.getRoomMembers(roomId).includes(username)) {
                this.handleLeaveRoom(ws, { roomId, username });
            }
            
            console.log(`[${roomId}] ${username} disconnected and left room`);
        } else {
            console.log(`A user disconnected`);
        }         
    }

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
            case 'startCall':
                this.handleStartCall(ws, msg);
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
                console.log("ROOM MANAGER:", this.roomManager);
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

        if (!roomId || roomId.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.joinRoom(roomId, username);
        
        if (!result.success) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: result.error
            }));
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
            members: this.roomManager.getRoomMembers(roomId)
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

    handleLeaveRoom(ws, msg) {
        console.log(ws.currentRoomId, ws.currentUsername)
        if (ws.currentRoomId === null || ws.currentUsername === null) {
            ws.send(JSON.stringify({ type: 'error', message: 'User must be in a room before leaving.' }));
            return;
        }

        const { roomId, username } = msg;
        console.log(roomId, username);

        if (ws.currentRoomId !== roomId || ws.currentUsername !== username) {
            ws.send(JSON.stringify({ type: 'error', message: 'RoomId or username does not match the current socket' }));
            return;
        }

        const result = this.roomManager.leaveRoom(roomId, username);
        
        if (!result.success) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: result.error
            }));
            return
        }

        // delete the ws from map
        const key = this.getClientKey(roomId, username);
        this.clients.delete(key);

        // broadcast memberLeftRoom for remaining members
        this.broadcastToRoom(roomId, {
            type: 'memberLeftRoom',
            roomId,
            username: username
        });

        // remove roomId & username in ws
        ws.currentRoomId = null;
        ws.currentUsername = null;

        console.log(`[${roomId}] ${username} left room`);
    }

    handleStartCall(ws, msg) {
        const { roomId, username } = msg;
        if (!username || username.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username: username must contain non-space character.' }));
            return;
        }
        if (!roomId || roomId.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.startCall(roomId, username);
        if (!result.success) {
            ws.send(JSON.stringify({
                type: 'error',
                message: result.error
            }));
            return;
        }

        // to all roomMembers (include host)
        this.broadcastToRoom(roomId, {
            type: 'memberJoinCall',
            roomId,
            username
        });

        console.log(`[${roomId}] ${username} started call`);
    }

    handleJoinCall(ws, msg) {
        const { roomId, username } = msg;
        if (!username || username.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username: username must contain non-space character.' }));
            return;
        }
        if (!roomId || roomId.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.joinCall(roomId, username);
        if (!result.success) {
            ws.send(JSON.stringify({
                type: 'error',
                message: result.error
            }));
            return;
        }

        const members = this.roomManager.getCallMembers(roomId);
        ws.send(JSON.stringify({
            type: 'callMembers',
            roomId,
            members
        }));

        this.broadcastToRoom(roomId, {
            type: 'memberJoinCall',
            roomId,
            username
        });

        console.log(`[${roomId}] ${username} joined call`);
    }

    handleLeaveCall(ws, msg) {
        const { roomId, username } = msg;
        if (!username || username.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username: username must contain non-space character.' }));
            return;
        }
        if (!roomId || roomId.trim() === '') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId: roomId must contain non-space character.' }));
            return;
        }

        const result = this.roomManager.leaveCall(roomId, username);
        if (!result.success) {
            ws.send(JSON.stringify({
                type: 'error',
                message: result.error
            }));
            return;
        }

        this.broadcastToRoom(roomId, {
            type: 'memberLeaveCall',
            roomId,
            username
        });

        console.log(`[${roomId}] ${username} left call`);
    }

    handleOffer(ws, msg) {
        this.handleSignaling(ws, msg, 'offer');
    }

    handleAnswer(ws, msg) {
        this.handleSignaling(ws, msg, 'answer');
    }

    handleCandidate(ws, msg) {
        this.handleSignaling(ws, msg, 'candidate');
    }

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

    handleSignaling(ws, msg, handleType) {
        console.log("User startCall (ws):", ws.currentRoomId, ws.currentUsername);
        if (ws.currentRoomId === null || ws.currentUsername === null) {
            ws.send(JSON.stringify({ type: 'error', message: 'User must be in a room before sending ' + handleType + '.' }));
            return;
        }

        if (!this.roomManager.getCallMembers(ws.currentRoomId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'No active call in this room.' }));
            return;
        }
        
        const { roomId, sender } = msg;
        console.log(roomId, sender);

        if (ws.currentRoomId !== roomId || ws.currentUsername !== sender) {
            ws.send(JSON.stringify({ type: 'error', message: 'RoomId or sender does not match the current socket' }));
            return;
        }

        const { target, type } = msg;

        if (!target) {
            ws.send(JSON.stringify({ type: 'error', message: 'Target username is required for ' + handleType + ' message.' }));
            return;
        }

        const targetSocket = this.clients.get(this.getClientKey(ws.currentRoomId, target));

        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            
            targetSocket.send(JSON.stringify({
                ...msg,
                sender: sender,
            }));
            console.log(`[Signaling] ${type} from ${sender} -> ${target}`);
        } else {
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: `User ${target} is not available.`
            }));
        }
    }

}

module.exports = SignalingHandler;
