import { useGame } from "../state/gameStore";
import { animals } from "../data/animals";
import { useState, useEffect } from "react";
import { audio } from "../engine/AudioEngine";
import { tts } from "../engine/tts";
import { useProgress } from "../../hooks/useProgress";

export function AnimalCard() {
  const { state, dispatch } = useGame();
  const { isUnlocked, isLoading } = useProgress();
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const id = state.modal === "animal1" ? 1 : state.modal === "animal2" ? 2 : state.modal === "animal3" ? 3 : null;

  useEffect(() => () => { tts.cancel(); setSpeaking(false); }, [id]);

  if (!id) return null;
  const a = animals.find((x) => x.id === id)!;
  const isPhaseUnlocked = isUnlocked(id);
  
  const close = () => { tts.cancel(); setSpeaking(false); setExpanded(false); dispatch({ type: "CLOSE_MODAL" }); };
  const play = () => {
    audio.sfxClick();
    tts.cancel();
    setExpanded(false);
    dispatch({ type: "START_PHASE", phase: id });
  };
  const speak = () => {
    if (speaking) {
      tts.cancel();
      setSpeaking(false);
      return;
    }
    const text = `${a.nome}. Nome científico: ${a.cientifico}. Tamanho: ${a.tamanho}. Habitat: ${a.habitat}. Alimentação: ${a.alimentacao}. Curiosidade: ${a.curiosidade}. ${expanded ? a.extra : ""}`;
    tts.speak(text);
    setSpeaking(true);
    // Best-effort end detection.
    if ("speechSynthesis" in window) {
      const check = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          clearInterval(check);
        }
      }, 400);
    }
  };
  return (
    <div className="overlay modal-backdrop" onClick={close}>
      <div className="xilo-card modal-card animal-card" onClick={(e) => e.stopPropagation()}>
        <div className="animal-header" style={{ borderColor: a.cor }}>
          <h2>{a.nome}</h2>
          <p className="sci">{a.cientifico}</p>
        </div>
        <dl className="animal-fields">
          <div><dt>Tamanho</dt><dd>{a.tamanho}</dd></div>
          <div><dt>Habitat</dt><dd>{a.habitat}</dd></div>
          <div><dt>Alimentação</dt><dd>{a.alimentacao}</dd></div>
          <div><dt>Curiosidade</dt><dd>{a.curiosidade}</dd></div>
          <div><dt>Status (IBAMA / IUCN)</dt><dd>{a.status}</dd></div>
        </dl>
        {expanded && <p className="animal-extra">{a.extra}</p>}
        {!isPhaseUnlocked && <p className="phase-locked">🔒 Complete a fase anterior</p>}
        <div className="actions">
          <button className="btn btn-primary" onClick={play} disabled={!isPhaseUnlocked || isLoading}>
            {!isPhaseUnlocked ? "🔒 Bloqueado" : "JOGAR AGORA ↗"}
          </button>
          {tts.isSupported() && (
            <button className="btn btn-ghost" onClick={speak} aria-pressed={speaking}>
              {speaking ? "⏹ Parar" : "🔊 Ouvir"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ver menos" : "Ver mais"}
          </button>
          <button className="btn btn-ghost" onClick={close}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
