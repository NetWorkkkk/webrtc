const DEFAULT_ICE_SERVERS = [
  {
    urls: "stun:rtc.ktranowl.id.vn:3478",
  },
  {
    urls: ["turn:rtc.ktranowl.id.vn:3478", "turns:rtc.ktranowl.id.vn:5349"],
    username: "testuser",
    credential: "testpassword",
  },
];

function getIceServersFromEnv() {
  const raw = import.meta.env.VITE_ICE_SERVERS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Ignore invalid JSON and fallback to defaults
  }
  return null;
}

export const rtcConfig = {
  iceServers: getIceServersFromEnv() || DEFAULT_ICE_SERVERS,
};
