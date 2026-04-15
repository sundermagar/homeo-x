// PCM Audio Worklet Processor
// Captures mic audio as Int16 PCM chunks for Google STT streaming.
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
      const s = Math.max(-1, Math.min(1, input[i] || 0));
      this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

      // When buffer is full (4096 samples = ~256ms at 16kHz), send it
      if (this.offset >= this.buffer.length) {
        // Send a copy to avoid transfer/mutation issues
        const pcmCopy = new Int16Array(this.buffer);
        this.port.postMessage(pcmCopy.buffer, [pcmCopy.buffer]);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
