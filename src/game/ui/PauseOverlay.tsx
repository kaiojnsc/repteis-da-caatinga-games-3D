import { useEffect } from "react";
import { audio } from "../engine/AudioEngine";

type Props = {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

export function PauseOverlay({ onResume, onRestart, onQuit }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        audio.sfxClick();
        onResume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResume]);

  return (
    <div className="overlay modal-backdrop pause-overlay">
      <div className="xilo-card modal-card pause-card">
        <p className="kicker">PAUSADO</p>
        <h2>Jogo em pausa</h2>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => { audio.sfxClick(); onResume(); }}>
            ▶ Continuar
          </button>
          <button className="btn btn-ghost" onClick={() => { audio.sfxClick(); onRestart(); }}>
            ↻ Reiniciar fase
          </button>
          <button className="btn btn-ghost" onClick={() => { audio.sfxClick(); onQuit(); }}>
            ← Sair para o mapa
          </button>
        </div>
        <p className="footnote">ESC ou P para continuar</p>
      </div>
    </div>
  );
}
