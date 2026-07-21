/**
 * audio-processor.js
 * AudioWorkletProcessor — runs on a dedicated audio rendering thread.
 *
 * Converts microphone audio to 16kHz Int16 PCM and emits
 * 20ms frames (320 samples @ 16kHz) to the main thread via postMessage.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer to accumulate samples until we have a full 20ms frame
    this._buffer = [];
    // Target: 16kHz → 512 samples = 32ms (minimum for Silero VAD 6.x)
    this._frameSize = 512;
    // AudioWorklet natively runs at the AudioContext sample rate (usually 48kHz)
    // We downsample to 16kHz using a ratio
    this._ratio = sampleRate / 16000;
    this._inputBuffer = [];
  }

  /**
   * Simple linear interpolation downsampler.
   * Takes Float32 samples at native rate → outputs Float32 at 16kHz.
   */
  _downsample(input) {
    const outputLength = Math.floor(input.length / this._ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const src = i * this._ratio;
      const idx = Math.floor(src);
      const frac = src - idx;
      const a = input[idx] || 0;
      const b = input[idx + 1] || 0;
      output[i] = a + frac * (b - a);
    }
    return output;
  }

  /**
   * Convert Float32 [-1.0, 1.0] to Int16 PCM.
   */
  _toInt16(floatData) {
    const int16 = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }

  /**
   * Called by the browser for every audio render quantum (128 samples).
   */
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true; // Keep alive

    const channelData = input[0]; // Use first channel (mono)

    // Downsample from native rate to 16kHz
    const downsampled = this._downsample(channelData);

    // Accumulate into buffer
    for (let i = 0; i < downsampled.length; i++) {
      this._inputBuffer.push(downsampled[i]);
    }

    // Emit 20ms frames (320 samples at 16kHz)
    while (this._inputBuffer.length >= this._frameSize) {
      const frame = this._inputBuffer.splice(0, this._frameSize);
      const pcm = this._toInt16(frame);
      // Transfer ownership for zero-copy performance
      this.port.postMessage({ type: 'pcm', pcm: pcm.buffer }, [pcm.buffer]);
    }

    return true; // Keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
