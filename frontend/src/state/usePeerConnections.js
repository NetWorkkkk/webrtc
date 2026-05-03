import { useCallback, useEffect, useRef, useState } from "react";
import { rtcConfig } from "../config/rtcConfig";

export function usePeerConnections({ profileRef, sendMessage }) {
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const callStartTimesRef = useRef({});
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerStatuses, setPeerStatuses] = useState({});
  // peerStatuses[name] = { connectionState, iceConnectionState, connectionType }

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const stopLocalMedia = useCallback(() => {
    setLocalStream((prev) => {
      if (!prev) return null;
      prev.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const closePeer = useCallback((peerName) => {
    const startTime = callStartTimesRef.current[peerName];
    if (startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Call ■] ${peerName} | ended @ ${new Date().toLocaleTimeString()} | duration: ${duration}s`);
      delete callStartTimesRef.current[peerName];
    }
    const pc = peersRef.current.get(peerName);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerName);
    }
    setRemoteStreams((prev) => {
      if (!prev[peerName]) return prev;
      const next = { ...prev };
      delete next[peerName];
      return next;
    });
    setPeerStatuses((prev) => {
      if (!prev[peerName]) return prev;
      const next = { ...prev };
      delete next[peerName];
      return next;
    });
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const [, pc] of peersRef.current.entries()) {
      pc.close();
    }
    peersRef.current.clear();
    setRemoteStreams({});
    setPeerStatuses({});
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // Update the ref immediately so callers that run in the same async turn
    // (e.g. initiateOfferToPeer right after joinCall) see the stream before
    // the useEffect syncing localStream state has had a chance to run.
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  function classifyConnection(localType, remoteType) {
    if (localType === "relay" || remoteType === "relay") return "TURN (relay)";
    if (localType === "srflx" || remoteType === "srflx") return "P2P (srflx)";
    return "P2P (host)";
  }

  async function detectConnectionType(pc) {
    // Brief delay so selected pair appears in stats on all browsers.
    await new Promise((r) => setTimeout(r, 200));
    const stats = await pc.getStats();

    // 1) Preferred path: selected candidate-pair via transport.selectedCandidatePairId
    for (const report of stats.values()) {
      if (report.type !== "transport" || !report.selectedCandidatePairId) continue;
      const pair = stats.get(report.selectedCandidatePairId);
      if (!pair) continue;
      const local = stats.get(pair.localCandidateId);
      const remote = stats.get(pair.remoteCandidateId);
      if (!local || !remote) continue;
      const localType = local.candidateType;   // host | srflx | relay
      const remoteType = remote.candidateType;
      return { type: classifyConnection(localType, remoteType), localType, remoteType };
    }

    // 2) Fallback path: nominated+succeeded pair (older browser stats behavior)
    for (const report of stats.values()) {
      if (report.type !== "candidate-pair") continue;
      if (!report.nominated || report.state !== "succeeded") continue;
      const local = stats.get(report.localCandidateId);
      const remote = stats.get(report.remoteCandidateId);
      if (!local || !remote) continue;
      const localType = local.candidateType;
      const remoteType = remote.candidateType;
      return { type: classifyConnection(localType, remoteType), localType, remoteType };
    }

    return null;
  }

  const createPeerConnection = useCallback(
    (peerName) => {
      if (peersRef.current.has(peerName)) {
        return peersRef.current.get(peerName);
      }

      const pc = new RTCPeerConnection(rtcConfig);
      const remoteStream = new MediaStream();

      setPeerStatuses((prev) => ({
        ...prev,
        [peerName]: { connectionState: "new", iceConnectionState: "new", connectionType: null },
      }));

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        setRemoteStreams((prev) => ({ ...prev, [peerName]: remoteStream }));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const { roomId, username } = profileRef.current;
        sendMessage({ type: "candidate", roomId, sender: username, target: peerName, candidate: event.candidate });
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log(`[ICE ] ${peerName} | ${iceState}`);
        setPeerStatuses((prev) => ({
          ...prev,
          [peerName]: { ...(prev[peerName] || {}), iceConnectionState: iceState },
        }));
      };

      pc.onconnectionstatechange = async () => {
        const state = pc.connectionState;
        const ts = new Date().toLocaleTimeString();

        if (state === "connected") {
          const info = await detectConnectionType(pc);
          callStartTimesRef.current[peerName] = Date.now();
          console.log(`[Call ▶] ${peerName} | connected @ ${ts} | ${info?.type ?? "unknown"} | local: ${info?.localType} remote: ${info?.remoteType}`);
          setPeerStatuses((prev) => ({
            ...prev,
            [peerName]: { ...(prev[peerName] || {}), connectionState: state, connectionType: info?.type ?? null },
          }));
        } else {
          console.log(`[Conn ] ${peerName} | ${state} @ ${ts}`);
          setPeerStatuses((prev) => ({
            ...prev,
            [peerName]: { ...(prev[peerName] || {}), connectionState: state },
          }));
          if (["disconnected", "failed"].includes(state)) {
            const { roomId } = profileRef.current;
            sendMessage({ type: "checkPeer", roomId, peerName });
          }
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
      }

      peersRef.current.set(peerName, pc);
      return pc;
    },
    [closePeer, profileRef, sendMessage]
  );

  const initiateOfferToPeer = useCallback(
    async (peerName) => {
      const { roomId, username } = profileRef.current;
      if (!peerName || peerName === username) return;

      await ensureLocalMedia();
      const pc = createPeerConnection(peerName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendMessage({
        type: "offer",
        roomId,
        sender: username,
        target: peerName,
        offer: pc.localDescription,
      });
    },
    [createPeerConnection, ensureLocalMedia, profileRef, sendMessage]
  );

  const handleOfferSdp = useCallback(
    async (data) => {
      const { roomId, username } = profileRef.current;
      await ensureLocalMedia();
      const pc = createPeerConnection(data.sender);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendMessage({
        type: "answer",
        roomId,
        sender: username,
        target: data.sender,
        answer: pc.localDescription,
      });
    },
    [createPeerConnection, ensureLocalMedia, profileRef, sendMessage]
  );

  const handleAnswer = useCallback(async (data) => {
    if (!data.sender || !data.answer) return;
    const pc = peersRef.current.get(data.sender);
    if (!pc) return;
    // Ignore stale/duplicate answers that can arrive after negotiation is already stable.
    if (pc.signalingState !== "have-local-offer") {
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  }, []);

  const handleCandidate = useCallback(async (data) => {
    if (!data.sender || !data.candidate) return;
    const pc = peersRef.current.get(data.sender);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error("ICE candidate error", error);
    }
  }, []);

  useEffect(
    () => () => {
      closeAllPeers();
      stopLocalMedia();
    },
    [closeAllPeers, stopLocalMedia]
  );

  return {
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
  };
}
