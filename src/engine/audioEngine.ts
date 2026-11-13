export class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private enabled = true;
  private volume = 0.65;
  private lastStepTime = 0;
  private lastHeartbeatTime = 0;
  private noiseBuffer: AudioBuffer | null = null;

  init(): void {
    this.ensureVoicesHook();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? this.volume : 0;
    this.masterGain.connect(this.ctx.destination);

    // Pre-bake 3-second noise buffer for rain, wind, thunder, footsteps, static
    const sr = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sr * 3, sr);
    const data = this.noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.8 + white * 0.15;
    }

    // Continuous rain / wind loop
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = this.noiseBuffer;
    rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 950;
    rainFilter.Q.value = 0.65;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.16;

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSource.start();

    // Eerie dark Indian drone (low D & minor second tension)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc2.type = 'triangle';
    this.droneOsc1.frequency.value = 55; // A1
    this.droneOsc2.frequency.value = 58.27; // Bb1 eerie dissonance

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 180;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.04;

    this.droneOsc1.connect(droneFilter);
    this.droneOsc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.05);
    }
  }

  setRainIndoorFactor(isOutdoor: boolean, rainStopped = false): void {
    if (!this.rainGain || !this.ctx) return;
    const target = rainStopped ? 0.01 : isOutdoor ? 0.24 : 0.065;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.35);
  }

  updateTension(threat: number): void {
    if (!this.ctx || !this.droneGain || !this.droneOsc2) return;
    const now = this.ctx.currentTime;
    const targetDrone = 0.035 + threat * 0.16;
    this.droneGain.gain.setTargetAtTime(targetDrone, now, 0.2);
    this.droneOsc2.frequency.setTargetAtTime(58.27 + threat * 6.5, now, 0.2);

    // Heartbeat thump when Kavita is close
    if (threat > 0.28) {
      const interval = Math.max(0.36, 1.05 - threat * 0.68);
      if (performance.now() / 1000 - this.lastHeartbeatTime > interval) {
        this.lastHeartbeatTime = performance.now() / 1000;
        this.playHeartbeat(0.15 + threat * 0.32);
      }
    }
  }

  private playHeartbeat(gainAmt: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const makePulse = (offset: number, freq: number, amp: number) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(32, t + offset + 0.14);
      g.gain.setValueAtTime(0.001, t + offset);
      g.gain.linearRampToValueAtTime(amp, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.16);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.18);
    };
    makePulse(0, 62, gainAmt);
    makePulse(0.16, 54, gainAmt * 0.72);
  }

  playFootstep(sprinting: boolean, crouching: boolean, outdoor: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = performance.now() / 1000;
    const interval = sprinting ? 0.31 : crouching ? 0.62 : 0.46;
    if (now - this.lastStepTime < interval) return;
    this.lastStepTime = now;

    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = outdoor ? 1100 : crouching ? 320 : 620;

    const g = this.ctx.createGain();
    const vol = crouching ? 0.045 : sprinting ? 0.17 : 0.1;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(t, Math.random() * 1.5, 0.12);
  }

  playThunder(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, t);
    filter.frequency.exponentialRampToValueAtTime(65, t + 2.4);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(t, 0, 2.7);
  }

  playDoorCreak(locked = false): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    if (locked) {
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140 - i * 25, t + i * 0.09);
        g.gain.setValueAtTime(0.11, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.07);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t + i * 0.09);
        osc.stop(t + i * 0.09 + 0.08);
      }
      return;
    }

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.linearRampToValueAtTime(215, t + 0.25);
    osc.frequency.linearRampToValueAtTime(98, t + 0.48);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 380;
    filter.Q.value = 5;

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  playKnock(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [0, 0.24, 0.48].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, t + offset);
      osc.frequency.exponentialRampToValueAtTime(52, t + offset + 0.09);
      g.gain.setValueAtTime(0.32, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    });
  }

  playPhoneRing(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    for (let burst = 0; burst < 2; burst++) {
      const start = t + burst * 0.9;
      for (let i = 0; i < 6; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i % 2 === 0 ? 1120 : 1340;
        g.gain.setValueAtTime(0.12, start + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, start + i * 0.06 + 0.055);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(start + i * 0.06);
        osc.stop(start + i * 0.06 + 0.06);
      }
    }
  }

  playHorrorSting(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [220, 233, 622, 880].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, t + 1.4);
      const flt = this.ctx!.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 1400;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(flt);
      flt.connect(g);
      g.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 1.55);
    });
  }

  playPickup(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [523, 659].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.12, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.16);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.18);
    });
  }

  playSwitchClick(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 680;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playMessageBeep(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [880, 1175].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.16, t + idx * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.22);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.24);
    });
  }

  playDoorbell(): void {
    this.init();
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const t = this.ctx.currentTime;

    // Two-chime classic hotel entrance brass bell ("डिंग-डॉन्ग") with metallic harmonics
    const chimes = [
      { offset: 0.0, base: 880, dur: 1.15 },
      { offset: 0.28, base: 659.25, dur: 1.75 },
    ];

    chimes.forEach(({ offset, base, dur }) => {
      const start = t + offset;
      // Striker transient click
      const clickOsc = this.ctx!.createOscillator();
      const clickGain = this.ctx!.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(base * 4.2, start);
      clickGain.gain.setValueAtTime(0.24, start);
      clickGain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);
      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain!);
      clickOsc.start(start);
      clickOsc.stop(start + 0.05);

      // Fundamental + metallic bell overtones (1x, 2x, 3.01x)
      [1, 2, 3.01].forEach((mult, idx) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(base * mult, start);
        const peak = idx === 0 ? 0.42 : idx === 1 ? 0.18 : 0.08;
        const decay = idx === 0 ? dur : dur * 0.65;
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(peak, start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, start + decay);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(start);
        osc.stop(start + decay + 0.04);
      });
    });
  }

  playJumpScareScream(): void {
    this.init();
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const t = this.ctx.currentTime;

    // 1. Sub-bass shock slam
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 0.65);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.85);

    // 2. Harsh noise blast (scary shriek burst)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1850, t);
      bp.frequency.exponentialRampToValueAtTime(650, t + 1.5);
      bp.Q.value = 1.4;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.001, t);
      ng.gain.linearRampToValueAtTime(0.68, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(this.masterGain);
      noise.start(t, 0.1, 1.65);
    }

    // 3. Dissonant shrieking Chudail scream harmonics + FM terror tremor
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value = 55;
    lfo.connect(lfoGain);

    [554.37, 587.33, 830.61, 1174.66, 1244.51].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * (idx >= 2 ? 0.82 : 0.91), t + 1.75);
      lfoGain.connect(osc.frequency);

      const flt = this.ctx!.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 1550;
      flt.Q.value = 1.2;

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(idx < 2 ? 0.24 : 0.16, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

      osc.connect(flt);
      flt.connect(g);
      g.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 1.85);
    });
    lfo.start(t);
    lfo.stop(t + 1.85);
  }

  playRadioStaticFade(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(1850, t);
    flt.frequency.exponentialRampToValueAtTime(420, t + 1.4);
    flt.Q.value = 3.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.masterGain);
    src.start(t, 0.2, 1.5);
  }

  playCarStall(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(86 - i * 16, t + i * 0.22);
      osc.frequency.exponentialRampToValueAtTime(28, t + i * 0.22 + 0.19);
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 260;
      g.gain.setValueAtTime(0.22, t + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.22 + 0.2);
      osc.connect(flt);
      flt.connect(g);
      g.connect(this.masterGain);
      osc.start(t + i * 0.22);
      osc.stop(t + i * 0.22 + 0.21);
    }
  }

  private playGhostlyVoiceLayer(durationSec = 3.2): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || !this.enabled) return;
    const t = this.ctx.currentTime;

    // 1. Breathy female ghostly air tremor (spooky spectral whisper formant)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(1450, t);
    formant1.frequency.linearRampToValueAtTime(1850, t + durationSec * 0.5);
    formant1.frequency.linearRampToValueAtTime(1350, t + durationSec);
    formant1.Q.value = 5.5;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 5.8; // Eerie trembling witch flutter
    lfoGain.gain.value = 0.035;

    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.001, t);
    breathGain.gain.linearRampToValueAtTime(0.042, t + 0.22);
    breathGain.gain.linearRampToValueAtTime(0.032, t + durationSec * 0.75);
    breathGain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

    lfo.connect(lfoGain);
    lfoGain.connect(breathGain.gain);
    src.connect(formant1);
    formant1.connect(breathGain);
    breathGain.connect(this.masterGain);

    src.start(t);
    src.stop(t + durationSec);
    lfo.start(t);
    lfo.stop(t + durationSec);

    // 2. High eerie spectral female harmonic overtone (A5 / Bb5 chilling dissonance)
    [880.0, 932.3].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.96, t + durationSec);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + durationSec + 0.05);
    });
  }

  private voicesReady = false;
  private speechEpoch = 0;
  private activeUtterances = new Set<SpeechSynthesisUtterance>();
  private activeSpeechTimers = new Set<number>();
  private resumeIntervalId: number | null = null;

  // High-definition Neural Indian Hindi TTS caches & active playback nodes
  private rawNeuralCache = new Map<string, ArrayBuffer>();
  private decodedNeuralCache = new Map<string, AudioBuffer>();
  private neuralInFlight = new Map<string, Promise<ArrayBuffer | null>>();
  private activeNeuralSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.ensureVoicesHook();
  }

  private ensureVoicesHook(): void {
    if (this.voicesReady) return;
    this.voicesReady = true;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', () => {
          window.speechSynthesis.getVoices();
        });
      }
    } catch {
      // ignore voice preload issues
    }
  }

  playPenWrite(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    // Soft multi-stroke fountain pen on paper scratches (~1.6s)
    for (let s = 0; s < 6; s++) {
      const start = t + s * 0.25;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 2600 + (s % 3) * 350;
      flt.Q.value = 3.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      src.connect(flt);
      flt.connect(g);
      g.connect(this.masterGain);
      src.start(start, (s * 0.31) % 1.8, 0.2);
    }
  }

  private normalizeSpeechKey(role: 'player' | 'chudail', text: string): string {
    const clean = text.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();
    return `${role}:${clean}`;
  }

  private fetchRawNeuralAudio(role: 'player' | 'chudail', text: string): Promise<ArrayBuffer | null> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return Promise.resolve(null);
    }
    const cleanText = text.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return Promise.resolve(null);

    const key = `${role}:${cleanText}`;
    const existing = this.rawNeuralCache.get(key);
    if (existing) return Promise.resolve(existing);

    const pending = this.neuralInFlight.get(key);
    if (pending) return pending;

    const job = (async () => {
      try {
        const url = `/api/tts?role=${encodeURIComponent(role)}&text=${encodeURIComponent(cleanText)}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const arrBuf = await resp.arrayBuffer();
        if (arrBuf.byteLength < 200) return null;
        if (this.rawNeuralCache.size >= 240) {
          const oldest = this.rawNeuralCache.keys().next().value;
          if (oldest !== undefined) {
            this.rawNeuralCache.delete(oldest);
            this.decodedNeuralCache.delete(oldest);
          }
        }
        this.rawNeuralCache.set(key, arrBuf);
        return arrBuf;
      } catch {
        return null;
      } finally {
        this.neuralInFlight.delete(key);
      }
    })();

    this.neuralInFlight.set(key, job);
    return job;
  }

  public prefetchSpeech(role: 'player' | 'chudail', text: string): void {
    void this.fetchRawNeuralAudio(role, text);
  }

  private async getDecodedNeuralBuffer(role: 'player' | 'chudail', text: string): Promise<AudioBuffer | null> {
    this.init();
    if (!this.ctx) return null;

    const key = this.normalizeSpeechKey(role, text);
    const cachedDec = this.decodedNeuralCache.get(key);
    if (cachedDec) return cachedDec;

    const raw = await this.fetchRawNeuralAudio(role, text);
    if (!raw || !this.ctx) return null;

    try {
      // Pass a fresh slice copy because decodeAudioData detaches the ArrayBuffer
      const decoded = await this.ctx.decodeAudioData(raw.slice(0));
      this.decodedNeuralCache.set(key, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  private pickFemaleHindiVoice(): SpeechSynthesisVoice | undefined {
    this.ensureVoicesHook();
    const voices = window.speechSynthesis.getVoices();
    const hindiVoices = voices.filter((v) => v.lang.toLowerCase().includes('hi'));
    const femalePattern =
      /female|woman|lekha|kalpana|heera|swara|neerja|priya|aditi|raveena|kiyara|kavita|zira|sita|shruti|geeta|google\s*(?:हिन्दी|hindi)|hi[-_]in[-_]x[-_]hi[ac]/i;
    return (
      hindiVoices.find((v) => femalePattern.test(`${v.name} ${v.voiceURI}`)) ||
      hindiVoices[0]
    );
  }

  private pickMaleHindiVoice(): SpeechSynthesisVoice | undefined {
    this.ensureVoicesHook();
    const voices = window.speechSynthesis.getVoices();
    const hindiVoices = voices.filter((v) => v.lang.toLowerCase().includes('hi'));
    const malePattern = /madhur|hemant|prabhat|neel|rishi|aarav|kabir|arjun|vikram|dev|amit|rohit|ankit|kalp|hi[-_]in[-_]x[-_]hi[de]/i;
    return hindiVoices.find((v) => malePattern.test(`${v.name} ${v.voiceURI}`)) || hindiVoices[0];
  }

  private splitHindiClauses(rawText: string): string[] {
    const cleaned = rawText.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    const tokens = cleaned.split(/([।!?—…]+|\.{2,})/);
    const sentences: string[] = [];
    for (let i = 0; i < tokens.length; i += 2) {
      const body = (tokens[i] || '').trim();
      const punct = tokens[i + 1] || '';
      const combined = `${body}${punct}`.trim();
      if (combined) sentences.push(combined);
    }
    return sentences.length > 0 ? sentences : [cleaned];
  }

  private clearSpeechTimers(): void {
    this.activeSpeechTimers.forEach((id) => window.clearTimeout(id));
    this.activeSpeechTimers.clear();
    if (this.resumeIntervalId !== null) {
      window.clearInterval(this.resumeIntervalId);
      this.resumeIntervalId = null;
    }
  }

  private scheduleSpeechTimer(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.activeSpeechTimers.delete(id);
      fn();
    }, ms);
    this.activeSpeechTimers.add(id);
  }

  private stopActiveNeuralNodes(): void {
    while (this.activeNeuralSources.length > 0) {
      const src = this.activeNeuralSources.pop();
      if (src) {
        try {
          src.onended = null;
          src.stop();
          src.disconnect();
        } catch {
          // ignore already-stopped nodes
        }
      }
    }
  }

  public stopSpeech(): void {
    this.speechEpoch += 1;
    this.clearSpeechTimers();
    this.stopActiveNeuralNodes();
    this.activeUtterances.clear();
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore speech cancel errors
    }
  }

  public speakSequence(
    turns: {
      role: 'player' | 'chudail';
      text: string;
      onStart?: () => void;
      onEnd?: () => void;
    }[],
    interrupt = true
  ): void {
    if (turns.length === 0) return;
    this.init();
    this.ensureVoicesHook();

    if (interrupt) {
      this.stopSpeech();
    }

    const epoch = ++this.speechEpoch;
    this.clearSpeechTimers();

    // Prefetch all turns immediately so multi-turn conversations have zero pause
    turns.forEach((t) => this.prefetchSpeech(t.role, t.text));

    const playFallbackWebSpeech = (
      turn: { role: 'player' | 'chudail'; text: string; onEnd?: () => void },
      onDone: () => void
    ) => {
      const clauses = this.splitHindiClauses(turn.text);
      const canTts =
        typeof window !== 'undefined' && 'speechSynthesis' in window && this.enabled;

      if (!canTts || clauses.length === 0) {
        const silentWait = Math.max(2000, turn.text.length * 75 + 900);
        this.scheduleSpeechTimer(() => {
          if (epoch !== this.speechEpoch) return;
          onDone();
        }, silentWait);
        return;
      }

      if (this.resumeIntervalId === null) {
        this.resumeIntervalId = window.setInterval(() => {
          try {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.resume();
            }
          } catch {
            // ignore
          }
        }, 3500);
      }

      const speakClause = (clauseIdx: number) => {
        if (epoch !== this.speechEpoch) return;
        if (clauseIdx >= clauses.length) {
          onDone();
          return;
        }
        const clauseText = clauses[clauseIdx];
        let finished = false;
        let safetyId = 0;

        const finishClause = () => {
          if (finished) return;
          finished = true;
          if (safetyId) {
            window.clearTimeout(safetyId);
            this.activeSpeechTimers.delete(safetyId);
          }
          if (epoch !== this.speechEpoch) return;
          speakClause(clauseIdx + 1);
        };

        try {
          const utter = new SpeechSynthesisUtterance(clauseText);
          utter.lang = 'hi-IN';
          if (turn.role === 'chudail') {
            const voice = this.pickFemaleHindiVoice();
            if (voice) utter.voice = voice;
            utter.pitch = 1.25;
            utter.rate = 0.85;
            utter.volume = Math.min(1.0, this.volume + 0.22);
          } else {
            const voice = this.pickMaleHindiVoice();
            if (voice) utter.voice = voice;
            utter.pitch = 0.88;
            utter.rate = 1.0;
            utter.volume = Math.min(0.95, this.volume + 0.08);
          }

          this.activeUtterances.add(utter);
          utter.onend = () => {
            this.activeUtterances.delete(utter);
            finishClause();
          };
          utter.onerror = () => {
            this.activeUtterances.delete(utter);
            finishClause();
          };

          const initialWaitMs = Math.max(5000, clauseText.length * 150 + 2800);
          safetyId = window.setTimeout(() => {
            this.activeSpeechTimers.delete(safetyId);
            this.activeUtterances.delete(utter);
            finishClause();
          }, initialWaitMs);
          this.activeSpeechTimers.add(safetyId);

          window.speechSynthesis.speak(utter);
        } catch {
          finishClause();
        }
      };

      speakClause(0);
    };

    const startTurn = async (turnIdx: number) => {
      if (epoch !== this.speechEpoch) return;
      if (turnIdx >= turns.length) {
        this.clearSpeechTimers();
        return;
      }

      const turn = turns[turnIdx];
      turn.onStart?.();

      const nextTurn = turns[turnIdx + 1];
      if (nextTurn) {
        this.prefetchSpeech(nextTurn.role, nextTurn.text);
      }

      if (!this.enabled) {
        const silentWait = Math.max(2200, turn.text.length * 75 + 900);
        this.scheduleSpeechTimer(() => {
          if (epoch !== this.speechEpoch) return;
          turn.onEnd?.();
          void startTurn(turnIdx + 1);
        }, silentWait);
        return;
      }

      // Fetch genuine Indian Neural Voice buffer (MadhurNeural for young Indian boy, SwaraNeural for Chudail)
      const audioBuffer = await this.getDecodedNeuralBuffer(turn.role, turn.text);
      if (epoch !== this.speechEpoch) return;

      if (audioBuffer && this.ctx && this.masterGain) {
        try {
          if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
          }
          if (epoch !== this.speechEpoch) return;

          const src = this.ctx.createBufferSource();
          src.buffer = audioBuffer;
          this.activeNeuralSources.push(src);

          const voiceGain = this.ctx.createGain();
          if (turn.role === 'chudail') {
            voiceGain.gain.value = 1.24;
            src.connect(voiceGain);
            voiceGain.connect(this.masterGain);

            // Eerie haunted hall echo + spectral witch whisper behind Kavita's voice
            const delay = this.ctx.createDelay();
            delay.delayTime.value = 0.11;
            const echoFilter = this.ctx.createBiquadFilter();
            echoFilter.type = 'bandpass';
            echoFilter.frequency.value = 1480;
            echoFilter.Q.value = 1.8;
            const echoGain = this.ctx.createGain();
            echoGain.gain.value = 0.3;
            src.connect(delay);
            delay.connect(echoFilter);
            echoFilter.connect(echoGain);
            echoGain.connect(this.masterGain);

            this.playGhostlyVoiceLayer(Math.min(4.8, audioBuffer.duration));
          } else {
            // Pure, crystal-clear, natural Indian young boy voice (hi-IN-MadhurNeural)
            voiceGain.gain.value = 1.28;
            src.connect(voiceGain);
            voiceGain.connect(this.masterGain);
          }

          let completed = false;
          const onFinish = () => {
            if (completed) return;
            completed = true;
            this.activeNeuralSources = this.activeNeuralSources.filter((s) => s !== src);
            if (epoch !== this.speechEpoch) return;
            turn.onEnd?.();
            this.scheduleSpeechTimer(() => void startTurn(turnIdx + 1), 140);
          };

          src.onended = onFinish;
          src.start(0);

          // Safety timer matching exact buffer duration + 1.2s slack
          this.scheduleSpeechTimer(onFinish, Math.ceil(audioBuffer.duration * 1000) + 1200);
          return;
        } catch {
          // Fall through cleanly to fallback speech
        }
      }

      if (turn.role === 'chudail') {
        const estDur = Math.min(4.2, Math.max(2.0, turn.text.length * 0.05));
        this.playGhostlyVoiceLayer(estDur);
      }

      playFallbackWebSpeech(turn, () => {
        if (epoch !== this.speechEpoch) return;
        turn.onEnd?.();
        this.scheduleSpeechTimer(() => void startTurn(turnIdx + 1), 180);
      });
    };

    void startTurn(0);
  }

  speakScaryWoman(text: string, interrupt = true): void {
    this.speakSequence([{ role: 'chudail', text }], interrupt);
  }

  speakPlayerMale(text: string, interrupt = true): void {
    this.speakSequence([{ role: 'player', text }], interrupt);
  }

  speakNarrator(text: string): void {
    this.speakPlayerMale(text);
  }

  speakHindi(text: string, _pitch = 1.0, _rate = 1.0): void {
    this.speakPlayerMale(text);
  }

  dispose(): void {
    this.stopSpeech();
    try {
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
  }
}
