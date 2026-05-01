import { useState } from "react";
import { useAppState } from "../state/appContext";
import { Notice } from "../components/Notice";

export function AuthPage() {
  const { wsState, notice, joinRoom, createRoom } = useAppState();

  const [tab, setTab] = useState("join");
  const [joinName, setJoinName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRoomId, setCreateRoomId] = useState("");

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="title">
          <h1>WebRTC Room Call</h1>
          <p>
            WS: <strong>{wsState}</strong>
          </p>
        </div>

        <div className="tabs">
          <button className={tab === "join" ? "active" : ""} onClick={() => setTab("join")}>
            Join Room
          </button>
          <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>
            Create Room
          </button>
        </div>

        <div className="panel">
          <Notice notice={notice} />
          {tab === "join" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                joinRoom(joinName, joinRoomId);
              }}
            >
              <label htmlFor="joinName">Your name</label>
              <input
                id="joinName"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                required
              />

              <label htmlFor="joinRoom">Room ID</label>
              <input
                id="joinRoom"
                value={joinRoomId}
                onChange={(event) => setJoinRoomId(event.target.value)}
                required
              />

              <button type="submit">Join Room</button>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createRoom(createName, createRoomId);
              }}
            >
              <label htmlFor="createName">Your name</label>
              <input
                id="createName"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />

              <label htmlFor="createRoom">Custom Room ID</label>
              <input
                id="createRoom"
                value={createRoomId}
                onChange={(event) => setCreateRoomId(event.target.value)}
                required
              />

              <button type="submit">Create Room</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
