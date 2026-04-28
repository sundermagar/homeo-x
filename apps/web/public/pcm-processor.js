// PCM Audio Worklet Processor
// Captures mic audio as Int16 PCM chunks for Google STT streaming.
// Applies a 1.7x gain boost — matches the Ai-Consultation pipeline so soft
// voices and lapel mics still produce confident STT output.

const GAIN = 1.7;

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(4096);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    for (let i = 0; i < input.length; i++) {
      // Apply gain BEFORE clipping so we don't waste headroom on quiet input.
      let s = (input[i] || 0) * GAIN;
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

      // When buffer is full (4096 samples = ~256ms at 16kHz), send it
      if (this.offset >= this.buffer.length) {
        const pcmCopy = new Int16Array(this.buffer);
        this.port.postMessage(pcmCopy.buffer, [pcmCopy.buffer]);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
