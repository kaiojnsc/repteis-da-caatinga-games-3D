import { useGame } from "../state/gameStore";
import { useProgress } from "../../hooks/useProgress";

export function MapHud({ hover }: { hover: { id: number; x: number; y: number; name: string } | null }) {
  const { dispatch } = useGame();
  const { allComplete } = useProgress();
  return (
    <div className="overlay map-overlay">
      <header className="topbar">
        <button className="btn btn-ghost small" onClick={() => dispatch({ type: "GO_MENU" })}>← Menu</button>
        <h2>Mapa do Museu</h2>
        <span className="hint">Clique em um recinto</span>
      </header>
      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y - 40,
            transform: "translate(-50%, -100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "auto",
            zIndex: 20
          }}
        >
          <div className="recinto-label" style={{ position: "relative", left: 0, top: 0, transform: "none" }}>
            {hover.name}
          </div>
          <button
            className="btn btn-primary small"
            style={{ fontSize: "10px", padding: "8px 16px", boxShadow: "0 4px 0 #8B5A2B" }}
            onClick={() => {
              const key = (`animal${hover.id}`) as "animal1" | "animal2" | "animal3";
              dispatch({ type: "OPEN_MODAL", modal: key, animal: hover.id as 1 | 2 | 3 });
            }}
          >
            JOGAR
          </button>
        </div>
      )}
      {!allComplete() && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            background: "rgba(13, 5, 0, 0.88)",
            borderTop: "1px solid #D4A843",
            color: "#F5E6C8",
            fontFamily: "'Press Start 2P', cursive, sans-serif",
            fontSize: "10px",
            padding: "10px 24px",
            textAlign: "center",
            zIndex: 10,
            pointerEvents: "none",
            boxSizing: "border-box",
            lineHeight: "1.4"
          }}
        >
          🏆 Complete as 3 fases para pontuar e gravar seu nome no ranking do museu
        </div>
      )}
    </div>
  );
}
