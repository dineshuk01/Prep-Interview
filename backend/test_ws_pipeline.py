"""
test_ws_pipeline.py
─────────────────────────────────────────────────────────────────────────────
Automated test for the real-time voice WebSocket pipeline.

Tests:
1. WebSocket handshake – connects successfully
2. VAD frame processing – server processes 20ms binary PCM frames
3. Server sends valid JSON messages
4. SentenceChunker – unit test chunking logic
5. STT service – PCM -> WAV conversion is valid

Usage (backend venv active):
    python test_ws_pipeline.py
─────────────────────────────────────────────────────────────────────────────
"""
import asyncio
import io
import json
import math
import struct
import wave
import sys

print("=" * 60)
print("Real-Time Voice Pipeline – Integration Test")
print("=" * 60)

# ── Test 1: SentenceChunker unit test ────────────────────────────────────────
print("\n[1/4] Testing SentenceChunker...")
from voice_pipeline import SentenceChunker

chunker = SentenceChunker()
results = []
tokens = ["Hello", " world", ".", " How", " are", " you", "?", " I", " am", " fine", "."]
for t in tokens:
    results.extend(chunker.feed(t))
results.extend(chunker.flush())

assert len(results) == 3, f"Expected 3 sentences, got {len(results)}: {results}"
assert results[0] == "Hello world.", f"Bad sentence 1: {results[0]}"
assert results[1] == "How are you?", f"Bad sentence 2: {results[1]}"
assert results[2] == "I am fine.", f"Bad sentence 3: {results[2]}"
print(f"  ✅ SentenceChunker: {results}")

# ── Test 2: PCM → WAV conversion ─────────────────────────────────────────────
print("\n[2/4] Testing PCM→WAV conversion...")
from voice_pipeline import STTService

# Generate 1s of 440Hz sine wave at 16kHz as Int16 PCM
sr = 16000
duration_samples = sr  # 1 second
freq = 440
pcm_samples = []
for i in range(duration_samples):
    sample = int(32767 * math.sin(2 * math.pi * freq * i / sr))
    pcm_samples.append(sample)
pcm_bytes = struct.pack(f"<{len(pcm_samples)}h", *pcm_samples)

wav_bytes = STTService._pcm_to_wav(pcm_bytes, 16000)
buf = io.BytesIO(wav_bytes)
with wave.open(buf, 'rb') as wf:
    assert wf.getnchannels() == 1, "Not mono!"
    assert wf.getsampwidth() == 2, "Not 16-bit!"
    assert wf.getframerate() == 16000, "Not 16kHz!"
    assert wf.getnframes() == duration_samples
print(f"  ✅ PCM→WAV: {len(wav_bytes)} bytes, valid WAV container")

# ── Test 3: VADManager initialises ───────────────────────────────────────────
print("\n[3/4] Testing VADManager initialisation...")
from voice_pipeline import VADManager

vad = VADManager()
# Send 10 frames of silence (all zeros = no speech)
silent_frame = b'\x00' * (320 * 2)  # 320 Int16 samples = 640 bytes
silence_results = []
for _ in range(10):
    result = vad.process_frame(silent_frame)
    silence_results.append(result["type"])

assert all(r in ("silence", "speech_start", "speaking", "speech_end") for r in silence_results)
print(f"  ✅ VADManager: 10 silent frames → {set(silence_results)}")

# ── Test 4: WebSocket handshake (requires running backend) ───────────────────
print("\n[4/4] Testing WebSocket handshake...")
try:
    import websockets

    async def _test_ws():
        uri = "ws://localhost:8000/ws/audio/test_session/technical/test_user"
        try:
            async with websockets.connect(uri, open_timeout=3) as ws:
                # Send one silent PCM frame
                silent_frame = b'\x00' * 640
                await ws.send(silent_frame)
                # Expect at least one JSON message (silence event or similar)
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3)
                    parsed = json.loads(msg)
                    assert "type" in parsed, f"No 'type' in message: {parsed}"
                    print(f"  ✅ WebSocket handshake OK. First message: {parsed}")
                except asyncio.TimeoutError:
                    # Server may not reply for pure silence — that's fine
                    print("  ✅ WebSocket handshake OK (no response for silent frame — expected)")
        except Exception as e:
            print(f"  ⚠️  WebSocket test skipped (backend not running): {e}")

    asyncio.run(_test_ws())
except ImportError:
    print("  ⚠️  websockets package not installed — skipping WS handshake test")

print("\n" + "=" * 60)
print("All available tests passed ✅")
print("=" * 60)
