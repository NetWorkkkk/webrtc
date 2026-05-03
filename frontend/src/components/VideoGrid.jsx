import { useEffect, useRef } from "react";

const OVERLAY_LABEL = {
  new: "Waiting...",
  connecting: "Connecting...",
  disconnected: "Reconnecting...",
  failed: "Connection lost",
  closed: "Connection closed",
};

const BADGE_SPINNER_STATES = new Set(["new", "connecting", "disconnected"]);

function VideoTile({ label, stream, muted, peerStatus }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  const { connectionState, iceConnectionState, connectionType } = peerStatus || {};
  const showOverlay = connectionState && connectionState !== "connected";

  return (
    <article className="video-tile">
      <header className="video-tile-header">
        <span>{label}</span>
        {connectionState && (
          <span className={`conn-badge conn-badge--${connectionState}`}>
            {connectionState === "connected" && connectionType ? connectionType : connectionState}
          </span>
        )}
      </header>
      <div className="ice-state">
        {iceConnectionState && connectionState !== "connected" ? `ICE: ${iceConnectionState}` : ""}
      </div>
      <div className="video-tile-body">
        <video ref={videoRef} autoPlay playsInline muted={muted} />
        {showOverlay && (
          <div className={`video-tile-overlay ${connectionState}`}>
            {BADGE_SPINNER_STATES.has(connectionState) && <span className="overlay-spinner" />}
            <span>{OVERLAY_LABEL[connectionState] ?? connectionState}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function VideoGrid({ localStream, remoteStreams, peerStatuses = {}, myName }) {
  const remoteEntries = Object.entries(remoteStreams);

  return (
    <section className="video-grid">
      <VideoTile label={`${myName || "You"} (local)`} stream={localStream} muted />
      {remoteEntries.map(([name, stream]) => (
        <VideoTile key={name} label={name} stream={stream} muted={false} peerStatus={peerStatuses[name]} />
      ))}
      {remoteEntries.length === 0 && (
        <div className="empty-video">No remote stream yet. Ask another member to join the call.</div>
      )}
    </section>
  );
}
