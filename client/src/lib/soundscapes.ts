// ============================================================================
// Web Audio soundscape engine for the Pomodoro timer.
// Generates ambient audio entirely in-browser (no asset files):
//  - white / brown noise via buffer synthesis
//  - rain (filtered noise + amplitude flutter)
//  - ocean waves (brown noise + slow gain LFO)
//  - lofi pad (soft detuned oscillators)
//  - binaural alpha waves (two ears, ~10 Hz beat)
// A single shared engine persists regardless of widget expand/collapse.
// ============================================================================

export type Soundscape = 'off' | 'brown' | 'white' | 'rain' | 'ocean' | 'lofi' | 'binaural';

export const SOUNDSCAPES: { key: Soundscape; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'brown', label: 'Brown Noise' },
  { key: 'white', label: 'White Noise' },
  { key: 'rain', label: 'Rain on Window' },
  { key: 'ocean', label: 'Ocean Waves' },
  { key: 'lofi', label: 'Lofi Pad' },
  { key: 'binaural', label: 'Binaural Alpha' },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private current: Soundscape = 'off';
  private volume = 0.5;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private makeNoiseBuffer(kind: 'white' | 'brown'): AudioBuffer {
    const ctx = this.ensureCtx();
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'white') {
        data[i] = white;
      } else {
        // brown noise: integrate white noise
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buffer;
  }

  private track(node: AudioNode) { this.nodes.push(node); }

  private stopNodes() {
    for (const n of this.nodes) {
      try { (n as any).stop?.(); } catch { /* noop */ }
      try { n.disconnect(); } catch { /* noop */ }
    }
    this.nodes = [];
  }

  getCurrent(): Soundscape { return this.current; }
  getVolume(): number { return this.volume; }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  play(type: Soundscape) {
    this.stopNodes();
    this.current = type;
    if (type === 'off') return;

    const ctx = this.ensureCtx();
    const out = this.master!;

    if (type === 'white' || type === 'brown') {
      const src = ctx.createBufferSource();
      src.buffer = this.makeNoiseBuffer(type);
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = type === 'white' ? 0.25 : 0.5;
      src.connect(g).connect(out);
      src.start();
      this.track(src); this.track(g);
      return;
    }

    if (type === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = this.makeNoiseBuffer('white');
      src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 1200;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.value = 0.35;
      // gentle flutter
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(g.gain); lfo.start();
      src.connect(hp).connect(lp).connect(g).connect(out);
      src.start();
      this.track(src); this.track(g); this.track(lfo);
      return;
    }

    if (type === 'ocean') {
      const src = ctx.createBufferSource();
      src.buffer = this.makeNoiseBuffer('brown');
      src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain(); g.gain.value = 0.35;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; // slow waves
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.28;
      lfo.connect(lfoGain).connect(g.gain); lfo.start();
      src.connect(lp).connect(g).connect(out);
      src.start();
      this.track(src); this.track(g); this.track(lfo);
      return;
    }

    if (type === 'lofi') {
      const freqs = [220, 277.18, 329.63]; // A3 major-ish pad
      const g = ctx.createGain(); g.gain.value = 0.12;
      g.connect(out);
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = f; osc.detune.value = i * 4;
        const og = ctx.createGain(); og.gain.value = 0.6;
        osc.connect(og).connect(g); osc.start();
        this.track(osc); this.track(og);
      });
      this.track(g);
      return;
    }

    if (type === 'binaural') {
      // ~10 Hz alpha beat: 200 Hz left, 210 Hz right.
      const makeEar = (freq: number, pan: number) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const panner = ctx.createStereoPanner(); panner.pan.value = pan;
        const g = ctx.createGain(); g.gain.value = 0.12;
        osc.connect(g).connect(panner).connect(out); osc.start();
        this.track(osc); this.track(g); this.track(panner);
      };
      makeEar(200, -1);
      makeEar(210, 1);
      return;
    }
  }

  stop() { this.play('off'); }
}

export const soundscapeEngine = new SoundscapeEngine();
