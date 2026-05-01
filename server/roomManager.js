class RoomManager {
    constructor() {
        this.roomMembers = new Map(); // roomId -> Set<username>
        this.callMembers = new Map(); // roomId -> Set<username>
    }

    createRoom(roomId, username) {
        // room exist
        if (this.roomMembers.has(roomId)) {
            return false;
        }

        this.roomMembers.set(roomId, new Set([username]))
        return true;
    }

    joinRoom(roomId, username) {
        // room not exist
        if (!this.roomMembers.has(roomId)) {
            return false;
        }
        // username exist
        if (this.roomMembers[roomId].has(username)) {
            return false;
        }

        this.roomMembers[roomId].add(username);
        return true;
    }

    leaveRoom(roomId, username) {
        // member not in room
        if (!this.roomMembers[roomId].has(username)) {
            return false;
        }

        this.roomMembers[roomId].delete(username)

        // all members left -> remove room
        if (!this.roomMembers[roomId].size) {
            this.roomMembers.delete(roomId);
        }
        return true;
    }

    createCall(roomId, username) {
        // username not in room
        if (!this.roomMembers[roomId].has(username)) {
            return false;
        }
        // already calling
        if (this.callMembers[roomId].size) {
            return false;
        }
        this.callMembers.set(roomId, new Set([username]));
    }

    joinCall(roomId, username) {
        // call not exist
        if (!this.callMembers[roomId].size) {
            return false;
        }
    }
}

module.exports = new RoomManager();