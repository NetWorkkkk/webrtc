import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppState } from "../state/appContext";
import { VideoGrid } from "../components/VideoGrid";
import { LayoutControls } from "../components/LayoutControls";
import { MembersPanel } from "../components/MembersPanel";
import { useVideoLayout } from "../hooks/useVideoLayout";

export function CallPage() {
  const {
    profile, inCall, leaveCall,
    callMembers, roomMembers,
    localStream, remoteStreams, peerStatuses,
  } = useAppState();

  const { layout, setLayout, maxTiles, setMaxTiles, pinnedPeers, togglePin, canPin } = useVideoLayout();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!profile.joined) return <Navigate to="/" replace />;
  if (!inCall)         return <Navigate to="/room" replace />;

  return (
    <div className="call-fullscreen">
      <div className="call-video-area">
        <VideoGrid
          myName={profile.username}
          localStream={localStream}
          callMembers={callMembers}
          remoteStreams={remoteStreams}
          peerStatuses={peerStatuses}
          layout={layout}
          maxTiles={maxTiles}
          pinnedPeers={pinnedPeers}
          togglePin={togglePin}
          canPin={canPin}
        />

        {panelOpen && (
          <MembersPanel
            myName={profile.username}
            callMembers={callMembers}
            roomMembers={roomMembers}
            pinnedPeers={pinnedPeers}
            togglePin={togglePin}
            canPin={canPin}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>

      <footer className="call-footer">
        <div className="call-footer-left">
          <span className="call-room-name">{profile.roomId}</span>
        </div>

        <div className="call-footer-center">
          <LayoutControls
            layout={layout}
            setLayout={setLayout}
            maxTiles={maxTiles}
            setMaxTiles={setMaxTiles}
          />
          <button className="danger" onClick={leaveCall}>Leave</button>
        </div>

        <div className="call-footer-right">
          <button
            className={`members-btn${panelOpen ? " members-btn--active" : ""}`}
            onClick={() => setPanelOpen((v) => !v)}
            title="People"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span>{callMembers.length}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
