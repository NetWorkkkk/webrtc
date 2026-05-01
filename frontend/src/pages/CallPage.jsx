import { Navigate } from "react-router-dom";
import { useAppState } from "../state/appContext";
import { VideoGrid } from "../components/VideoGrid";

export function CallPage() {
  const { profile, inCall, leaveCall, callMembers, localStream, remoteStreams } = useAppState();

  if (!profile.joined) {
    return <Navigate to="/" replace />;
  }

  if (!inCall) {
    return <Navigate to="/room" replace />;
  }

  return (
    <div className="call-fullscreen">
      <header className="call-header">
        <div>
          <h1>Call - {profile.roomId}</h1>
          <p>
            Members currently in call: <strong>{callMembers.length}</strong>
          </p>
        </div>
        <button className="danger" onClick={leaveCall}>
          Leave Call
        </button>
      </header>

      <VideoGrid localStream={localStream} remoteStreams={remoteStreams} myName={profile.username} />
    </div>
  );
}
