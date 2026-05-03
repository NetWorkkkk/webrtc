import { Navigate, useNavigate } from "react-router-dom";
import { useAppState } from "../state/appContext";
import { Notice } from "../components/Notice";
import { MemberList } from "../components/MemberList";

export function RoomPage() {
  const navigate = useNavigate();
  const { notice, profile, roomMembers, callMembers, inCall, callLive, startCall, joinCall, leaveRoom } =
    useAppState();

  if (!profile.joined) return <Navigate to="/" replace />;

  const callActive = callLive || inCall;

  return (
    <div className="page room-page">
      <div className="room-card">

        <header className="room-header">
          <div className="room-header-identity">
            <span className="room-header-id">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
              {profile.roomId}
            </span>
            <span className="room-header-user">Signed in as <strong>{profile.username}</strong></span>
          </div>
          <button className="danger room-leave-btn" onClick={leaveRoom}>Leave Room</button>
        </header>

        <Notice notice={notice} />

        <section className="room-call-card">
          <div className="room-call-status">
            <span className={`call-live-dot${callActive ? " call-live-dot--active" : ""}`} />
            <span className="room-call-label">
              {inCall
                ? "You are in the call"
                : callLive
                  ? "A call is in progress"
                  : "No active call"}
            </span>
          </div>
          <p className="room-call-hint">
            {inCall
              ? "Return to the call screen to see video."
              : callLive
                ? "Others are already connected. Join to participate."
                : "Start a call to connect with others in this room."}
          </p>
          <div className="room-call-actions">
            {!callLive && !inCall && (
              <button onClick={startCall}>Start Group Call</button>
            )}
            {callLive && !inCall && (
              <button onClick={joinCall}>Join Group Call</button>
            )}
            {inCall && (
              <button className="secondary" onClick={() => navigate("/call")}>
                Return to Call
              </button>
            )}
          </div>
        </section>

        <section className="room-members-section">
          <div className="room-members-title">
            People
            <span className="room-members-count">{roomMembers.length}</span>
          </div>
          <MemberList members={roomMembers} callMembers={callMembers} me={profile.username} />
        </section>

      </div>
    </div>
  );
}
