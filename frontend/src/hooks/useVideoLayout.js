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

/** Returns [cols, rows] for the auto grid given n participants. */
export function autoGridDims(n) {
  if (n <= 1) return [1, 1];
  if (n <= 2) return [2, 1];
  if (n <= 4) return [2, 2];
  if (n <= 6) return [3, 2];
  if (n <= 9) return [3, 3];
  if (n <= 12) return [4, 3];
  if (n <= 16) return [4, 4];
  const cols = Math.ceil(Math.sqrt(n));
  return [cols, Math.ceil(n / cols)];
}
