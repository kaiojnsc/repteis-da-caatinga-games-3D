type Props = {
  score: number;
  length: number;
  timeElapsed: number;
  onPause: () => void;
  onQuit: () => void;
};

export function Phase1HUD({ score, length, timeElapsed, onPause, onQuit }: Props) {
  const pct = Math.max(0, Math.min(1, timeElapsed / 300));
  const mins = Math.floor(timeElapsed / 60);
  const secs = Math.floor(timeElapsed % 60).toString().padStart(2, '0');
  return (
    <div className="overlay phase-hud">
      <div className="hud-top">
        <div className="hud-actions">
          <button className="btn btn-ghost small" onClick={onQuit}>← Sair</button>
          <button className="btn btn-ghost small hud-pause" onClick={onPause} aria-label="Pausar">⏸</button>
        </div>
        <div className="hud-timer">
          tempo <strong>{mins}:{secs}</strong>
        </div>
        <div className="hud-score">
          <span>tam <strong>{length}</strong></span>
          <span><strong>{score}</strong> pts</span>
        </div>
      </div>
      <div className="time-bar"><div className="time-bar-fill" style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
}
