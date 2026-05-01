import { Navigate, useNavigate } from "react-router-dom";
import { useAppState } from "../state/appContext";
import { Notice } from "../components/Notice";
import { MemberList } from "../components/MemberList";

export function RoomPage() {
  const navigate = useNavigate();
  const { notice, profile, roomMembers, callMembers, inCall, callLive, startCall, joinCall, leaveRoom } =
    useAppState();

  if (!profile.joined) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page room-page">
      <div className="room-card">
        <aside>
          <h2>Room: {profile.roomId}</h2>
          <p>Welcome, {profile.username}</p>
          <MemberList members={roomMembers} callMembers={callMembers} me={profile.username} />
          <button className="danger" onClick={leaveRoom}>
            Leave Room
          </button>
        </aside>
        <main>
          <Notice notice={notice} />
          <div className="room-info">
            <h3>Room Screen</h3>
            <p>The room and call screens are separate. Call opens as full-screen.</p>
          </div>
          <div className="room-actions">
            {!callLive && !inCall && <button onClick={startCall}>Start Group Call</button>}
            {callLive && !inCall && <button onClick={joinCall}>Join Group Call</button>}
            {inCall && (
              <button className="secondary" onClick={() => navigate("/call")}>
                Back To Call Screen
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
