class RoomManager {
    constructor() {
        this.clients = new Map(); // username -> { ws, roomId: nullable }
        this.rooms   = new Map(); // roomId   -> { hostName, members: Set }
    }

    register(username, ws) {
        if (this.clients.has(username)) {
            return false;
        }
        this.clients.set(name, { ws, roomId: null }); // start at lobby
        return true;
    }
}

module.exports = new RoomManager();