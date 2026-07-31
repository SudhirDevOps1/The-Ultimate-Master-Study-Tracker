// Web Audio API Native Synthesizer for 100% Offline Focus Audio
// Zero MP3 asset dependencies - works entirely via browser audio synthesis

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private binauralNodes: { leftOsc?: OscillatorNode; rightOsc?: OscillatorNode; gain?: GainNode; merger?: ChannelMergerNode } | null = null;
  private noiseNodes: { source?: AudioBufferSourceNode; filter?: BiquadFilterNode; gain?: GainNode } | null = null;
  private spaceNodes: { osc?: OscillatorNode; lfo?: OscillatorNode; gain?: GainNode } | null = null;

  private isBinauralPlaying = false;
  private isNoisePlaying = false;
  private isSpacePlaying = false;

  private binauralVol = 0.3;
  private noiseVol = 0.2;
  private spaceVol = 0.25;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // ── 1. Binaural Beats Generator (Alpha 10Hz Focus) ──────────────────────
  public toggleBinaural(enable: boolean, beatFreq = 10, baseFreq = 200) {
    const ctx = this.getContext();
    if (!enable) {
      if (this.binauralNodes?.leftOsc) {
        this.binauralNodes.leftOsc.stop();
        this.binauralNodes.rightOsc?.stop();
        this.binauralNodes = null;
      }
      this.isBinauralPlaying = false;
      return;
    }

    if (this.isBinauralPlaying) return;

    const merger = ctx.createChannelMerger(2);
    
    // Left ear base oscillator
    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = baseFreq;

    // Right ear shifted oscillator (+beatFreq for binaural beat)
    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = baseFreq + beatFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.binauralVol, ctx.currentTime);

    leftOsc.connect(merger, 0, 0);  // Left channel
    rightOsc.connect(merger, 0, 1); // Right channel

    merger.connect(gain);
    gain.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    this.binauralNodes = { leftOsc, rightOsc, gain, merger };
    this.isBinauralPlaying = true;
  }

  public setBinauralVolume(vol: number) {
    this.binauralVol = Math.max(0, Math.min(1, vol));
    if (this.binauralNodes?.gain && this.ctx) {
      this.binauralNodes.gain.gain.setValueAtTime(this.binauralVol, this.ctx.currentTime);
    }
  }

  // ── 2. Pink Noise Generator (Rain / Waterfall Ambience) ─────────────────
  public toggleNoise(enable: boolean) {
    const ctx = this.getContext();
    if (!enable) {
      if (this.noiseNodes?.source) {
        this.noiseNodes.source.stop();
        this.noiseNodes = null;
      }
      this.isNoisePlaying = false;
      return;
    }

    if (this.isNoisePlaying) return;

    // Generate 5 seconds of pink noise buffer
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Lowpass filter to simulate gentle rain / soft room hum
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.noiseVol, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();

    this.noiseNodes = { source, filter, gain };
    this.isNoisePlaying = true;
  }

  public setNoiseVolume(vol: number) {
    this.noiseVol = Math.max(0, Math.min(1, vol));
    if (this.noiseNodes?.gain && this.ctx) {
      this.noiseNodes.gain.gain.setValueAtTime(this.noiseVol, this.ctx.currentTime);
    }
  }

  // ── 3. Deep Space Ambient Drone (Sub-bass Drone) ────────────────────────
  public toggleSpaceDrone(enable: boolean) {
    const ctx = this.getContext();
    if (!enable) {
      if (this.spaceNodes?.osc) {
        this.spaceNodes.osc.stop();
        this.spaceNodes.lfo?.stop();
        this.spaceNodes = null;
      }
      this.isSpacePlaying = false;
      return;
    }

    if (this.isSpacePlaying) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 65; // Deep bass tone

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.2; // Slow pulse

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.spaceVol, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    lfo.start();

    this.spaceNodes = { osc, lfo, gain };
    this.isSpacePlaying = true;
  }

  public setSpaceVolume(vol: number) {
    this.spaceVol = Math.max(0, Math.min(1, vol));
    if (this.spaceNodes?.gain && this.ctx) {
      this.spaceNodes.gain.gain.setValueAtTime(this.spaceVol, this.ctx.currentTime);
    }
  }

  public stopAll() {
    this.toggleBinaural(false);
    this.toggleNoise(false);
    this.toggleSpaceDrone(false);
  }

  public getState() {
    return {
      binaural: this.isBinauralPlaying,
      noise: this.isNoisePlaying,
      space: this.isSpacePlaying,
      binauralVol: this.binauralVol,
      noiseVol: this.noiseVol,
      spaceVol: this.spaceVol,
    };
  }
}

export const audioEngine = new AmbientAudioEngine();
