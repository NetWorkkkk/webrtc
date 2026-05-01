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


    handleCreateRoom(ws, msg) {}
    handleJoinRoom(ws, msg) {}
    handleLeaveRoom(ws, msg) {}
    handleJoinCall(ws, msg) {}
    handleLeaveCall(ws, msg) {}
    handleOffer(ws, msg) {}
    handleAnswer(ws, msg) {}
    handleCandidate(ws, msg) {}
}

module.exports = SignalingHandler;
