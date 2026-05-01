export const rtcConfig = {
  iceServers: [
    {
      urls: "stun:rtc.ktranowl.id.vn:3478",
    },
    {
      urls: ["turn:rtc.ktranowl.id.vn:3478", "turns:rtc.ktranowl.id.vn:5349"],
      username: "testuser",
      credential: "testpassword",
    },
  ],
};
