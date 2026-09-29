// ============================================================================
// Web Audio soundscape engine for the Pomodoro timer.
// Generates ambient audio entirely in-browser (no asset files):
//  - white / pink / brown noise via buffer synthesis (long loops, soft-clipped)
//  - rain, ocean, forest, cafe, fireplace, library (layered filters + LFOs)
//  - lofi pad (soft detuned oscillators + gentle tremolo)
//  - binaural alpha waves (two ears, ~10 Hz beat)
// A single shared engine persists regardless of widget expand/collapse.
// ============================================================================

export type Soundscape =
  | 'off'
  | 'brown'
  | 'white'
  | 'rain'
  | 'ocean'
  | 'forest'
  | 'cafe'
  | 'fireplace'
  | 'library'
  | 'lofi'
  | 'binaural';

export const SOUNDSCAPES: { key: Soundscape; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'brown', label: 'Brown Noise' },
  { key: 'white', label: 'Soft White' },
  { key: 'rain', label: 'Rain on Window' },
  { key: 'ocean', label: 'Ocean Waves' },
  { key: 'forest', label: 'Forest Canopy' },
  { key: 'cafe', label: 'Cafe Murmur' },
  { key: 'fireplace', label: 'Fireplace' },
  { key: 'library', label: 'Quiet Library' },
  { key: 'lofi', label: 'Lofi Pad' },
  { key: 'binaural', label: 'Binaural Alpha' },
];

type NoiseKind = 'white' | 'pink' | 'brown';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  private current: Soundscape = 'off';
  private volume = 0.5;
  private bufferCache = new Map<NoiseKind, AudioBuffer>();

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => { /* iOS may still need a fresh gesture */ });
    }
    return this.ctx;
  }

  /**
   * Unlock AudioContext on a user gesture (required on iOS/Android).
   * Call from click/touch handlers before or when starting a soundscape.
   */
  async unlock(): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore — next play() will retry */
      }
    }
    // Tiny silent buffer kickstarts some WebKit builds after resume.
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* noop */
    }
  }

  private softClip(x: number): number {
    // Gentle tanh-ish clip keeps peaks from sounding harsh/digital.
    return Math.tanh(x * 1.2) * 0.95;
  }

  private makeNoiseBuffer(kind: NoiseKind): AudioBuffer {
    const cached = this.bufferCache.get(kind);
    if (cached) return cached;

    const ctx = this.ensureCtx();
    // Longer loops (~6s) make seams far less noticeable than 2s buffers.
    const seconds = 6;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      let sample = white;

      if (kind === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        sample = last * 3.2;
      } else if (kind === 'pink') {
        // Paul Kellet approximate pink filter (natural, less hissy than white).
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      // Soft fade at loop edges (~12 ms) to hide the seam.
      const fade = Math.min(i, len - 1 - i, Math.floor(ctx.sampleRate * 0.012));
      const edge = fade / Math.max(1, Math.floor(ctx.sampleRate * 0.012));
      data[i] = this.softClip(sample) * edge;
    }

    this.bufferCache.set(kind, buffer);
    return buffer;
  }

  private loopNoise(kind: NoiseKind): AudioBufferSourceNode {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(kind);
    src.loop = true;
    return src;
  }

  private attack(g: GainNode, target: number, seconds = 0.22) {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(target, t + seconds);
  }

  private track(node: AudioNode) { this.nodes.push(node); }

  private schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  }

  private clearTimers() {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }

  private stopNodes() {
    this.clearTimers();
    for (const n of this.nodes) {
      try { (n as any).stop?.(); } catch { /* noop */ }
      try { n.disconnect(); } catch { /* noop */ }
    }
    this.nodes = [];
  }

  private out(): GainNode {
    this.ensureCtx();
    return this.bus!;
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

    // Fire-and-forget unlock so mobile autoplay policies are satisfied when
    // play() is invoked from a click handler.
    void this.unlock();
    const ctx = this.ensureCtx();
    const out = this.out();
    // Reset bus after prior fade/stop.
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(1, ctx.currentTime);

    if (type === 'white') {
      // Soft white: band-limited pink-leaning hiss, not raw full-spectrum static.
      const src = this.loopNoise('white');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.55;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.7;
      const g = ctx.createGain();
      this.attack(g, 0.16);
      src.connect(bp).connect(lp).connect(g).connect(out);
      src.start();
      this.track(src); this.track(bp); this.track(lp); this.track(g);
      return;
    }

    if (type === 'brown') {
      const src = this.loopNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.6;
      const g = ctx.createGain();
      this.attack(g, 0.42);
      src.connect(lp).connect(g).connect(out);
      src.start();
      this.track(src); this.track(lp); this.track(g);
      return;
    }

    if (type === 'rain') {
      // Distant bed + closer mid layer + gentle amplitude flutter.
      const bed = this.loopNoise('pink');
      const near = this.loopNoise('white');

      const bedBp = ctx.createBiquadFilter();
      bedBp.type = 'bandpass'; bedBp.frequency.value = 900; bedBp.Q.value = 0.45;
      const bedLp = ctx.createBiquadFilter();
      bedLp.type = 'lowpass'; bedLp.frequency.value = 3200;
      const bedG = ctx.createGain();
      this.attack(bedG, 0.28);

      const nearHp = ctx.createBiquadFilter();
      nearHp.type = 'highpass'; nearHp.frequency.value = 1400;
      const nearLp = ctx.createBiquadFilter();
      nearLp.type = 'lowpass'; nearLp.frequency.value = 5400;
      const nearG = ctx.createGain();
      this.attack(nearG, 0.12);

      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.35;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.045;
      lfo.connect(lfoGain).connect(bedG.gain); lfo.start();

      const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.9;
      const lfo2Gain = ctx.createGain(); lfo2Gain.gain.value = 0.03;
      lfo2.connect(lfo2Gain).connect(nearG.gain); lfo2.start();

      bed.connect(bedBp).connect(bedLp).connect(bedG).connect(out);
      near.connect(nearHp).connect(nearLp).connect(nearG).connect(out);
      bed.start(); near.start();
      this.track(bed); this.track(near); this.track(bedBp); this.track(bedLp);
      this.track(nearHp); this.track(nearLp); this.track(bedG); this.track(nearG);
      this.track(lfo); this.track(lfo2); this.track(lfoGain); this.track(lfo2Gain);
      return;
    }

    if (type === 'ocean') {
      // Soft surf: brown bed + slow multi-phase swell LFOs.
      const src = this.loopNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 720; lp.Q.value = 0.7;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 40;
      const g = ctx.createGain();
      this.attack(g, 0.32, 0.4);

      const swell = ctx.createOscillator(); swell.type = 'sine'; swell.frequency.value = 0.08;
      const swellG = ctx.createGain(); swellG.gain.value = 0.22;
      swell.connect(swellG).connect(g.gain); swell.start();

      const foam = this.loopNoise('pink');
      const foamBp = ctx.createBiquadFilter();
      foamBp.type = 'bandpass'; foamBp.frequency.value = 1600; foamBp.Q.value = 0.6;
      const foamG = ctx.createGain();
      this.attack(foamG, 0.08, 0.5);
      const foamLfo = ctx.createOscillator(); foamLfo.type = 'sine'; foamLfo.frequency.value = 0.11;
      const foamLfoG = ctx.createGain(); foamLfoG.gain.value = 0.06;
      foamLfo.connect(foamLfoG).connect(foamG.gain); foamLfo.start();

      src.connect(hp).connect(lp).connect(g).connect(out);
      foam.connect(foamBp).connect(foamG).connect(out);
      src.start(); foam.start();
      this.track(src); this.track(lp); this.track(hp); this.track(g);
      this.track(swell); this.track(swellG);
      this.track(foam); this.track(foamBp); this.track(foamG); this.track(foamLfo); this.track(foamLfoG);
      return;
    }

    if (type === 'forest') {
      // Wind through leaves + sparse soft bird chirps.
      const wind = this.loopNoise('brown');
      const windLp = ctx.createBiquadFilter();
      windLp.type = 'lowpass'; windLp.frequency.value = 520;
      const windG = ctx.createGain();
      this.attack(windG, 0.28);
      const windLfo = ctx.createOscillator(); windLfo.type = 'sine'; windLfo.frequency.value = 0.07;
      const windLfoG = ctx.createGain(); windLfoG.gain.value = 0.1;
      windLfo.connect(windLfoG).connect(windG.gain); windLfo.start();

      const leaves = this.loopNoise('pink');
      const leavesBp = ctx.createBiquadFilter();
      leavesBp.type = 'bandpass'; leavesBp.frequency.value = 2400; leavesBp.Q.value = 0.5;
      const leavesG = ctx.createGain();
      this.attack(leavesG, 0.07);
      const leavesLfo = ctx.createOscillator(); leavesLfo.type = 'sine'; leavesLfo.frequency.value = 0.18;
      const leavesLfoG = ctx.createGain(); leavesLfoG.gain.value = 0.035;
      leavesLfo.connect(leavesLfoG).connect(leavesG.gain); leavesLfo.start();

      wind.connect(windLp).connect(windG).connect(out);
      leaves.connect(leavesBp).connect(leavesG).connect(out);
      wind.start(); leaves.start();
      this.track(wind); this.track(windLp); this.track(windG); this.track(windLfo); this.track(windLfoG);
      this.track(leaves); this.track(leavesBp); this.track(leavesG); this.track(leavesLfo); this.track(leavesLfoG);

      const chirp = () => {
        if (this.current !== 'forest') return;
        const t0 = ctx.currentTime + 0.02;
        const freq = 1800 + Math.random() * 1400;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * (0.85 + Math.random() * 0.35), t0 + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.035 + Math.random() * 0.025, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.4 - 0.7;
        osc.connect(g).connect(pan).connect(out);
        osc.onended = () => {
          try { osc.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        osc.start(t0);
        osc.stop(t0 + 0.16);
        this.schedule(chirp, 2200 + Math.random() * 5500);
      };
      this.schedule(chirp, 1200 + Math.random() * 2000);
      return;
    }

    if (type === 'cafe') {
      // Muffled room murmur + distant low rumble + rare soft clinks.
      const murmur = this.loopNoise('pink');
      const murBp = ctx.createBiquadFilter();
      murBp.type = 'bandpass'; murBp.frequency.value = 650; murBp.Q.value = 0.7;
      const murLp = ctx.createBiquadFilter();
      murLp.type = 'lowpass'; murLp.frequency.value = 1800;
      const murG = ctx.createGain();
      this.attack(murG, 0.2);
      const murLfo = ctx.createOscillator(); murLfo.type = 'sine'; murLfo.frequency.value = 0.22;
      const murLfoG = ctx.createGain(); murLfoG.gain.value = 0.04;
      murLfo.connect(murLfoG).connect(murG.gain); murLfo.start();

      const rumble = this.loopNoise('brown');
      const rumLp = ctx.createBiquadFilter();
      rumLp.type = 'lowpass'; rumLp.frequency.value = 160;
      const rumG = ctx.createGain();
      this.attack(rumG, 0.14);

      murmur.connect(murBp).connect(murLp).connect(murG).connect(out);
      rumble.connect(rumLp).connect(rumG).connect(out);
      murmur.start(); rumble.start();
      this.track(murmur); this.track(murBp); this.track(murLp); this.track(murG);
      this.track(murLfo); this.track(murLfoG);
      this.track(rumble); this.track(rumLp); this.track(rumG);

      const clink = () => {
        if (this.current !== 'cafe') return;
        const t0 = ctx.currentTime + 0.01;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const f = 2400 + Math.random() * 1600;
        osc.frequency.setValueAtTime(f, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, t0 + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.028, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.2 - 0.6;
        osc.connect(g).connect(pan).connect(out);
        osc.onended = () => {
          try { osc.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        osc.start(t0);
        osc.stop(t0 + 0.25);
        this.schedule(clink, 4000 + Math.random() * 9000);
      };
      this.schedule(clink, 3000 + Math.random() * 4000);
      return;
    }

    if (type === 'fireplace') {
      // Low ember rumble + irregular crackle bursts.
      const rumble = this.loopNoise('brown');
      const rumLp = ctx.createBiquadFilter();
      rumLp.type = 'lowpass'; rumLp.frequency.value = 220;
      const rumG = ctx.createGain();
      this.attack(rumG, 0.3);
      const rumLfo = ctx.createOscillator(); rumLfo.type = 'sine'; rumLfo.frequency.value = 0.14;
      const rumLfoG = ctx.createGain(); rumLfoG.gain.value = 0.06;
      rumLfo.connect(rumLfoG).connect(rumG.gain); rumLfo.start();

      rumble.connect(rumLp).connect(rumG).connect(out);
      rumble.start();
      this.track(rumble); this.track(rumLp); this.track(rumG); this.track(rumLfo); this.track(rumLfoG);

      const crackle = () => {
        if (this.current !== 'fireplace') return;
        const t0 = ctx.currentTime;
        const burst = ctx.createBufferSource();
        // Short slice of pink noise as a crackle.
        const sliceLen = Math.floor(ctx.sampleRate * (0.03 + Math.random() * 0.07));
        const buf = ctx.createBuffer(1, sliceLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < sliceLen; i++) {
          const env = Math.sin((Math.PI * i) / sliceLen);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        burst.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200 + Math.random() * 2800;
        bp.Q.value = 1.2 + Math.random();
        const g = ctx.createGain();
        g.gain.value = 0.08 + Math.random() * 0.12;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.0 - 0.5;
        burst.connect(bp).connect(g).connect(pan).connect(out);
        burst.onended = () => {
          try { burst.disconnect(); bp.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        burst.start(t0);
        this.schedule(crackle, 180 + Math.random() * 700);
      };
      this.schedule(crackle, 200);
      return;
    }

    if (type === 'library') {
      // Near-silent room tone + rare soft page rustles.
      const room = this.loopNoise('pink');
      const roomLp = ctx.createBiquadFilter();
      roomLp.type = 'lowpass'; roomLp.frequency.value = 900;
      const roomHp = ctx.createBiquadFilter();
      roomHp.type = 'highpass'; roomHp.frequency.value = 80;
      const roomG = ctx.createGain();
      this.attack(roomG, 0.09, 0.5);

      room.connect(roomHp).connect(roomLp).connect(roomG).connect(out);
      room.start();
      this.track(room); this.track(roomLp); this.track(roomHp); this.track(roomG);

      const rustle = () => {
        if (this.current !== 'library') return;
        const t0 = ctx.currentTime;
        const src = ctx.createBufferSource();
        const sliceLen = Math.floor(ctx.sampleRate * (0.12 + Math.random() * 0.2));
        const buf = ctx.createBuffer(1, sliceLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < sliceLen; i++) {
          const env = Math.sin((Math.PI * i) / sliceLen);
          data[i] = (Math.random() * 2 - 1) * env * 0.5;
        }
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.value = 0.045 + Math.random() * 0.03;
        src.connect(bp).connect(g).connect(out);
        src.onended = () => {
          try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch { /* noop */ }
        };
        src.start(t0);
        this.schedule(rustle, 7000 + Math.random() * 12000);
      };
      this.schedule(rustle, 5000 + Math.random() * 4000);
      return;
    }

    if (type === 'lofi') {
      // Warm detuned pad with gentle lowpass + slow tremolo.
      const freqs = [174.61, 220, 261.63, 329.63]; // F3 A3 C4 E4
      const mix = ctx.createGain();
      this.attack(mix, 0.11, 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.6;
      const trem = ctx.createOscillator(); trem.type = 'sine'; trem.frequency.value = 0.12;
      const tremG = ctx.createGain(); tremG.gain.value = 0.035;
      trem.connect(tremG).connect(mix.gain); trem.start();
      mix.connect(lp).connect(out);
      this.track(mix); this.track(lp); this.track(trem); this.track(tremG);

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.detune.value = (i - 1.5) * 5;
        const og = ctx.createGain();
        og.gain.value = 0.45 - i * 0.05;
        osc.connect(og).connect(mix);
        osc.start();
        this.track(osc); this.track(og);
      });
      return;
    }

    if (type === 'binaural') {
      // ~10 Hz alpha beat: softer carriers, gentle attack.
      const makeEar = (freq: number, pan: number) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const panner = ctx.createStereoPanner(); panner.pan.value = pan;
        const g = ctx.createGain();
        this.attack(g, 0.09, 0.6);
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
