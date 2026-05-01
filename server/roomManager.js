const { memo } = require("react");

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

        const members = this.roomMembers.get(roomId);
        // username exist
        if (members.has(username)) {
            return false;
        }

        members.add(username);
        return true;
    }

    leaveRoom(roomId, username) {
        // room not exist
        if (!this.roomMembers.has(roomId)) {
            return false;
        }

        const members = this.roomMembers.get(roomId);
        // member not in room
        if (!members.has(username)) {
            return false;
        }

        // try leavel call
        this.leaveCall(roomId, username);

        members.delete(username)

        // all members left -> remove room
        if (members.size === 0) {
            this.roomMembers.delete(roomId);
        }
        return true;
    }

    createCall(roomId, username) {
        // room not exist
        // username not in room
        if (!this.roomMembers.has(roomId) ||
            !this.roomMembers.get(roomId).has(username)) {
            return false;
        }

        // call exist
        if (this.callMembers.has(roomId)) {
            return false;
        }

        this.callMembers.set(roomId, new Set([username]));
        return true;
    }

    joinCall(roomId, username) {
        // room not exist
        // member not in room
        // call not exist
        if (!this.roomMembers.has(roomId) ||
            !this.roomMembers.get(roomId).has(username) ||
            !this.callMembers.has(roomId)) {
            return false;
        }

        const members = this.callMembers.get(roomId);
        // member in call
        if (members.has(username)) {
            return false;
        }

        members.add(username);
        return true;
    }

    leaveCall(roomId, username) {
        // call not exist
        if (!this.callMembers.has(roomId)) {
            return false;
        }

        const members = this.callMembers.get(roomId);
        // member not in call
        if (!members.has(username)) {
            return false;
        }

        members.delete(username);

        // all members left -> remove call
        if (members.size == 0) {
            this.callMembers.delete(roomId);
        }
        return true;
    }
}

module.exports = RoomManager;