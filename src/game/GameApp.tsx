import { useEffect, useRef, useState, useCallback } from "react";
import { GameProvider, useGame } from "./state/gameStore";
import { ThreeCanvas } from "./engine/ThreeCanvas";
import type { IScene } from "./engine/types";
import { MenuScene3D } from "./scenes/MenuScene3D";
import { MapScene3D } from "./scenes/MapScene3D";
import { Phase1Snake3D } from "./scenes/Phase1Snake3D";
import { Phase2Platform3D, PHASE2_GOAL } from "./scenes/Phase2Platform3D";
import { Phase3Water3D, PHASE3_GOAL } from "./scenes/Phase3Water3D";
import { MenuOverlay } from "./ui/MenuOverlay";
import { AboutModal } from "./ui/AboutModal";
import { AnimalCard } from "./ui/AnimalCard";
import { MapHud } from "./ui/MapHud";
import { Phase1HUD } from "./ui/Phase1HUD";
import { Phase2HUD } from "./ui/Phase2HUD";
import { Phase3HUD } from "./ui/Phase3HUD";
import { CordelIntro } from "./ui/CordelIntro";
import { ResultScreen } from "./ui/ResultScreen";
import { DPad } from "./ui/DPad";
import { JumpPad } from "./ui/JumpPad";
import { Phase3Pad } from "./ui/Phase3Pad";
import { TutorialOverlay } from "./ui/TutorialOverlay";
import { PauseOverlay } from "./ui/PauseOverlay";
import { OrientationWarning } from "./ui/OrientationWarning";
import { audio } from "./engine/AudioEngine";
import { tts } from "./engine/tts";
import { cordel } from "./data/animals";
import { recordPhase, saveProgress } from "./state/progress";
import { GameCompleteScreen } from "./ui/GameCompleteScreen";
import { useProgress } from "../hooks/useProgress";

function getViewport() {
  if (typeof window === "undefined") return { w: 1024, h: 768 };
  return { w: window.innerWidth, h: window.innerHeight };
}

type Phase = 1 | 2 | 3;
type Stage = "cordel" | "tutorial" | "playing";

function Inner() {
  const { state, dispatch } = useGame();
  const { completePhase } = useProgress();
  const sceneRef = useRef<IScene | null>(null);
  const [hover, setHover] = useState<{ id: number; x: number; y: number; name: string } | null>(null);
  const [hud, setHud] = useState({ score: 0, length: 3, timeElapsed: 0 });
  const [hud2, setHud2] = useState({ score: 0, distance: 0, timeElapsed: 0 });
  const [hud3, setHud3] = useState({ score: 0, fish: 0, distance: 0, timeElapsed: 0 });
  const [stage, setStage] = useState<Stage>("cordel");
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const phase1Ref = useRef<Phase1Snake3D | null>(null);
  const phase2Ref = useRef<Phase2Platform3D | null>(null);
  const phase3Ref = useRef<Phase3Water3D | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setTouch(window.matchMedia("(pointer: coarse)").matches);
    
    const onFirstClick = async () => {
      audio.ensureResumed();
      try {
        const orientation = screen.orientation as any;
        if (orientation?.lock) {
          await orientation.lock('landscape');
        }
      } catch (_) {
        // Ignora, navegadores como iOS Safari não suportam
      }
    };
    document.addEventListener("click", onFirstClick, { once: true });
    return () => document.removeEventListener("click", onFirstClick);
  }, []);

  const currentScene = (): { scene: { paused: boolean } | null } => {
    if (state.app === "FASE1") return { scene: phase1Ref.current };
    if (state.app === "FASE2") return { scene: phase2Ref.current };
    if (state.app === "FASE3") return { scene: phase3Ref.current };
    return { scene: null };
  };

  // Build / dispose scene on app state change or restart.
  useEffect(() => {
    const { w, h } = getViewport();
    const old = sceneRef.current;
    let next: IScene | null = null;

    if (state.app === "MENU") {
      next = new MenuScene3D(w, h);
    } else if (state.app === "MAPA") {
      const completed = {
        1: !!state.progress.fase1,
        2: !!state.progress.fase2,
        3: !!state.progress.fase3,
      };
      const m = new MapScene3D(w, h, completed);
      m.onHoverChange = (id, screen, name) => {
        if (id && screen && name) setHover({ id, x: screen.x, y: screen.y, name });
        else setHover(null);
      };
      m.onSelect = (id) => {
        audio.sfxClick();
        const key = (`animal${id}`) as "animal1" | "animal2" | "animal3";
        dispatch({ type: "OPEN_MODAL", modal: key, animal: id });
      };
      next = m;
    } else if (state.app === "FASE1") {
      audio.stopMusic();
      const p1 = new Phase1Snake3D(w, h);
      phase1Ref.current = p1;
      p1.onHud = (s) => setHud(s);
      p1.onEnd = (r) => {
        audio.stopMusic();
        let stars = 1;
        if (r.timeElapsed >= 240) stars = 5;
        else if (r.timeElapsed >= 180) stars = 4;
        else if (r.score >= 180) stars = 3;
        else if (r.score >= 100) stars = 2;
        
        const prog = recordPhase(1, stars, r.score);
        completePhase(1, r.score);
        setTimeout(() => dispatch({ type: "FINISH_PHASE", phase: 1, stars, score: r.score, progress: prog }), 800);
      };
      setHud({ score: 0, length: 3, timeElapsed: 0 });
      setStage("cordel");
      setPaused(false);
      next = p1;
    } else if (state.app === "FASE2") {
      audio.stopMusic();
      const p2 = new Phase2Platform3D(w, h);
      phase2Ref.current = p2;
      p2.onHud = (s) => setHud2(s);
      p2.onEnd = (r) => {
        audio.stopMusic();
        let stars = 1;
        if (r.timeElapsed >= 240) stars = 5;
        else if (r.timeElapsed >= 180) stars = 4;
        else if (r.score >= 220) stars = 3;
        else if (r.score >= 160) stars = 2;

        const prog = recordPhase(2, stars, r.score);
        completePhase(2, r.score);
        setTimeout(() => dispatch({ type: "FINISH_PHASE", phase: 2, stars, score: r.score, progress: prog }), 800);
      };
      setHud2({ score: 0, distance: 0, timeElapsed: 0 });
      setStage("cordel");
      setPaused(false);
      next = p2;
    } else if (state.app === "FASE3") {
      audio.stopMusic();
      const p3 = new Phase3Water3D(w, h);
      phase3Ref.current = p3;
      p3.onHud = (s) => setHud3(s);
      p3.onEnd = (r) => {
        audio.stopMusic();
        let stars = 1;
        if (r.timeElapsed >= 240) stars = 5;
        else if (r.timeElapsed >= 180) stars = 4;
        else if (r.score >= 260) stars = 3;
        else if (r.score >= 180) stars = 2;

        const prog = recordPhase(3, stars, r.score);
        completePhase(3, r.score);
        setTimeout(() => dispatch({ type: "FINISH_PHASE", phase: 3, stars, score: r.score, progress: prog }), 800);
      };
      setHud3({ score: 0, fish: 0, distance: 0, timeElapsed: 0 });
      setStage("cordel");
      setPaused(false);
      next = p3;
    } else if (state.app === "RESULTADO" || state.app === "GAME_COMPLETE") {
      next = new MenuScene3D(w, h);
      audio.startMusic();
    }

    sceneRef.current = next;
    return () => {
      old?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.app, runId]);

  // Stop TTS when leaving phase or pausing.
  useEffect(() => {
    if (state.app !== "MAPA" && state.modal === null) tts.cancel();
  }, [state.app, state.modal]);

  const startPhase = useCallback(() => {
    audio.startMusic();
    setStage("playing");
    if (state.app === "FASE1") phase1Ref.current?.start();
    if (state.app === "FASE2") {
      phase2Ref.current?.start();
      completePhase(2, 0); // Garante que a Fase 3 já estará desbloqueada ao voltar
    }
    if (state.app === "FASE3") phase3Ref.current?.start();
  }, [state.app, completePhase]);

  // Apply pause to scene.
  useEffect(() => {
    const { scene } = currentScene();
    if (!scene) return;
    if (stage !== "playing") {
      scene.paused = true;
      return;
    }
    scene.paused = paused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, stage, state.app, runId]);

  // ESC / P toggles pause when playing.
  useEffect(() => {
    const isPhase = state.app === "FASE1" || state.app === "FASE2" || state.app === "FASE3";
    if (!isPhase || stage !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.app, stage]);

  const muted = state.progress.muted;
  useEffect(() => {
    audio.setMuted(muted);
    tts.setMuted(muted);
  }, [muted]);

  const toggleMute = () => {
    const next = { ...state.progress, muted: !muted };
    saveProgress(next);
    dispatch({ type: "TOGGLE_MUTE", progress: next });
  };

  const restartPhase = () => {
    setPaused(false);
    setRunId((r) => r + 1);
  };
  const quitToMap = () => {
    setPaused(false);
    tts.cancel();
    dispatch({ type: "GO_MAP" });
  };

  const renderPhaseFlow = (phase: Phase) => (
    <>
      {stage === "cordel" && (
        <CordelIntro
          lines={cordel[`fase${phase}` as "fase1" | "fase2" | "fase3"]}
          onContinue={() => { audio.sfxClick(); setStage("tutorial"); }}
        />
      )}
      {stage === "tutorial" && (
        <TutorialOverlay phase={phase} touch={touch} onStart={startPhase} />
      )}
      {stage === "playing" && paused && (
        <PauseOverlay
          onResume={() => setPaused(false)}
          onRestart={restartPhase}
          onQuit={quitToMap}
        />
      )}
    </>
  );

  return (
    <div className="game-root">
      <ThreeCanvas sceneRef={sceneRef} />

      <OrientationWarning />

      {state.app === "MENU" && <MenuOverlay />}
      {state.app === "MAPA" && <MapHud hover={hover} />}

      {state.app === "FASE1" && (
        <>
          {renderPhaseFlow(1)}
          {stage === "playing" && (
            <Phase1HUD
              score={hud.score}
              length={hud.length}
              timeElapsed={hud.timeElapsed}
              onPause={() => setPaused(true)}
              onQuit={quitToMap}
            />
          )}
          {stage === "playing" && touch && (
            <DPad onDir={(d) => phase1Ref.current?.setDirection(d)} />
          )}
        </>
      )}

      {state.app === "FASE2" && (
        <>
          {renderPhaseFlow(2)}
          {stage === "playing" && (
            <Phase2HUD
              score={hud2.score}
              distance={hud2.distance}
              timeElapsed={hud2.timeElapsed}
              goal={PHASE2_GOAL}
              onPause={() => setPaused(true)}
              onQuit={quitToMap}
            />
          )}
          {stage === "playing" && touch && (
            <JumpPad
              onJump={() => phase2Ref.current?.doJump()}
              onLeft={(v) => phase2Ref.current?.setHold("left", v)}
              onRight={(v) => phase2Ref.current?.setHold("right", v)}
            />
          )}
        </>
      )}

      {state.app === "FASE3" && (
        <>
          {renderPhaseFlow(3)}
          {stage === "playing" && (
            <Phase3HUD
              score={hud3.score}
              fish={hud3.fish}
              distance={hud3.distance}
              timeElapsed={hud3.timeElapsed}
              goal={PHASE3_GOAL}
              onPause={() => setPaused(true)}
              onQuit={quitToMap}
            />
          )}
          {stage === "playing" && touch && (
            <Phase3Pad onDir={(d) => phase3Ref.current?.setDirection(d)} />
          )}
        </>
      )}

      {state.app === "RESULTADO" && <ResultScreen />}
      {state.app === "GAME_COMPLETE" && <GameCompleteScreen />}

      <AboutModal />
      <AnimalCard />

      <button
        className="mute-btn"
        onClick={toggleMute}
        suppressHydrationWarning
        aria-label={muted ? "Ativar som" : "Silenciar"}
      >
        <span suppressHydrationWarning>{muted ? "🔇" : "🔊"}</span>
      </button>
    </div>
  );
}

export function GameApp() {
  return (
    <GameProvider>
      <Inner />
    </GameProvider>
  );
}
