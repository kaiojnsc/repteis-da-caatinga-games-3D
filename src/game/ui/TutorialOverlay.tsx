import { useEffect, useState } from "react";
import { tutorials } from "../data/tutorials";
import { audio } from "../engine/AudioEngine";

type Props = {
  phase: 1 | 2 | 3;
  touch: boolean;
  onStart: () => void;
};

export function TutorialOverlay({ phase, touch, onStart }: Props) {
  const t = tutorials[phase];
  const [isCounting, setIsCounting] = useState(false);
  const [count, setCount] = useState<string | null>(null);
  const STEPS = ['3', '2', '1', 'JÁ!'];

  useEffect(() => {
    if (!isCounting) return;

    setCount(STEPS[0]);
    audio.sfxClick();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCount(STEPS[step]);
        audio.sfxClick();
      } else {
        clearInterval(interval);
        onStart();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCounting, onStart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isCounting && (e.key === " " || e.key === "Enter")) {
        audio.ensureResumed();
        setIsCounting(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCounting]);

  return (
    <div className="overlay modal-backdrop">
      {!isCounting ? (
        <div className="xilo-card modal-card tutorial-card">
          <p className="kicker">COMO JOGAR</p>
          <h2>{t.title}</h2>
          <p className="tutorial-goal">{t.goal}</p>
          <div className="tutorial-section">
            <h3>Controles</h3>
            <ul>
              {(touch ? t.controlsTouch : t.controlsDesktop).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="tutorial-section">
            <h3>Dicas</h3>
            <ul>
              {t.tips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => {
              audio.ensureResumed();
              setIsCounting(true);
            }}>
              Estou pronto!
            </button>
          </div>
          <p className="footnote">Espaço / Enter</p>
        </div>
      ) : (
        <div className="countdown-wrap" aria-live="polite">
          <div key={count} className={`countdown-num ${count === "JÁ!" ? "go" : ""}`}>
            {count}
          </div>
        </div>
      )}
    </div>
  );
}
