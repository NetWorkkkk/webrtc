import { useEffect, useRef } from "react";

const OVERLAY_LABEL = {
  new:          "Waiting...",
  connecting:   "Connecting...",
  disconnected: "Reconnecting...",
  failed:       "Connection lost",
  closed:       "Connection closed",
};

const SPINNER_STATES = new Set(["new", "connecting", "disconnected"]);

function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 32%)`;
}

/**
 * @param {{ name, stream, isLocal, peerStatus }} participant
 * @param {boolean} muted
 * @param {(name: string) => void} [onPin]
 * @param {boolean} isPinned
 * @param {"normal"|"large"|"small"} size
 */
export function VideoTile({ participant, muted = false, onPin, isPinned = false, pinDisabled = false, size = "normal", clampedRatio }) {
  const { name, stream, isLocal, peerStatus } = participant;
  const videoRef = useRef(null);
  // Large tiles: fill the cell by height; width is determined by clamped aspect ratio.
  // The tile body uses overflow:hidden to clip any excess width.
  const mediaStyle = size === "large" && clampedRatio
    ? { height: "100%", width: "auto", aspectRatio: clampedRatio }
    : {};

  const { connectionState, iceConnectionState, connectionType } = peerStatus || {};
  const showOverlay = connectionState && connectionState !== "connected";

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <article className={`video-tile video-tile--${size}`}>
      <header className="video-tile-header">
        <span className="tile-label">{isLocal ? `${name} (you)` : name}</span>
        <div className="tile-header-right">
          {connectionState && (
            <span className={`conn-badge conn-badge--${connectionState}`}>
              {connectionState === "connected" && connectionType ? connectionType : connectionState}
            </span>
          )}
          {onPin && (
            <button
              className={`pin-btn${isPinned ? " pin-btn--active" : ""}${pinDisabled ? " pin-btn--disabled" : ""}`}
              onClick={() => !pinDisabled && onPin(name)}
              title={isPinned ? "Unpin" : pinDisabled ? "Max pins reached" : "Pin to main view"}
            >
              📌
            </button>
          )}
        </div>
      </header>

      <div className="ice-state">
        {iceConnectionState && connectionState !== "connected" ? `ICE: ${iceConnectionState}` : ""}
      </div>

      <div className="video-tile-body">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted={muted} style={mediaStyle} />
        ) : (
          <div className="tile-avatar" style={{ ...mediaStyle, background: nameToColor(name) }}>
            <span>{name.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {showOverlay && (
          <div className={`video-tile-overlay ${connectionState}`}>
            {SPINNER_STATES.has(connectionState) && <span className="overlay-spinner" />}
            <span>{OVERLAY_LABEL[connectionState] ?? connectionState}</span>
          </div>
        )}
      </div>
    </article>
  );
}
