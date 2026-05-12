import { useGame } from "../state/gameStore";
import { audio } from "../engine/AudioEngine";
import { CordelLines } from "./CordelLines";
import { cordel } from "../data/animals";

export function MenuOverlay() {
  const { dispatch } = useGame();
  const onPlay = () => {
    audio.init();
    audio.resume();
    audio.startMusic();
    audio.sfxClick();
    dispatch({ type: "GO_MAP" });
  };
  return (
    <div className="overlay menu-overlay">
      <div className="xilo-card menu-card">
        <p className="kicker">MUSEU VIVO</p>
        <h1 className="title">RÉPTEIS DA CAATINGA</h1>
        <p className="subtitle">— O Museu Vivo —</p>
        <CordelLines lines={cordel.menu} className="menu-cordel" />
        <div className="actions">
          <button className="btn btn-primary" onClick={onPlay}>JOGAR</button>
          <button
            className="btn btn-ghost"
            onClick={() => { audio.init(); audio.sfxClick(); dispatch({ type: "OPEN_MODAL", modal: "about" }); }}
          >
            SOBRE O MUSEU
          </button>
        </div>
        <p className="footnote">Puxinanã / PB</p>
      </div>
    </div>
  );
}
