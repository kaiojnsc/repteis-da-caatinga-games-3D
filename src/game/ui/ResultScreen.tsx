import { useGame } from "../state/gameStore";
import { animals } from "../data/animals";
import { allPhasesDone } from "../state/progress";
import { audio } from "../engine/AudioEngine";

export function ResultScreen() {
  const { state, dispatch } = useGame();
  const r = state.lastResult;
  if (!r) return null;
  const animal = animals.find((a) => a.id === r.phase)!;
  const finished = allPhasesDone(state.progress);
  return (
    <div className="overlay modal-backdrop">
      <div className="xilo-card modal-card result-card">
        <p className="kicker">FASE {r.phase} CONCLUÍDA</p>
        <h2>{animal.nome}</h2>
        <div className="stars" aria-label={`${r.stars} de 5 estrelas`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`star ${i <= r.stars ? "is-on" : ""}`} style={{ animationDelay: `${i * 0.2}s` }}>★</span>
          ))}
        </div>
        <p className="result-score">{r.score} pontos</p>
        <div className="curiosidade">
          <p className="kicker">CURIOSIDADE DESBLOQUEADA</p>
          <p>{animal.curiosidade}</p>
        </div>
        <div className="actions">
          {r.phase === 3 && (
            <button
              className="btn btn-primary"
              onClick={() => { audio.sfxWin(); dispatch({ type: "GO_GAME_COMPLETE" }); }}
              aria-label="Ver pontuação final da jornada"
            >
              🏆 Ver Pontuação Final
            </button>
          )}
          {r.phase !== 3 && (
            <button className="btn btn-ghost" onClick={() => dispatch({ type: "GO_MAP" })}>Voltar ao mapa</button>
          )}
          <button className="btn btn-ghost" onClick={() => dispatch({ type: "START_PHASE", phase: r.phase })}>Reiniciar</button>
        </div>
      </div>
    </div>
  );
}
