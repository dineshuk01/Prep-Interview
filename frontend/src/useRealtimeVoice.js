/**
 * useRealtimeVoice.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook for the full-duplex real-time voice pipeline.
 *
 * Manages:
 * 1. AudioContext + AudioWorklet (PCM capture at 16kHz, 20ms frames)
 * 2. WebSocket connection to /ws/audio/{session_id}/{round_type}/{user_id}
 * 3. VAD state callbacks (speech_start, speech_end) from the server
 * 4. Streaming LLM tokens → live transcript display
 * 5. Streaming TTS audio playback via WebAudio decodeAudioData queue
 * 6. Instant barge-in: clears playback queue when user starts speaking
 *
 * Returns:
 *   { isConnected, isRecording, isAISpeaking, liveTranscript, aiTranscript,
 *     startVoiceSession, stopVoiceSession }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const getWsBase = () => {
  let envWs = process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_URL;
  if (!envWs) {
    return 'ws://localhost:8000';
  }
  // Convert http:// to ws://, https:// to wss://
  let wsUrl = envWs.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  // Enforce wss:// when hosted over HTTPS to prevent Mixed Content security errors
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws:')) {
    wsUrl = wsUrl.replace(/^ws:/, 'wss:');
  }
  return wsUrl;
};

const WS_BASE = getWsBase();

export function useRealtimeVoice({ sessionId, roundType, userId, onUserMessage, onBotMessage }) {
  // ── State exposed to UI ──────────────────────────────────────────────────
  const [isConnected, setIsConnected]   = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');  // user speech in progress
  const [aiTranscript, setAiTranscript]     = useState('');  // streaming AI tokens

  // ── Internal refs (not triggering re-renders) ────────────────────────────
  const wsRef             = useRef(null);
  const audioCtxRef       = useRef(null);
  const workletNodeRef    = useRef(null);
  const streamRef         = useRef(null);
  const playQueueRef      = useRef([]);   // queue of AudioBuffer to play
  const isPlayingRef      = useRef(false);
  const aiTranscriptRef   = useRef('');

  // ─────────────────────────────────────────────────────────────────────────
  // WebAudio Playback Queue
  // Plays MP3 chunks sequentially with zero gaps.
  // ─────────────────────────────────────────────────────────────────────────
  const _playNext = useCallback(() => {
    if (playQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAISpeaking(false);
      return;
    }
    isPlayingRef.current = true;
    setIsAISpeaking(true);
    const audioBuffer = playQueueRef.current.shift();
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtxRef.current.destination);
    source.onended = () => _playNext();
    source.start();
  }, []);

  const _enqueueAudio = useCallback(async (base64Mp3) => {
    if (!audioCtxRef.current) return;
    try {
      const binary = atob(base64Mp3);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioBuffer = await audioCtxRef.current.decodeAudioData(bytes.buffer);
      playQueueRef.current.push(audioBuffer);
      if (!isPlayingRef.current) _playNext();
    } catch (e) {
      console.warn('[Voice] Audio decode error:', e);
    }
  }, [_playNext]);

  const _clearPlaybackQueue = useCallback(() => {
    playQueueRef.current = [];
    isPlayingRef.current = false;
    setIsAISpeaking(false);
    // Suspend and resume to immediately stop any current source
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      audioCtxRef.current.suspend().then(() => audioCtxRef.current.resume());
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // WebSocket Message Handler
  // ─────────────────────────────────────────────────────────────────────────
  const _handleWsMessage = useCallback((event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case 'vad':
        if (msg.event === 'speech_start') {
          setIsRecording(true);
          setLiveTranscript('');
        } else if (msg.event === 'speech_end') {
          setIsRecording(false);
        }
        break;

      case 'barge_in':
        // User interrupted the AI – clear audio queue immediately
        _clearPlaybackQueue();
        setAiTranscript('');
        aiTranscriptRef.current = '';
        break;

      case 'transcript':
        // Confirmed user utterance from STT
        setLiveTranscript(msg.text);
        if (onUserMessage) onUserMessage(msg.text);
        break;

      case 'token':
        // Streaming LLM token
        aiTranscriptRef.current += msg.text;
        setAiTranscript(aiTranscriptRef.current);
        break;

      case 'audio':
        // TTS audio chunk (base64 MP3)
        _enqueueAudio(msg.data);
        break;

      case 'audio_end':
        // AI finished speaking for this turn
        if (onBotMessage && aiTranscriptRef.current) {
          onBotMessage(aiTranscriptRef.current);
        }
        aiTranscriptRef.current = '';
        setAiTranscript('');
        break;

      case 'error':
        console.error('[Voice WS] Server error:', msg.detail);
        break;

      default:
        break;
    }
  }, [_clearPlaybackQueue, _enqueueAudio, onUserMessage, onBotMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Start Voice Session
  // ─────────────────────────────────────────────────────────────────────────
  const startVoiceSession = useCallback(async () => {
    if (wsRef.current) return; // Already connected

    // 1. Create AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext({ sampleRate: 48000 });  // native rate; worklet handles downsampling
    audioCtxRef.current = ctx;

    // 2. Load AudioWorklet processor
    await ctx.audioWorklet.addModule('/audio-processor.js');

    // 3. Get microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
    streamRef.current = stream;

    // 4. Connect mic → AudioWorklet
    const source = ctx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
    workletNodeRef.current = workletNode;
    source.connect(workletNode);
    // Worklet output not connected to destination (we don't want mic playback)

    // 5. Open WebSocket
    const ws = new WebSocket(`${WS_BASE}/ws/audio/${sessionId}/${roundType}/${userId}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[Voice] WebSocket connected');
    };
    ws.onmessage = _handleWsMessage;
    ws.onerror   = (e) => console.error('[Voice] WS error:', e);
    ws.onclose   = () => {
      setIsConnected(false);
      setIsRecording(false);
      console.log('[Voice] WebSocket closed');
    };

    // 6. Forward PCM frames from AudioWorklet → WebSocket
    workletNode.port.onmessage = (e) => {
      if (e.data.type === 'pcm' && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data.pcm); // ArrayBuffer, zero-copy transfer
      }
    };

    setIsRecording(false); // recording state driven by VAD events, not mic state
  }, [sessionId, roundType, userId, _handleWsMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Stop Voice Session
  // ─────────────────────────────────────────────────────────────────────────
  const stopVoiceSession = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // Stop microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    // Close AudioContext
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    _clearPlaybackQueue();
    setIsConnected(false);
    setIsRecording(false);
    setLiveTranscript('');
    setAiTranscript('');
    aiTranscriptRef.current = '';
  }, [_clearPlaybackQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopVoiceSession();
  }, [stopVoiceSession]);

  return {
    isConnected,
    isRecording,
    isAISpeaking,
    liveTranscript,
    aiTranscript,
    startVoiceSession,
    stopVoiceSession,
  };
}
