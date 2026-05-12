import { CordelLines } from "./CordelLines";
import { useEffect, useState } from "react";
import { tts } from "../engine/tts";

export function CordelIntro({ lines, onContinue }: { lines: string[]; onContinue: () => void }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { tts.cancel(); onContinue(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); tts.cancel(); };
  }, [onContinue]);

  const speak = () => {
    if (speaking) { tts.cancel(); setSpeaking(false); return; }
    tts.speak(lines.join(". "));
    setSpeaking(true);
    if ("speechSynthesis" in window) {
      const check = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) { setSpeaking(false); clearInterval(check); }
      }, 400);
    }
  };

  return (
    <div className="overlay modal-backdrop">
      <div className="xilo-card modal-card cordel-intro">
        <p className="kicker">CORDEL DE ABERTURA</p>
        <CordelLines lines={lines} delay={0.7} />
        <div className="actions">
          <button className="btn btn-primary" onClick={() => { tts.cancel(); onContinue(); }}>Começar</button>
          {tts.isSupported() && (
            <button className="btn btn-ghost" onClick={speak} aria-pressed={speaking}>
              {speaking ? "⏹ Parar" : "🔊 Ouvir cordel"}
            </button>
          )}
        </div>
        <p className="footnote">Espaço / Enter</p>
      </div>
    </div>
  );
}
