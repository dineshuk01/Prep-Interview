"""
voice_pipeline.py
─────────────────────────────────────────────────────────────────────────────
Real-time streaming voice pipeline components:

1. VADManager         – Silero VAD over incoming 20ms Int16 PCM frames
2. STTService         – Groq Whisper transcription
3. SentenceChunker    – Buffers LLM tokens; yields complete sentences
4. TTSService         – edge-tts async streaming TTS per sentence
─────────────────────────────────────────────────────────────────────────────
"""

import asyncio
import io
import os
import re
import struct
import wave
from typing import AsyncIterator

import numpy as np
import edge_tts
from groq import AsyncGroq


_SHARED_SILERO_MODEL = None

def _get_silero_model():
    global _SHARED_SILERO_MODEL
    if _SHARED_SILERO_MODEL is None:
        import silero_vad
        _SHARED_SILERO_MODEL = silero_vad.load_silero_vad()
        _SHARED_SILERO_MODEL.eval()
    return _SHARED_SILERO_MODEL

class VADManager:
    """
    Wraps Silero VAD to evaluate 16kHz Int16 PCM 32ms frames.
    Emits speech_start / speech_end events based on probability thresholds.

    Silero VAD 6.x API:
    - Returns a single probability tensor (stateless internally)
    - Minimum frame size: 512 samples @ 16kHz (32ms)
    - Use model.reset_states() instead of managing h/c tensors
    """

    SAMPLE_RATE = 16000
    FRAME_SAMPLES = 512          # 32ms @ 16kHz (minimum required by silero-vad 6.x)
    THRESHOLD_START = 0.5        # speech starts above this
    THRESHOLD_END = 0.35         # speech ends below this
    SILENCE_FRAMES_END = 20      # ~640ms of silence to trigger speech_end

    def __init__(self):
        self._model = _get_silero_model()
        self._speaking = False
        self._silence_count = 0
        self._audio_buffer: list[bytes] = []  # raw Int16 PCM chunks of speech

    def process_frame(self, pcm_bytes: bytes) -> dict:
        """
        Process a single 32ms PCM frame.

        Returns a dict with keys:
          - type: 'speech_start' | 'speech_end' | 'speaking' | 'silence' | None
          - audio: accumulated Int16 PCM bytes (only on speech_end)
        """
        import torch

        # Convert Int16 bytes -> float32 tensor normalised to [-1, 1]
        samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        # Silero-vad 6.x requires exactly 512 or more samples
        # Pad with zeros if frame is slightly short
        if len(samples) < self.FRAME_SAMPLES:
            samples = np.pad(samples, (0, self.FRAME_SAMPLES - len(samples)))
        elif len(samples) > self.FRAME_SAMPLES:
            samples = samples[:self.FRAME_SAMPLES]

        tensor = torch.from_numpy(samples)

        with torch.no_grad():
            result = self._model(tensor.unsqueeze(0), self.SAMPLE_RATE)
            prob = float(result.item())

        if not self._speaking:
            if prob >= self.THRESHOLD_START:
                self._speaking = True
                self._silence_count = 0
                self._audio_buffer = [pcm_bytes]
                return {"type": "speech_start"}
            return {"type": "silence"}
        else:
            self._audio_buffer.append(pcm_bytes)
            if prob < self.THRESHOLD_END:
                self._silence_count += 1
                if self._silence_count >= self.SILENCE_FRAMES_END:
                    self._speaking = False
                    self._silence_count = 0
                    audio = b"".join(self._audio_buffer)
                    self._audio_buffer = []
                    self._model.reset_states()
                    return {"type": "speech_end", "audio": audio}
                return {"type": "speaking", "prob": prob}
            else:
                self._silence_count = 0
                return {"type": "speaking", "prob": prob}

    def reset(self):
        """Reset VAD state (e.g., after barge-in cancellation)."""
        self._speaking = False
        self._silence_count = 0
        self._audio_buffer = []
        self._model.reset_states()


# ─────────────────────────────────────────────
# STT Service (Groq Whisper)
# ─────────────────────────────────────────────

class STTService:
    """
    Sends a PCM audio buffer to Groq Whisper for transcription.
    Returns the transcribed text string.
    """

    def __init__(self):
        self._client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

    async def transcribe(self, pcm_bytes: bytes, sample_rate: int = 16000) -> str:
        """
        Convert raw Int16 PCM bytes to WAV in-memory,
        then POST to Groq Whisper API.
        """
        wav_bytes = self._pcm_to_wav(pcm_bytes, sample_rate)
        audio_file = ("audio.wav", wav_bytes, "audio/wav")

        try:
            response = await self._client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="text",
                language="en"
            )
            if isinstance(response, str):
                return response.strip()
            return (response.text or "").strip()
        except Exception as e:
            print(f"[STT] Transcription error: {e}")
            return ""

    @staticmethod
    def _pcm_to_wav(pcm_bytes: bytes, sample_rate: int) -> bytes:
        """Wraps raw Int16 PCM bytes in a WAV container."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)       # 16-bit
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)
        return buf.getvalue()


# ─────────────────────────────────────────────
# Sentence Chunker
# ─────────────────────────────────────────────

# Sentence-ending punctuation pattern
_SENTENCE_END = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')

class SentenceChunker:
    """
    Buffers streamed LLM tokens and yields complete sentences
    suitable for TTS synthesis, minimising time-to-first-audio.
    """

    def __init__(self):
        self._buffer = ""

    def feed(self, token: str) -> list[str]:
        """
        Feed one streaming token. Returns a list of complete sentences
        ready to speak (may be empty if no sentence is complete yet).
        """
        self._buffer += token
        sentences = _SENTENCE_END.split(self._buffer)

        if len(sentences) <= 1:
            return []

        # Keep last incomplete fragment in buffer
        self._buffer = sentences[-1]
        complete = [s.strip() for s in sentences[:-1] if s.strip()]
        return complete

    def flush(self) -> list[str]:
        """Flush remaining buffer as final sentence."""
        if self._buffer.strip():
            result = [self._buffer.strip()]
            self._buffer = ""
            return result
        self._buffer = ""
        return []


# ─────────────────────────────────────────────
# TTS Service (edge-tts streaming)
# ─────────────────────────────────────────────

EDGE_TTS_VOICE = "en-US-AriaNeural"   # Natural, clear, professional voice

class TTSService:
    """
    Converts a text sentence to streaming MP3 audio using edge-tts.
    Yields audio chunks (bytes) as they become available.
    """

    def __init__(self, voice: str = EDGE_TTS_VOICE):
        self._voice = voice

    async def synthesize(self, text: str) -> bytes:
        """
        Synthesizes a complete text sentence into a full MP3 audio buffer.
        Returns complete MP3 bytes for seamless WebAudio decodeAudioData playback.
        """
        if not text.strip():
            return b""

        communicate = edge_tts.Communicate(text=text, voice=self._voice, rate="+5%")
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        return bytes(audio_data)
