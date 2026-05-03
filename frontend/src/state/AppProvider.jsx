import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWsUrl } from "../config/network";
import { AppContext } from "./appContext";
import { usePeerConnections } from "./usePeerConnections";

function normalizeRoomId(roomId) {
  return roomId.trim().toUpperCase();
}

export function AppProvider({ children }) {
  const navigate = useNavigate();

  const [wsState, setWsState] = useState("connecting");
  const [notice, setNotice] = useState(null);
  const [profile, setProfile] = useState({ username: "", roomId: "", joined: false });
  const [roomMembers, setRoomMembers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [pendingCallJoin, setPendingCallJoin] = useState(false);

  const wsRef = useRef(null);
  const profileRef = useRef(profile);
  const inCallRef = useRef(inCall);
  const callMembersRef = useRef(callMembers);
  const pendingCallJoinRef = useRef(pendingCallJoin);
  const lastRingAtRef = useRef(0);
  const runtimeRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  useEffect(() => {
    callMembersRef.current = callMembers;
  }, [callMembers]);

  useEffect(() => {
    pendingCallJoinRef.current = pendingCallJoin;
  }, [pendingCallJoin]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const sendMessage = useCallback((payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setNotice({ type: "error", text: "WebSocket is not ready yet." });
      return false;
    }
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const {
    localStream,
    remoteStreams,
    peerStatuses,
    closePeer,
    closeAllPeers,
    stopLocalMedia,
    ensureLocalMedia,
    initiateOfferToPeer,
    handleOfferSdp,
    handleAnswer,
    handleCandidate,
  } = usePeerConnections({ profileRef, sendMessage });

  const leaveCallLocal = useCallback(() => {
    setInCall(false);
    setPendingCallJoin(false);
    setCallMembers((prev) => prev.filter((name) => name !== profileRef.current.username));
    closeAllPeers();
    stopLocalMedia();
  }, [closeAllPeers, stopLocalMedia]);

  const ringIncomingCallNotification = useCallback((callerName) => {
    setNotice({
      type: "success",
      text: `${callerName} started a call. Join when you're ready.`,
    });

    const now = Date.now();
    if (now - lastRingAtRef.current < 5000) return;
    lastRingAtRef.current = now;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const baseTime = audioContext.currentTime;
      const playBeep = (startOffset) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, baseTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.2, baseTime + startOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + startOffset + 0.22);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(baseTime + startOffset);
        oscillator.stop(baseTime + startOffset + 0.24);
      };

      playBeep(0);
      playBeep(0.32);
      playBeep(0.64);

      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 1500);
    } catch {
      // Ignore browser audio autoplay limitations.
    }
  }, []);

  useEffect(() => {
    runtimeRef.current = {
      closePeer,
      ensureLocalMedia,
      handleAnswer,
      handleCandidate,
      handleOfferSdp,
      initiateOfferToPeer,
      leaveCallLocal,
      navigate,
      sendMessage,
    };
  }, [
    closePeer,
    ensureLocalMedia,
    handleAnswer,
    handleCandidate,
    handleOfferSdp,
    initiateOfferToPeer,
    leaveCallLocal,
    navigate,
    sendMessage,
  ]);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState("open");
      setNotice({ type: "success", text: "WebSocket connected." });
    };

    ws.onerror = () => {
      setWsState("error");
      setNotice({ type: "error", text: "WebSocket error." });
    };

    ws.onclose = () => {
      setWsState("closed");
      setNotice({ type: "error", text: "WebSocket disconnected." });
      runtimeRef.current?.leaveCallLocal();
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "roomMembers":
          setProfile((prev) => ({
            username: prev.username,
            roomId: data.roomId,
            joined: true,
          }));
          setRoomMembers(Array.isArray(data.members) ? data.members : []);
          setNotice({ type: "success", text: `Joined room ${data.roomId}.` });
          runtimeRef.current?.navigate("/room");
          break;
        case "memberJoinRoom":
          if (data.username) {
            setRoomMembers((prev) => (prev.includes(data.username) ? prev : [...prev, data.username]));
          }
          break;
        case "memberLeaveRoom":
          if (data.username) {
            setRoomMembers((prev) => prev.filter((name) => name !== data.username));
            setCallMembers((prev) => prev.filter((name) => name !== data.username));
            runtimeRef.current?.closePeer(data.username);
          }
          break;

        case "callMembers":
          setCallMembers(data.members);
          if (pendingCallJoinRef.current) {
            const peers = data.members.filter((name) => name !== profileRef.current.username);
            for (const peerName of peers) {
              await runtimeRef.current?.initiateOfferToPeer(peerName); // offer to each peer
            }
            setPendingCallJoin(false);
          }
          break;
        case "memberJoinCall":
          const firstCallMember = callMembersRef.current.length === 0;
          setCallMembers((prev) => (prev.includes(data.username) ? prev : [...prev, data.username]));
          if (data.username === profileRef.current.username) {
            return;
          }
          // out of call and not the first call member, ring the notification
          if (!inCallRef.current && firstCallMember) {
            ringIncomingCallNotification(data.username);
          }
          break;
        case "memberLeaveCall":
          setCallMembers((prev) => prev.filter((name) => name !== data.username));
          runtimeRef.current?.closePeer(data.username);
          break;
          
        case "offer":
          if (!data.sender || data.sender === profileRef.current.username) break;
          await runtimeRef.current?.handleOfferSdp(data);
          break;
        case "answer":
          await runtimeRef.current?.handleAnswer(data);
          break;
        case "candidate":
          await runtimeRef.current?.handleCandidate(data);
          break;
        case "error":
          setNotice({ type: "error", text: data.message || "Unknown error." });
          if ((data.message || "").includes("call not exist")) {
            runtimeRef.current?.leaveCallLocal();
            runtimeRef.current?.navigate("/room");
          }
          break;
        default:
          break;
      }
    };

    return () => ws.close();
  }, []);

  const joinRoom = useCallback(
    (usernameInput, roomInput) => {
      const username = usernameInput.trim();
      const roomId = normalizeRoomId(roomInput);
      if (!username || !roomId) return;

      setProfile({ username, roomId, joined: false });
      clearNotice();
      sendMessage({ type: "joinRoom", username, roomId });
    },
    [clearNotice, sendMessage]
  );

  const createRoom = useCallback(
    (usernameInput, roomInput) => {
      const username = usernameInput.trim();
      const roomId = normalizeRoomId(roomInput);
      if (!username || !roomId) return;

      setProfile({ username, roomId, joined: false });
      clearNotice();
      sendMessage({ type: "createRoom", username, roomId });
    },
    [clearNotice, sendMessage]
  );

  const startCall = useCallback(async () => {
    const { roomId, username } = profileRef.current;
    try {
      await ensureLocalMedia();
      setInCall(true);
      setPendingCallJoin(false);
      setCallMembers((prev) => (prev.includes(username) ? prev : [...prev, username]));

      sendMessage({ type: "startCall", roomId, username });
      navigate("/call");
    } catch {
      setNotice({ type: "error", text: "Please allow access to camera/microphone." });
    }
  }, [ensureLocalMedia, navigate, sendMessage]);

  const joinCall = useCallback(async () => {
    const { roomId, username } = profileRef.current;
    try {
      await ensureLocalMedia();
      setInCall(true);
      setPendingCallJoin(true);
      setCallMembers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      sendMessage({ type: "joinCall", roomId, username });
      navigate("/call");
    } catch {
      setNotice({ type: "error", text: "Please allow access to camera/microphone." });
    }
  }, [ensureLocalMedia, navigate, sendMessage]);

  const leaveCall = useCallback(() => {
    const { roomId, username } = profileRef.current;
    sendMessage({ type: "leaveCall", roomId, username });
    leaveCallLocal();
    navigate("/room");
  }, [leaveCallLocal, navigate, sendMessage]);

  const leaveRoom = useCallback(() => {
    const { roomId, username } = profileRef.current;
    sendMessage({ type: "leaveRoom", roomId, username });
    leaveCallLocal();
    setProfile({ username: "", roomId: "", joined: false });
    setRoomMembers([]);
    setCallMembers([]);
    navigate("/");
  }, [leaveCallLocal, navigate, sendMessage]);

  const callLive = callMembers.length > 0;

  const value = useMemo(
    () => ({
      wsState,
      notice,
      profile,
      roomMembers,
      callMembers,
      inCall,
      callLive,
      localStream,
      remoteStreams,
      peerStatuses,
      joinRoom,
      createRoom,
      startCall,
      joinCall,
      leaveCall,
      leaveRoom,
      clearNotice,
    }),
    [
      wsState,
      notice,
      profile,
      roomMembers,
      callMembers,
      inCall,
      callLive,
      localStream,
      remoteStreams,
      peerStatuses,
      joinRoom,
      createRoom,
      startCall,
      joinCall,
      leaveCall,
      leaveRoom,
      clearNotice,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
