import { useCallback, useEffect, useRef, useState } from 'react';

const IDENTITY_KEY = 'athenaeum-multiplayer-identity-v1';

function createIdentity() {
  let identity;
  try {
    identity = JSON.parse(localStorage.getItem(IDENTITY_KEY) || 'null');
  } catch {
    identity = null;
  }
  if (identity?.id && identity?.name) return identity;
  const id = globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `Reader ${Math.floor(100 + Math.random() * 900)}`;
  const nextIdentity = { id, name };
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(nextIdentity));
  } catch {
    // Keep the guest in this page session if browser storage is unavailable.
  }
  return nextIdentity;
}

function appendMessage(setMessages, message) {
  setMessages((previous) => [...previous.slice(-39), message]);
}

export function useMultiplayer() {
  const [identity, setIdentity] = useState(createIdentity);
  const [status, setStatus] = useState('connecting');
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [error, setError] = useState('');
  const latestPoseRef = useRef({ zone: 'library', pose: { x: 0, z: 0, yaw: 0, pitch: 0 } });
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const sendPose = useCallback((zone, pose) => {
    latestPoseRef.current = { zone, pose };
  }, []);

  useEffect(() => {
    let active = true;
    let source = null;
    let retryTimer = 0;
    let lastJoinAt = Date.now();
    let poseInFlight = false;
    let rejoinInFlight = false;
    const id = identity.id;

    async function postJson(path, body, keepalive = false) {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Room request failed (${response.status}).`);
      }
      return response.status === 204 ? null : response.json();
    }

    function applyPlayers(nextPlayers) {
      setPlayers(nextPlayers.filter((player) => player.id !== id));
    }

    function handleSnapshot(event) {
      const data = JSON.parse(event.data);
      applyPlayers(data.players ?? []);
      setMessages(data.messages ?? []);
    }

    function handlePresence(event) {
      applyPlayers(JSON.parse(event.data));
    }

    function handlePose(event) {
      const player = JSON.parse(event.data);
      if (player.id === id) return;
      setPlayers((previous) => {
        const index = previous.findIndex((entry) => entry.id === player.id);
        if (index < 0) return [...previous, player];
        const next = [...previous];
        next[index] = player;
        return next;
      });
    }

    function handleChat(event) {
      appendMessage(setMessages, JSON.parse(event.data));
    }

    function handleAction(event) {
      const action = JSON.parse(event.data);
      setLastAction(action);
      appendMessage(setMessages, {
        id: action.id,
        playerId: action.fromId,
        name: action.fromName,
        text: `waved to ${action.toName}`,
        at: action.at,
        action: true,
      });
    }

    async function connect() {
      try {
        setStatus('connecting');
        const joined = await postJson('/api/multiplayer/join', identityRef.current);
        if (!active) return;
        lastJoinAt = Date.now();
        setError('');
        applyPlayers(joined.players ?? []);
        setMessages(joined.messages ?? []);
        source = new EventSource(`/api/multiplayer/stream?id=${encodeURIComponent(id)}`, { withCredentials: true });
        source.addEventListener('snapshot', handleSnapshot);
        source.addEventListener('presence', handlePresence);
        source.addEventListener('pose', handlePose);
        source.addEventListener('chat', handleChat);
        source.addEventListener('action', handleAction);
        source.onopen = () => {
          lastJoinAt = Date.now();
          if (active) {
            setStatus('connected');
            setError('');
          }
        };
        source.onerror = () => active && setStatus('reconnecting');
      } catch (requestError) {
        if (!active) return;
        setStatus('offline');
        setError(requestError.message || 'The room server is unavailable.');
        retryTimer = window.setTimeout(connect, 3000);
      }
    }

    connect();
    const poseTimer = window.setInterval(() => {
      if (!active) return;
      if (source?.readyState !== EventSource.OPEN) {
        if (!rejoinInFlight && Date.now() - lastJoinAt > 18_000) {
          rejoinInFlight = true;
          postJson('/api/multiplayer/join', identityRef.current)
            .then(() => { lastJoinAt = Date.now(); })
            .catch(() => {})
            .finally(() => {
              lastJoinAt = Date.now();
              rejoinInFlight = false;
            });
        }
        return;
      }
      if (poseInFlight) return;
      poseInFlight = true;
      postJson('/api/multiplayer/state', { id, ...latestPoseRef.current })
        .catch(() => {})
        .finally(() => { poseInFlight = false; });
    }, 120);

    const handlePageHide = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/multiplayer/leave', new Blob([JSON.stringify({ id })], { type: 'application/json' }));
      }
      source?.close();
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      active = false;
      window.clearInterval(poseTimer);
      window.clearTimeout(retryTimer);
      window.removeEventListener('pagehide', handlePageHide);
      source?.close();
    };
  }, [identity.id]);

  const rename = useCallback(async (rawName) => {
    const name = rawName.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) || 'Reader';
    const nextIdentity = { ...identityRef.current, name };
    identityRef.current = nextIdentity;
    setIdentity(nextIdentity);
    setError('');
    try {
      const joined = await fetch('/api/multiplayer/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextIdentity),
      });
      if (!joined.ok) throw new Error('Could not update your room name.');
      try {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(nextIdentity));
      } catch {
        // The updated name stays available for this page session.
      }
      const data = await joined.json();
      setPlayers(data.players.filter((player) => player.id !== nextIdentity.id));
    } catch (requestError) {
      setError(requestError.message || 'Could not update your room name.');
    }
  }, []);

  const sendChat = useCallback(async (text) => {
    setError('');
    try {
      const response = await fetch('/api/multiplayer/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: identityRef.current.id, text }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not send that message.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not send that message.');
    }
  }, []);

  const wave = useCallback(async (targetId) => {
    setError('');
    try {
      const response = await fetch('/api/multiplayer/action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: identityRef.current.id, targetId, action: 'wave' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not send that wave.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not send that wave.');
    }
  }, []);

  return { identity, status, players, messages, lastAction, error, sendPose, rename, sendChat, wave };
}
