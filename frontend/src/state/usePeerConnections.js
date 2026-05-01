import { useCallback, useEffect, useRef, useState } from "react";
import { rtcConfig } from "../config/rtcConfig";

export function usePeerConnections({ profileRef, sendMessage }) {
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

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
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const [, pc] of peersRef.current.entries()) {
      pc.close();
    }
    peersRef.current.clear();
    setRemoteStreams({});
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    (peerName) => {
      if (peersRef.current.has(peerName)) {
        return peersRef.current.get(peerName);
      }

      const pc = new RTCPeerConnection(rtcConfig);
      const remoteStream = new MediaStream();

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        setRemoteStreams((prev) => ({ ...prev, [peerName]: remoteStream }));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const { roomId, username } = profileRef.current;
        sendMessage({
          type: "candidate",
          roomId,
          sender: username,
          target: peerName,
          candidate: event.candidate,
        });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          closePeer(peerName);
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
