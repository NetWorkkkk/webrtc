export function getWsUrl() {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${wsProtocol}://${window.location.host}/ws`;
}

// export function getWsUrl() {
//   return 'ws://localhost:3000/ws';
// }