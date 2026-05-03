import { useState } from "react";
import { useAppState } from "../state/appContext";
import { Notice } from "../components/Notice";

export function AuthPage() {
  const { wsState, notice, joinRoom, createRoom } = useAppState();

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="title">
          <h1>WebRTC Room Call</h1>
          <p>
            WS: <strong>{wsState}</strong>
          </p>
        </div>

        <div className="panel">
          <Notice notice={notice} />
          <form>
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="roomId">Room ID</label>
            <input
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            />

            <div className="auth-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => joinRoom(name, roomId)}
              >
                Join Room
              </button>
              <button
                type="button"
                onClick={() => createRoom(name, roomId)}
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
