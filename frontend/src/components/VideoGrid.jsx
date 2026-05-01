import { useEffect, useRef } from "react";

function VideoTile({ label, stream, muted }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <article className="video-tile">
      <header>{label}</header>
      <video ref={videoRef} autoPlay playsInline muted={muted} />
    </article>
  );
}

export function VideoGrid({ localStream, remoteStreams, myName }) {
  const remoteEntries = Object.entries(remoteStreams);

  return (
    <section className="video-grid">
      <VideoTile label={`${myName || "You"} (local)`} stream={localStream} muted />
      {remoteEntries.map(([name, stream]) => (
        <VideoTile key={name} label={name} stream={stream} muted={false} />
      ))}
      {remoteEntries.length === 0 && (
        <div className="empty-video">No remote stream yet. Ask another member to join the call.</div>
      )}
    </section>
  );
}
