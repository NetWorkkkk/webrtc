const DEFAULT_WS_URL = "wss://rtc.ktranowl.id.vn/ws";

export function getWsUrl() {
  return import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;
}