import { useEffect, useRef } from "react";

const STATUS_LABEL = {
  disconnected: "Reconnecting...",
  failed: "Connection lost",
  closed: "Connection closed",
};

function VideoTile({ label, stream, muted, status }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <article className="video-tile">
      <header>{label}</header>
      <div className="video-tile-body">
        <video ref={videoRef} autoPlay playsInline muted={muted} />
        {status && (
          <div className={`video-tile-overlay ${status}`}>
            {status === "disconnected" && <span className="overlay-spinner" />}
            <span>{STATUS_LABEL[status]}</span>
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
        <VideoTile key={name} label={name} stream={stream} muted={false} status={peerStatuses[name]} />
      ))}
      {remoteEntries.length === 0 && (
        <div className="empty-video">No remote stream yet. Ask another member to join the call.</div>
      )}
    </section>
  );
}
