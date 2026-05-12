// Lightweight Web Speech API wrapper (pt-BR).
class TTS {
  private supported = typeof window !== "undefined" && "speechSynthesis" in window;
  private voice: SpeechSynthesisVoice | null = null;
  private muted = false;

  constructor() {
    if (this.supported) {
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        this.voice =
          voices.find((v) => /pt[-_]?BR/i.test(v.lang)) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith("pt")) ||
          null;
      };
      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  isSupported() {
    return this.supported;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.cancel();
  }

  cancel() {
    if (this.supported) window.speechSynthesis.cancel();
  }

  speak(text: string) {
    if (!this.supported || this.muted || !text) return;
    this.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1;
    u.pitch = 1;
    if (this.voice) u.voice = this.voice;
    window.speechSynthesis.speak(u);
  }
}

export const tts = new TTS();
