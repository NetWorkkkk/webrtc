class RoomManager {
    constructor() {
        this.roomMembers = new Map(); // roomId -> Set<username>
        this.callMembers = new Map(); // roomId -> Set<username>
    }

    getRoomMembers(roomId) {
        const members = this.roomMembers.get(roomId);
        return members ? Array.from(members) : [];
    }

    getCallMembers(roomId) {
        const members = this.callMembers.get(roomId);
        return members ? Array.from(members) : [];
    }

    createRoom(roomId, username) {
        if (this.roomMembers.has(roomId)) {
            return { success: false, error: 'room exist' };
        }

        this.roomMembers.set(roomId, new Set([username]))
        return { success: true };
    }

    joinRoom(roomId, username) {
        if (!this.roomMembers.has(roomId)) {
            return { success: false, error: 'room not exist' };
        }

        const members = this.roomMembers.get(roomId);
        if (members.has(username)) {
            return { success: false, error: 'username exist' };
        }

        members.add(username);
        return { success: true };
    }

    leaveRoom(roomId, username) {
        if (!this.roomMembers.has(roomId)) {
            return { success: false, error: 'room not exist' };
        }

        const members = this.roomMembers.get(roomId);
        if (!members.has(username)) {
            return { success: false, error: 'member not in room' };
        }

        members.delete(username)

        // all members left -> remove room
        if (members.size === 0) {
            this.roomMembers.delete(roomId);
        }
        return { success: true };
    }

    startCall(roomId, username) {
        if (!this.roomMembers.has(roomId)) {
            return { success: false, error: 'room not exist' };
        }
        if (!this.roomMembers.get(roomId).has(username)) {
            return { success: false, error: 'username not in room' }
        }

        if (this.callMembers.has(roomId)) {
            return { success: false, error: 'call exist' };
        }

        this.callMembers.set(roomId, new Set([username]));
        return { success: true };
    }

    joinCall(roomId, username) {
        if (!this.roomMembers.has(roomId)) {
            return { success: false, error: 'room not exist' };
        }
        if (!this.roomMembers.get(roomId).has(username)) {
            return { success: false, error: 'member not in room' };
        }
        if (!this.callMembers.has(roomId)) {
            return { success: false, error: 'call not exist' };
        }

        const members = this.callMembers.get(roomId);
        if (members.has(username)) {
            return { success: false, error: 'member in call' };
        }

        members.add(username);
        return { success: true };
    }

    leaveCall(roomId, username) {
        if (!this.callMembers.has(roomId)) {
            return { success: false, error: 'call not exist' };
        }

        const members = this.callMembers.get(roomId);
        if (!members.has(username)) {
            return { success: false, error: 'member not in call' };
        }

        members.delete(username);

        // all members left -> remove call
        if (members.size === 0) {
            this.callMembers.delete(roomId);
        }
        return { success: true };
    }
}

module.exports = RoomManager;
