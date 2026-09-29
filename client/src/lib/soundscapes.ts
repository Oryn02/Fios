// ============================================================================
// Web Audio soundscape engine for the Pomodoro timer.
// Generates ambient audio entirely in-browser (no asset files):
//  - long stereo-decorrelated pink / brown / white noise beds (~22–30s)
//  - dual-rate layering so composite loops drift for minutes before syncing
//  - filter + gain modulation (not static hiss), sparse one-shot events
//  - rain, ocean, forest, cafe, fireplace, library, lofi, binaural
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

/** Primary bed length — long enough that seams are rare and soft. */
const LOOP_A_SEC = 22;
/** Secondary bed length — incommensurate with A so layers drift for minutes. */
const LOOP_B_SEC = 29;

type BufferKey = `${NoiseKind}:${number}:stereo`;

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  private current: Soundscape = 'off';
  private volume = 0.5;
  private bufferCache = new Map<BufferKey, AudioBuffer>();

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
    return Math.tanh(x * 1.15) * 0.96;
  }

  /** One sample of filtered noise; state lives in the caller arrays. */
  private noiseSample(
    kind: NoiseKind,
    white: number,
    brown: { last: number },
    pink: { b0: number; b1: number; b2: number; b3: number; b4: number; b5: number; b6: number },
  ): number {
    if (kind === 'brown') {
      brown.last = (brown.last + 0.02 * white) / 1.02;
      return brown.last * 3.2;
    }
    if (kind === 'pink') {
      // Paul Kellet approximate pink filter (natural, less hissy than white).
      pink.b0 = 0.99886 * pink.b0 + white * 0.0555179;
      pink.b1 = 0.99332 * pink.b1 + white * 0.0750759;
      pink.b2 = 0.96900 * pink.b2 + white * 0.1538520;
      pink.b3 = 0.86650 * pink.b3 + white * 0.3104856;
      pink.b4 = 0.55000 * pink.b4 + white * 0.5329522;
      pink.b5 = -0.7616 * pink.b5 - white * 0.0168980;
      const sample =
        (pink.b0 + pink.b1 + pink.b2 + pink.b3 + pink.b4 + pink.b5 + pink.b6 + white * 0.5362) * 0.11;
      pink.b6 = white * 0.115926;
      return sample;
    }
    return white;
  }

  /**
   * Long stereo noise. L/R are independently filtered so the image feels wide
   * and loop seams are hard to hear. No edge fades — those create a periodic
   * amplitude dip that makes short loops obvious.
   */
  private makeStereoNoise(kind: NoiseKind, seconds: number): AudioBuffer {
    const key: BufferKey = `${kind}:${seconds}:stereo`;
    const cached = this.bufferCache.get(key);
    if (cached) return cached;

    const ctx = this.ensureCtx();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      const brown = { last: 0 };
      const pink = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 };
      // Warm-up filter state so the buffer start isn't a transient click.
      for (let w = 0; w < 2048; w++) {
        this.noiseSample(kind, Math.random() * 2 - 1, brown, pink);
      }
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = this.softClip(this.noiseSample(kind, white, brown, pink));
      }
    }

    this.bufferCache.set(key, buffer);
    return buffer;
  }

  private loopNoise(
    kind: NoiseKind,
    seconds: number,
    playbackRate = 1,
  ): AudioBufferSourceNode {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.makeStereoNoise(kind, seconds);
    src.loop = true;
    src.playbackRate.value = playbackRate;
    return src;
  }

  private attack(g: GainNode, target: number, seconds = 0.35) {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(target, t + seconds);
  }

  /** Slow LFO → AudioParam (gain or filter frequency). */
  private lfoTo(
    param: AudioParam,
    depth: number,
    hz: number,
    type: OscillatorType = 'sine',
  ): OscillatorNode {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = depth;
    osc.connect(g).connect(param);
    osc.start();
    this.track(osc);
    this.track(g);
    return osc;
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

  /** Dual drifting noise beds → shared filter chain (richer, less “tape loop”). */
  private dualBed(
    kind: NoiseKind,
    connect: (src: AudioBufferSourceNode, layer: 0 | 1) => void,
  ) {
    const a = this.loopNoise(kind, LOOP_A_SEC, 1);
    const b = this.loopNoise(kind, LOOP_B_SEC, 0.97);
    connect(a, 0);
    connect(b, 1);
    a.start();
    b.start();
    this.track(a);
    this.track(b);
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
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(1, ctx.currentTime);

    if (type === 'white') {
      // Soft white: dual pink-leaning beds, band-limited, slow breath on gain + cutoff.
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.45;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 4800; lp.Q.value = 0.7;
      const g = ctx.createGain();
      this.attack(g, 0.14, 0.45);
      this.lfoTo(g.gain, 0.018, 0.05);
      this.lfoTo(lp.frequency, 400, 0.04);
      this.dualBed('white', (src) => {
        const pan = ctx.createStereoPanner();
        pan.pan.value = src.playbackRate.value > 0.99 ? -0.15 : 0.15;
        src.connect(pan).connect(bp);
        this.track(pan);
      });
      bp.connect(lp).connect(g).connect(out);
      this.track(bp); this.track(lp); this.track(g);
      return;
    }

    if (type === 'brown') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.55;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 28;
      const g = ctx.createGain();
      this.attack(g, 0.4, 0.5);
      this.lfoTo(g.gain, 0.04, 0.035);
      this.lfoTo(lp.frequency, 55, 0.028);
      this.dualBed('brown', (src) => {
        src.connect(hp);
      });
      hp.connect(lp).connect(g).connect(out);
      this.track(lp); this.track(hp); this.track(g);
      return;
    }

    if (type === 'rain') {
      // Distant pink bed + closer mid spray + sparse droplet ticks.
      const bedLp = ctx.createBiquadFilter();
      bedLp.type = 'lowpass'; bedLp.frequency.value = 2800;
      const bedBp = ctx.createBiquadFilter();
      bedBp.type = 'bandpass'; bedBp.frequency.value = 850; bedBp.Q.value = 0.4;
      const bedG = ctx.createGain();
      this.attack(bedG, 0.26, 0.55);
      this.lfoTo(bedG.gain, 0.05, 0.07);
      this.lfoTo(bedLp.frequency, 350, 0.045);

      const nearHp = ctx.createBiquadFilter();
      nearHp.type = 'highpass'; nearHp.frequency.value = 1600;
      const nearLp = ctx.createBiquadFilter();
      nearLp.type = 'lowpass'; nearLp.frequency.value = 6200;
      const nearG = ctx.createGain();
      this.attack(nearG, 0.1, 0.5);
      this.lfoTo(nearG.gain, 0.035, 0.22);
      this.lfoTo(nearHp.frequency, 200, 0.11);

      this.dualBed('pink', (src, layer) => {
        const pan = ctx.createStereoPanner();
        pan.pan.value = layer === 0 ? -0.25 : 0.25;
        if (layer === 0) src.connect(pan).connect(bedBp);
        else src.connect(pan).connect(nearHp);
        this.track(pan);
      });
      // Extra mid spray layer at a third incommensurate rate.
      const spray = this.loopNoise('white', LOOP_A_SEC, 1.04);
      const sprayBp = ctx.createBiquadFilter();
      sprayBp.type = 'bandpass'; sprayBp.frequency.value = 3200; sprayBp.Q.value = 0.7;
      const sprayG = ctx.createGain();
      this.attack(sprayG, 0.055, 0.6);
      this.lfoTo(sprayG.gain, 0.02, 0.55);
      spray.connect(sprayBp).connect(sprayG).connect(out);
      spray.start();
      this.track(spray); this.track(sprayBp); this.track(sprayG);

      bedBp.connect(bedLp).connect(bedG).connect(out);
      nearHp.connect(nearLp).connect(nearG).connect(out);
      this.track(bedBp); this.track(bedLp); this.track(bedG);
      this.track(nearHp); this.track(nearLp); this.track(nearG);

      const drip = () => {
        if (this.current !== 'rain') return;
        const t0 = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * (0.018 + Math.random() * 0.04));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const env = Math.sin((Math.PI * i) / len);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2800 + Math.random() * 4200;
        bp.Q.value = 2.5 + Math.random() * 2;
        const g = ctx.createGain();
        g.gain.value = 0.04 + Math.random() * 0.06;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        src.connect(bp).connect(g).connect(pan).connect(out);
        src.onended = () => {
          try { src.disconnect(); bp.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        src.start(t0);
        this.schedule(drip, 90 + Math.random() * 420);
      };
      this.schedule(drip, 400);
      return;
    }

    if (type === 'ocean') {
      // Deep brown surf + pink foam; swell modulates both gain and brightness.
      const bodyLp = ctx.createBiquadFilter();
      bodyLp.type = 'lowpass'; bodyLp.frequency.value = 680; bodyLp.Q.value = 0.65;
      const bodyHp = ctx.createBiquadFilter();
      bodyHp.type = 'highpass'; bodyHp.frequency.value = 35;
      const bodyG = ctx.createGain();
      this.attack(bodyG, 0.3, 0.7);
      // Irregular multi-phase swell (not a single metronomic LFO).
      this.lfoTo(bodyG.gain, 0.18, 0.055);
      this.lfoTo(bodyG.gain, 0.1, 0.083, 'triangle');
      this.lfoTo(bodyLp.frequency, 220, 0.055);
      this.lfoTo(bodyLp.frequency, 90, 0.12);

      const foamBp = ctx.createBiquadFilter();
      foamBp.type = 'bandpass'; foamBp.frequency.value = 1800; foamBp.Q.value = 0.55;
      const foamG = ctx.createGain();
      this.attack(foamG, 0.07, 0.8);
      this.lfoTo(foamG.gain, 0.055, 0.065);
      this.lfoTo(foamBp.frequency, 500, 0.07);

      this.dualBed('brown', (src) => { src.connect(bodyHp); });
      const foamA = this.loopNoise('pink', LOOP_A_SEC, 1.02);
      const foamB = this.loopNoise('pink', LOOP_B_SEC, 0.94);
      const foamPanA = ctx.createStereoPanner(); foamPanA.pan.value = -0.35;
      const foamPanB = ctx.createStereoPanner(); foamPanB.pan.value = 0.35;
      foamA.connect(foamPanA).connect(foamBp);
      foamB.connect(foamPanB).connect(foamBp);
      foamA.start(); foamB.start();
      this.track(foamA); this.track(foamB); this.track(foamPanA); this.track(foamPanB);

      bodyHp.connect(bodyLp).connect(bodyG).connect(out);
      foamBp.connect(foamG).connect(out);
      this.track(bodyHp); this.track(bodyLp); this.track(bodyG);
      this.track(foamBp); this.track(foamG);
      return;
    }

    if (type === 'forest') {
      // Wind bed + leaf shimmer + distant insect band + varied bird phrases.
      const windLp = ctx.createBiquadFilter();
      windLp.type = 'lowpass'; windLp.frequency.value = 480;
      const windG = ctx.createGain();
      this.attack(windG, 0.26, 0.6);
      this.lfoTo(windG.gain, 0.09, 0.045);
      this.lfoTo(windLp.frequency, 120, 0.06);

      const leafBp = ctx.createBiquadFilter();
      leafBp.type = 'bandpass'; leafBp.frequency.value = 2600; leafBp.Q.value = 0.45;
      const leafG = ctx.createGain();
      this.attack(leafG, 0.065, 0.55);
      this.lfoTo(leafG.gain, 0.04, 0.14);
      this.lfoTo(leafBp.frequency, 400, 0.09);

      const insectBp = ctx.createBiquadFilter();
      insectBp.type = 'bandpass'; insectBp.frequency.value = 5200; insectBp.Q.value = 1.1;
      const insectG = ctx.createGain();
      this.attack(insectG, 0.018, 0.8);
      this.lfoTo(insectG.gain, 0.01, 0.31);

      this.dualBed('brown', (src) => { src.connect(windLp); });
      const leaves = this.loopNoise('pink', LOOP_B_SEC, 1.01);
      leaves.connect(leafBp).connect(leafG).connect(out);
      leaves.start();
      const insects = this.loopNoise('white', LOOP_A_SEC, 0.96);
      insects.connect(insectBp).connect(insectG).connect(out);
      insects.start();
      this.track(leaves); this.track(insects);
      windLp.connect(windG).connect(out);
      this.track(windLp); this.track(windG);
      this.track(leafBp); this.track(leafG);
      this.track(insectBp); this.track(insectG);

      const phrase = () => {
        if (this.current !== 'forest') return;
        const notes = 1 + Math.floor(Math.random() * 3);
        let t0 = ctx.currentTime + 0.02;
        const base = 1400 + Math.random() * 1800;
        const panVal = Math.random() * 1.5 - 0.75;
        for (let n = 0; n < notes; n++) {
          const osc = ctx.createOscillator();
          osc.type = Math.random() > 0.55 ? 'sine' : 'triangle';
          const f = base * (0.9 + Math.random() * 0.35) * (n === 0 ? 1 : 0.92 + Math.random() * 0.2);
          const dur = 0.07 + Math.random() * 0.11;
          osc.frequency.setValueAtTime(f, t0);
          osc.frequency.exponentialRampToValueAtTime(f * (0.88 + Math.random() * 0.2), t0 + dur);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.028 + Math.random() * 0.022, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
          const pan = ctx.createStereoPanner();
          pan.pan.value = panVal + (Math.random() * 0.15 - 0.075);
          // Soft high shelf via bandpass so chirps aren't pure sine beeps.
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.4;
          osc.connect(bp).connect(g).connect(pan).connect(out);
          osc.onended = () => {
            try { osc.disconnect(); bp.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
          };
          osc.start(t0);
          osc.stop(t0 + dur + 0.02);
          t0 += dur * (0.55 + Math.random() * 0.5);
        }
        this.schedule(phrase, 2800 + Math.random() * 7000);
      };
      this.schedule(phrase, 1500 + Math.random() * 2500);
      return;
    }

    if (type === 'cafe') {
      // Formant-ish murmur beds + HVAC rumble + occasional cup/cutlery clinks.
      const murBp = ctx.createBiquadFilter();
      murBp.type = 'bandpass'; murBp.frequency.value = 580; murBp.Q.value = 0.85;
      const murLp = ctx.createBiquadFilter();
      murLp.type = 'lowpass'; murLp.frequency.value = 1600;
      const murG = ctx.createGain();
      this.attack(murG, 0.18, 0.55);
      this.lfoTo(murG.gain, 0.045, 0.13);
      this.lfoTo(murBp.frequency, 90, 0.09);

      // Second formant band for “voices in a room” colour.
      const mur2Bp = ctx.createBiquadFilter();
      mur2Bp.type = 'bandpass'; mur2Bp.frequency.value = 1100; mur2Bp.Q.value = 1.1;
      const mur2G = ctx.createGain();
      this.attack(mur2G, 0.07, 0.6);
      this.lfoTo(mur2G.gain, 0.025, 0.19);

      const rumLp = ctx.createBiquadFilter();
      rumLp.type = 'lowpass'; rumLp.frequency.value = 140;
      const rumG = ctx.createGain();
      this.attack(rumG, 0.12, 0.5);
      this.lfoTo(rumG.gain, 0.02, 0.04);

      this.dualBed('pink', (src, layer) => {
        if (layer === 0) src.connect(murBp);
        else src.connect(mur2Bp);
      });
      const rumble = this.loopNoise('brown', LOOP_B_SEC, 0.98);
      rumble.connect(rumLp).connect(rumG).connect(out);
      rumble.start();
      this.track(rumble);

      murBp.connect(murLp).connect(murG).connect(out);
      mur2Bp.connect(mur2G).connect(out);
      this.track(murBp); this.track(murLp); this.track(murG);
      this.track(mur2Bp); this.track(mur2G);
      this.track(rumLp); this.track(rumG);

      const clink = () => {
        if (this.current !== 'cafe') return;
        const t0 = ctx.currentTime + 0.01;
        // Two partials for a more ceramic “cup” than a single sine.
        const f0 = 2200 + Math.random() * 2000;
        const mix = ctx.createGain();
        mix.gain.setValueAtTime(0, t0);
        mix.gain.linearRampToValueAtTime(0.032, t0 + 0.006);
        mix.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.3 - 0.65;
        const mk = (freq: number, level: number, type: OscillatorType) => {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, t0);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t0 + 0.22);
          const g = ctx.createGain();
          g.gain.value = level;
          osc.connect(g).connect(mix);
          osc.start(t0);
          osc.stop(t0 + 0.3);
          osc.onended = () => {
            try { osc.disconnect(); g.disconnect(); } catch { /* noop */ }
          };
        };
        mk(f0, 0.7, 'sine');
        mk(f0 * 1.48, 0.35, 'triangle');
        mix.connect(pan).connect(out);
        this.schedule(() => {
          try { mix.disconnect(); pan.disconnect(); } catch { /* noop */ }
        }, 350);
        this.schedule(clink, 3500 + Math.random() * 10000);
      };
      this.schedule(clink, 2500 + Math.random() * 4000);
      return;
    }

    if (type === 'fireplace') {
      // Ember rumble + mid hiss + irregular multi-band crackles.
      const rumLp = ctx.createBiquadFilter();
      rumLp.type = 'lowpass'; rumLp.frequency.value = 200;
      const rumG = ctx.createGain();
      this.attack(rumG, 0.28, 0.55);
      this.lfoTo(rumG.gain, 0.055, 0.11);
      this.lfoTo(rumLp.frequency, 40, 0.08);

      const hissBp = ctx.createBiquadFilter();
      hissBp.type = 'bandpass'; hissBp.frequency.value = 2800; hissBp.Q.value = 0.5;
      const hissG = ctx.createGain();
      this.attack(hissG, 0.045, 0.5);
      this.lfoTo(hissG.gain, 0.02, 0.27);

      this.dualBed('brown', (src) => { src.connect(rumLp); });
      const hiss = this.loopNoise('pink', LOOP_A_SEC, 1.03);
      hiss.connect(hissBp).connect(hissG).connect(out);
      hiss.start();
      this.track(hiss);
      rumLp.connect(rumG).connect(out);
      this.track(rumLp); this.track(rumG);
      this.track(hissBp); this.track(hissG);

      const crackle = () => {
        if (this.current !== 'fireplace') return;
        const t0 = ctx.currentTime;
        const sliceLen = Math.floor(ctx.sampleRate * (0.025 + Math.random() * 0.09));
        const buf = ctx.createBuffer(1, sliceLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < sliceLen; i++) {
          // Slightly pink-weighted burst (integrate a bit) for woodier snap.
          const env = Math.pow(Math.sin((Math.PI * i) / sliceLen), 0.7);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const burst = ctx.createBufferSource();
        burst.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900 + Math.random() * 3400;
        bp.Q.value = 0.9 + Math.random() * 1.8;
        const g = ctx.createGain();
        g.gain.value = 0.07 + Math.random() * 0.14;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.1 - 0.55;
        burst.connect(bp).connect(g).connect(pan).connect(out);
        burst.onended = () => {
          try { burst.disconnect(); bp.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        burst.start(t0);
        // Occasional double-pop (embers), then resume irregular cadence.
        const next = 160 + Math.random() * 900;
        if (Math.random() < 0.28) {
          this.schedule(() => {
            if (this.current !== 'fireplace') return;
            const t1 = ctx.currentTime;
            const len2 = Math.floor(ctx.sampleRate * (0.02 + Math.random() * 0.05));
            const buf2 = ctx.createBuffer(1, len2, ctx.sampleRate);
            const d2 = buf2.getChannelData(0);
            for (let i = 0; i < len2; i++) {
              d2[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len2);
            }
            const b2 = ctx.createBufferSource();
            b2.buffer = buf2;
            const bp2 = ctx.createBiquadFilter();
            bp2.type = 'bandpass';
            bp2.frequency.value = 1400 + Math.random() * 2800;
            bp2.Q.value = 1.2;
            const g2 = ctx.createGain();
            g2.gain.value = 0.05 + Math.random() * 0.08;
            const pan2 = ctx.createStereoPanner();
            pan2.pan.value = Math.random() * 1.0 - 0.5;
            b2.connect(bp2).connect(g2).connect(pan2).connect(out);
            b2.onended = () => {
              try { b2.disconnect(); bp2.disconnect(); g2.disconnect(); pan2.disconnect(); } catch { /* noop */ }
            };
            b2.start(t1);
          }, 35 + Math.random() * 80);
        }
        this.schedule(crackle, next);
      };
      this.schedule(crackle, 180);
      return;
    }

    if (type === 'library') {
      // Soft HVAC room tone + very quiet air + rare page rustles.
      const roomLp = ctx.createBiquadFilter();
      roomLp.type = 'lowpass'; roomLp.frequency.value = 780;
      const roomHp = ctx.createBiquadFilter();
      roomHp.type = 'highpass'; roomHp.frequency.value = 70;
      const roomG = ctx.createGain();
      this.attack(roomG, 0.075, 0.7);
      this.lfoTo(roomG.gain, 0.012, 0.03);

      // Gentle HVAC hum (two slow beats) under the noise bed.
      const humMix = ctx.createGain();
      this.attack(humMix, 0.025, 0.9);
      [52, 104].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.55 : 0.22;
        osc.connect(g).connect(humMix);
        osc.start();
        this.track(osc); this.track(g);
      });
      humMix.connect(out);
      this.track(humMix);

      this.dualBed('pink', (src) => { src.connect(roomHp); });
      roomHp.connect(roomLp).connect(roomG).connect(out);
      this.track(roomHp); this.track(roomLp); this.track(roomG);

      const rustle = () => {
        if (this.current !== 'library') return;
        const t0 = ctx.currentTime;
        const sliceLen = Math.floor(ctx.sampleRate * (0.15 + Math.random() * 0.35));
        const buf = ctx.createBuffer(1, sliceLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < sliceLen; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.15 * white) / 1.15;
          const env = Math.sin((Math.PI * i) / sliceLen);
          // Two soft amplitude lobes = page turn.
          const lobe = 0.55 + 0.45 * Math.sin((Math.PI * 2 * i) / sliceLen);
          data[i] = last * env * lobe * 0.7;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 900; bp.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.value = 0.04 + Math.random() * 0.03;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 0.8 - 0.4;
        src.connect(bp).connect(g).connect(pan).connect(out);
        src.onended = () => {
          try { src.disconnect(); bp.disconnect(); g.disconnect(); pan.disconnect(); } catch { /* noop */ }
        };
        src.start(t0);
        this.schedule(rustle, 8000 + Math.random() * 16000);
      };
      this.schedule(rustle, 6000 + Math.random() * 5000);
      return;
    }

    if (type === 'lofi') {
      // Warm detuned pad + soft vinyl dust + slow filter breathe.
      const freqs = [174.61, 220, 261.63, 329.63, 392.0]; // F3 A3 C4 E4 G4
      const mix = ctx.createGain();
      this.attack(mix, 0.1, 0.7);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.55;
      this.lfoTo(mix.gain, 0.028, 0.08);
      this.lfoTo(lp.frequency, 280, 0.05);
      mix.connect(lp).connect(out);
      this.track(mix); this.track(lp);

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        osc.detune.value = (i - 2) * 6 + (Math.random() * 2 - 1);
        const og = ctx.createGain();
        og.gain.value = (0.42 - i * 0.05) * (osc.type === 'triangle' ? 0.35 : 1);
        osc.connect(og).connect(mix);
        osc.start();
        this.track(osc); this.track(og);
      });

      // Sparse vinyl-dust ticks (not a looped noise bed).
      const dust = () => {
        if (this.current !== 'lofi') return;
        const t0 = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * (0.004 + Math.random() * 0.012));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 2500 + Math.random() * 4000; bp.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.value = 0.015 + Math.random() * 0.025;
        src.connect(bp).connect(g).connect(out);
        src.onended = () => {
          try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch { /* noop */ }
        };
        src.start(t0);
        this.schedule(dust, 200 + Math.random() * 900);
      };
      this.schedule(dust, 500);
      return;
    }

    if (type === 'binaural') {
      // ~10 Hz alpha beat: softer carriers, gentle attack, tiny breath.
      const makeEar = (freq: number, pan: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        const g = ctx.createGain();
        this.attack(g, 0.085, 0.75);
        this.lfoTo(g.gain, 0.008, 0.04);
        osc.connect(g).connect(panner).connect(out);
        osc.start();
        this.track(osc); this.track(g); this.track(panner);
      };
      makeEar(200, -1);
      makeEar(210, 1);
      // Soft brown bed under carriers so it feels less like pure tones.
      const bed = this.loopNoise('brown', LOOP_B_SEC, 1);
      const bedLp = ctx.createBiquadFilter();
      bedLp.type = 'lowpass'; bedLp.frequency.value = 180;
      const bedG = ctx.createGain();
      this.attack(bedG, 0.04, 0.9);
      bed.connect(bedLp).connect(bedG).connect(out);
      bed.start();
      this.track(bed); this.track(bedLp); this.track(bedG);
      return;
    }
  }

  stop() { this.play('off'); }
}

export const soundscapeEngine = new SoundscapeEngine();
