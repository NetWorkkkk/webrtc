import { useCallback, useState } from "react";

function readStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export const LAYOUTS = [
  { id: "auto",    label: "Auto" },
  { id: "sidebar", label: "Sidebar" },
];

export const MAX_TILES_OPTIONS = [4, 6, 9, 16, 25, 49];
export const MAX_PINS = 6;

export function useVideoLayout() {
  const [layout,   setLayoutState]   = useState(() => readStorage("vl-layout",   "auto"));
  const [maxTiles, setMaxTilesState] = useState(() => readStorage("vl-maxTiles", 9));
  const [pinnedPeers, setPinnedPeers] = useState([]); // ordered array, max MAX_PINS

  const setLayout = useCallback((val) => {
    setLayoutState(val);
    writeStorage("vl-layout", val);
  }, []);

  const setMaxTiles = useCallback((val) => {
    setMaxTilesState(val);
    writeStorage("vl-maxTiles", val);
  }, []);

  const togglePin = useCallback((name) => {
    setPinnedPeers((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= MAX_PINS) return prev; // at limit, ignore
      return [...prev, name];
    });
  }, []);

  // true if this peer can be (un)pinned: either already pinned, or under limit
  const canPin = useCallback((name) => (
    pinnedPeers.includes(name) || pinnedPeers.length < MAX_PINS
  ), [pinnedPeers]);

  return { layout, setLayout, maxTiles, setMaxTiles, pinnedPeers, togglePin, canPin };
}

/**
 * Build participant lists for AUTO mode.
 * Pinned peers appear first; max tiles limit applies.
 */
export function buildAutoParticipants({ myName, localStream, callMembers, remoteStreams, peerStatuses, maxTiles, pinnedPeers }) {
  const local = { name: myName, stream: localStream, isLocal: true, peerStatus: null };

  const remotes = callMembers
    .filter((n) => n !== myName)
    .map((name) => ({
      name,
      stream: remoteStreams[name] ?? null,
      isLocal: false,
      peerStatus: peerStatuses[name] ?? null,
    }));

  const pinnedSet = new Set(pinnedPeers);
  const sorted = [
    ...remotes.filter((p) => pinnedSet.has(p.name)).sort((a, b) => pinnedPeers.indexOf(a.name) - pinnedPeers.indexOf(b.name)),
    ...remotes.filter((p) => !pinnedSet.has(p.name)),
  ];

  const all = [local, ...sorted];
  return { visible: all.slice(0, maxTiles), hidden: all.slice(maxTiles) };
}

/**
 * Build participant lists for SIDEBAR mode.
 * Main area = all pinned peers (ordered); if none pinned, first remote (or local).
 * Strip = everyone else. No max tiles limit.
 */
export function buildSidebarParticipants({ myName, localStream, callMembers, remoteStreams, peerStatuses, pinnedPeers }) {
  const local = { name: myName, stream: localStream, isLocal: true, peerStatus: null };

  const remotes = callMembers
    .filter((n) => n !== myName)
    .map((name) => ({
      name,
      stream: remoteStreams[name] ?? null,
      isLocal: false,
      peerStatus: peerStatuses[name] ?? null,
    }));

  const pinnedSet = new Set(pinnedPeers);
  const pinned = remotes
    .filter((p) => pinnedSet.has(p.name))
    .sort((a, b) => pinnedPeers.indexOf(a.name) - pinnedPeers.indexOf(b.name));

  const mainParticipants = pinned.length > 0
    ? pinned
    : (remotes.length > 0 ? [remotes[0]] : [local]);

  const mainNames = new Set(mainParticipants.map((p) => p.name));
  const strip = [local, ...remotes].filter((p) => !mainNames.has(p.name));

  return { mainParticipants, strip };
}

/**
 * Acceptable display aspect-ratio range for a tile.
 * Tiles whose cell falls outside this range show slight black bars instead of extreme cropping.
 *   MIN_TILE_RATIO = 4:3  (most portrait allowed)
 *   MAX_TILE_RATIO = 16:9 (most landscape allowed)
 */
export const MIN_TILE_RATIO = 4 / 3;
export const MAX_TILE_RATIO = 16 / 9;

/**
 * Clamp a cell's raw aspect ratio to the acceptable display range.
 * Used only for CSS rendering — not for grid-selection scoring.
 */
export function clampTileRatio(cellRatio) {
  return Math.min(MAX_TILE_RATIO, Math.max(MIN_TILE_RATIO, cellRatio));
}

/**
 * Returns [cols, rows] that maximises tile area for n participants
 * inside a container with the given aspect ratio (width / height).
 *
 * Grid selection uses the native TILE_RATIO so that the algorithm always
 * picks the layout that fills the container best (e.g. 2 side-by-side on a
 * wide screen), independent of the display clamping applied later in CSS.
 */
const TILE_RATIO = 16 / 10; // native camera/video aspect ratio used for scoring

export function autoGridDims(n, containerRatio = 16 / 9) {
  if (n <= 0) return [1, 1];

  let bestCols = 1;
  let bestArea = 0;

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);

    const cellW = 1 / cols;
    const cellH = 1 / containerRatio / rows;

    // Fit a TILE_RATIO tile into the cell (unclamped, for scoring only)
    let tileW, tileH;
    if (cellW / cellH > TILE_RATIO) {
      tileH = cellH;
      tileW = cellH * TILE_RATIO;
    } else {
      tileW = cellW;
      tileH = cellW / TILE_RATIO;
    }

    const area = tileW * tileH;
    if (area > bestArea) {
      bestArea = area;
      bestCols = cols;
    }
  }

  return [bestCols, Math.ceil(n / bestCols)];
}
