// Procedural baião + SFX via Web Audio. Singleton.
type Note = { f: number; d: number; t?: "square" | "triangle" | "sawtooth" | "sine" };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private muted = false;

  init() {
    if (this.ctx || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.3;
      this.master.connect(this.ctx.destination);
      // Pre-render noise buffer for zabumba kick.
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    } catch {
      /* ignore */
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.3;
  }

  async ensureResumed() {
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  resume() {
    this.ensureResumed();
  }

  private playNote(n: Note, when: number, gain = 0.15) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = n.t ?? "square";
    o.frequency.value = n.f;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + n.d);
    o.connect(g).connect(this.master);
    try { o.start(when); } catch {}
    try { o.stop(when + n.d + 0.05); } catch {}
  }

  // Zabumba: low filtered noise pop with pitched body.
  private playZabumba(when: number, gain = 0.35) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    // Body: short sine sweep
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(45, when + 0.18);
    og.gain.setValueAtTime(gain, when);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    o.connect(og).connect(this.master);
    try { o.start(when); } catch {}
    try { o.stop(when + 0.25); } catch {}
    // Click: short low-passed noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.6, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    src.connect(f).connect(ng).connect(this.master);
    try { src.start(when); } catch {}
    try { src.stop(when + 0.12); } catch {}
  }

  // Triângulo: bright metallic ping with bandpass noise.
  private playTriangle(when: number, gain = 0.12) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 5500;
    f.Q.value = 22;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    src.connect(f).connect(g).connect(this.master);
    try { src.start(when); } catch {}
    try { src.stop(when + 0.2); } catch {}
  }

  // Baião / forró loop in D minor pentatonic with zabumba + triângulo.
  async startMusic() {
    await this.ensureResumed();
    if (!this.ctx || this.musicTimer) return;
    const beat = 0.18;
    const lead: Note[] = [
      { f: 293.66, d: beat },
      { f: 349.23, d: beat },
      { f: 392.0, d: beat },
      { f: 440.0, d: beat * 2 },
      { f: 392.0, d: beat },
      { f: 349.23, d: beat },
      { f: 293.66, d: beat * 2 },
      { f: 261.63, d: beat },
      { f: 293.66, d: beat * 3 },
    ];
    const bass: Note[] = [
      { f: 73.42, d: beat * 2, t: "triangle" },
      { f: 110.0, d: beat * 2, t: "triangle" },
      { f: 73.42, d: beat * 2, t: "triangle" },
      { f: 98.0, d: beat * 2, t: "triangle" },
    ];
    // Baião pattern: kick on 1, kick-and on 2.5 ("dum, du-dum"), triângulo on every offbeat.
    const totalBeats = lead.reduce((s, n) => s + n.d, 0) / beat; // ~12 beats
    const playLoop = () => {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + 0.05;
      let t = t0;
      for (const n of lead) { this.playNote(n, t, 0.07); t += n.d; }
      let tb = t0;
      for (const n of bass) { this.playNote(n, tb, 0.1); tb += n.d; }
      // Percussion: 4 bars of 3 beats each
      for (let i = 0; i < totalBeats; i++) {
        const tt = t0 + i * beat;
        if (i % 3 === 0) this.playZabumba(tt, 0.3);
        if (i % 3 === 2) this.playZabumba(tt - beat * 0.5, 0.18);
        // Triângulo on every beat with accent on offbeats
        this.playTriangle(tt + beat * 0.5, 0.08);
        if (i % 2 === 0) this.playTriangle(tt, 0.05);
      }
      const total = lead.reduce((s, n) => s + n.d, 0);
      this.musicTimer = window.setTimeout(playLoop, total * 1000);
    };
    playLoop();
  }

  stopMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  async sfxEat() {
    await this.ensureResumed();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playNote({ f: 660, d: 0.08, t: "square" }, t, 0.2);
    this.playNote({ f: 990, d: 0.1, t: "square" }, t + 0.08, 0.2);
  }
  async sfxGameOver() {
    await this.ensureResumed();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playNote({ f: 330, d: 0.2, t: "sawtooth" }, t, 0.2);
    this.playNote({ f: 220, d: 0.3, t: "sawtooth" }, t + 0.2, 0.2);
    this.playNote({ f: 110, d: 0.5, t: "sawtooth" }, t + 0.5, 0.2);
  }
  async sfxClick() {
    await this.ensureResumed();
    if (!this.ctx) return;
    this.playNote({ f: 880, d: 0.05, t: "square" }, this.ctx.currentTime, 0.15);
  }
  async sfxWin() {
    await this.ensureResumed();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) =>
      this.playNote({ f, d: 0.15, t: "square" }, t + i * 0.1, 0.18),
    );
  }
}

export const audio = new AudioEngine();
