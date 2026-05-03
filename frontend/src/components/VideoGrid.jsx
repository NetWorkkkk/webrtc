import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildAutoParticipants,
  buildSidebarParticipants,
  autoGridDims,
  clampTileRatio,
} from "../hooks/useVideoLayout";
import { VideoTile } from "./VideoTile";

export function VideoGrid({
  myName,
  localStream,
  callMembers = [],
  remoteStreams = {},
  peerStatuses = {},
  layout,
  maxTiles,
  pinnedPeers,
  togglePin,
  canPin,
}) {
  const wrapperRef = useRef(null);
  const [containerRatio, setContainerRatio] = useState(16 / 9);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setContainerRatio(width / height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handlePin = useCallback((name) => togglePin(name), [togglePin]);

  const tileProps = (p) => ({
    participant: p,
    muted: p.isLocal,
    onPin: handlePin,
    isPinned: pinnedPeers.includes(p.name),
    pinDisabled: !canPin(p.name),
  });

  // ── Sidebar ───────────────────────────────────────────────────────────────
  if (layout === "sidebar") {
    const { mainParticipants, strip } = buildSidebarParticipants({
      myName, localStream, callMembers, remoteStreams, peerStatuses, pinnedPeers,
    });
    // Sidebar main area: measure via containerRatio, but main area is roughly
    // (containerRatio * sidebarFraction) wide — use containerRatio as approximation.
    const [mainCols, mainRows] = autoGridDims(mainParticipants.length, containerRatio);
    const mainCellRatio = containerRatio * mainRows / mainCols;
    const mainTileRatio = clampTileRatio(mainCellRatio);

    return (
      <div className="video-grid-wrapper" ref={wrapperRef}>
        <div className="video-grid video-grid--sidebar">
          <div className="sidebar-main">
            <div
              className="sidebar-main-grid"
              style={{
                gridTemplateColumns: `repeat(${mainCols}, 1fr)`,
                gridTemplateRows:    `repeat(${mainRows}, 1fr)`,
              }}
            >
              {mainParticipants.map((p) => (
                <VideoTile key={p.name} {...tileProps(p)} size="large" clampedRatio={mainTileRatio} />
              ))}
            </div>
          </div>
          <div className="sidebar-strip">
            {strip.map((p) => (
              <VideoTile key={p.name} {...tileProps(p)} size="small" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Auto (default) ────────────────────────────────────────────────────────
  const { visible, hidden } = buildAutoParticipants({
    myName, localStream, callMembers, remoteStreams, peerStatuses, maxTiles, pinnedPeers,
  });
  const [cols, rows] = autoGridDims(visible.length, containerRatio);
  const cellRatio = containerRatio * rows / cols;
  const clampedRatio = clampTileRatio(cellRatio);

  return (
    <div className="video-grid-wrapper" ref={wrapperRef}>
      <div
        className="video-grid video-grid--auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows:    `repeat(${rows}, 1fr)`,
        }}
      >
        {visible.map((p) => (
          <VideoTile key={p.name} {...tileProps(p)} size="large" clampedRatio={clampedRatio} />
        ))}
      </div>
      {hidden.length > 0 && (
        <div className="hidden-count">
          +{hidden.length} more participant{hidden.length > 1 ? "s" : ""} not shown
        </div>
      )}
    </div>
  );
}
