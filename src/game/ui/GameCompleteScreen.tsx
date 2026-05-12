import { useMemo, useState } from "react";
import { useGame } from "../state/gameStore";
import { totalScore, resetProgress } from "../state/progress";
import { useRanking } from "../hooks/useRanking";
import { useProgress } from "../../hooks/useProgress";
import { audio } from "../engine/AudioEngine";

const CONFETTI_COLORS = ["#D4A843", "#F5E6C8", "#3A6B20", "#FF4500", "#2A1400"];

function Confetti() {
  // 60 confetes posicionados deterministicamente para evitar mismatch de SSR.
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const left = (i * 17.3) % 100;
        const delay = (i % 12) * 0.18;
        const duration = 3 + ((i * 0.31) % 2.5);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const rot = (i * 47) % 360;
        return { left, delay, duration, color, rot, key: i };
      }),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function GameCompleteScreen() {
  const { state, dispatch } = useGame();
  const { resetProgress: resetProgressHook, getTotalScore } = useProgress();
  const total = getTotalScore();
  const { top5, save } = useRanking();
  const [nome, setNome] = useState("");
  const [saved, setSaved] = useState<{ nome: string; data: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const data = useMemo(() => new Date().toLocaleDateString("pt-BR"), []);

  const handleSave = () => {
    audio.sfxClick();
    const e = save(nome, total);
    setSaved({ nome: e.nome, data: e.data });
  };

  const handleShare = async () => {
    audio.sfxClick();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(200); } catch { /* ignore */ }
    }
    const shareText = `🐍 Fui explorador do Museu Vivo Répteis da Caatinga!
Fiz ${total} pontos na jornada educativa.
Conheça: puxinana.pb.gov.br/museuvivo
#RépteisDaCaatinga #MuseuVivo #Puxinanã`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Guardião da Caatinga", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setToast("Texto copiado! Cole no WhatsApp 💬");
        setTimeout(() => setToast(null), 2500);
      }
    } catch {
      /* usuário cancelou */
    }
  };

  const handlePrint = () => {
    audio.sfxClick();
    if (typeof window !== "undefined") window.print();
  };

  const nomeFinal = saved?.nome || nome.trim() || "Explorador(a)";

  return (
    <div className="overlay game-complete">
      <Confetti />

      <div className="gc-scroll">
        {/* Seção 1 — Celebração */}
        <section className="xilo-card gc-card">
          <h1 className="gc-title">Parabéns, Guardião da Caatinga! 🌵</h1>
          <div className="gc-cordel">
            <p>Você explorou o Museu Vivo</p>
            <p>E aprendeu com muito amor</p>
            <p>Juquinha, o Dragão e o Jacaré</p>
            <p>Agradecem ao explorador!</p>
          </div>
          <p className="gc-sign">— Silvaney Medeiros, guardião do Museu Vivo de Puxinanã</p>
        </section>

        {/* Seção 2 — Pontuação e Ranking */}
        <section className="xilo-card gc-card">
          <p className="kicker">PONTUAÇÃO TOTAL</p>
          <p className="gc-score">{total} pts</p>

          {!saved ? (
            <div className="gc-form">
              <label htmlFor="gc-nome">Seu nome no ranking</label>
              <input
                id="gc-nome"
                type="text"
                maxLength={20}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome"
                aria-label="Nome do jogador para o ranking"
              />
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!nome.trim()}
                aria-label="Salvar pontuação no ranking"
              >
                Salvar no Ranking
              </button>
            </div>
          ) : (
            <p className="gc-saved">✅ Salvo como <strong>{saved.nome}</strong></p>
          )}

          <h3 className="gc-subtitle">Top 5</h3>
          {top5.length === 0 ? (
            <p className="gc-empty">Ainda não há pontuações registradas.</p>
          ) : (
            <table className="gc-table">
              <thead>
                <tr><th>#</th><th>Nome</th><th>Pontos</th><th>Data</th></tr>
              </thead>
              <tbody>
                {top5.map((e, i) => (
                  <tr key={`${e.nome}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{e.nome}</td>
                    <td>{e.pontuacao}</td>
                    <td>{e.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Seção 3 — Certificado */}
        <section className="xilo-card gc-card">
          <p className="kicker">CERTIFICADO</p>
          <div id="certificado" className="certificado">
            <header>MUSEU VIVO RÉPTEIS DA CAATINGA</header>
            <div className="cert-emojis" aria-hidden>🐍 🦎 🐊</div>
            <p>Certificamos que</p>
            <p className="cert-nome">{nomeFinal}</p>
            <p>completou a jornada educativa e se tornou</p>
            <p className="cert-titulo">GUARDIÃO DA CAATINGA</p>
            <div className="cert-meta">
              <p>Pontuação Final: <strong>{total} pts</strong></p>
              <p>Data: <strong>{data}</strong></p>
              <p>Puxinanã — Paraíba — Brasil</p>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={handlePrint} aria-label="Salvar certificado em PDF">
              📄 Salvar como PDF
            </button>
          </div>
        </section>

        {/* Seção 4 — Compartilhar */}
        <section className="xilo-card gc-card">
          <p className="kicker">COMPARTILHE A CONQUISTA</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={handleShare} aria-label="Compartilhar no WhatsApp">
              📲 Compartilhar no WhatsApp
            </button>
          </div>
          {toast && <p className="gc-toast" role="status">{toast}</p>}
        </section>

        {/* Seção 5 — Hotsite */}
        <section className="xilo-card gc-card gc-hotsite">
          <p>🏛️ <strong>Museu Vivo Répteis da Caatinga</strong></p>
          <p>📍 Sítio em Puxinanã, Agreste Paraibano — PB</p>
          <p>📸 @repteis_da_caatinga</p>
          <a className="btn btn-ghost" href="/" aria-label="Acessar site institucional">
            🌐 Acessar Site Institucional
          </a>
          <p className="gc-quote">
            “Primeiro e único zoológico particular de Répteis do Nordeste”
          </p>
        </section>

        <div className="actions gc-footer-actions" style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
          <button 
            className="btn gc-back-btn"
            style={{ 
              border: "2px solid #D4A843", 
              backgroundColor: "transparent", 
              color: "#D4A843",
              fontWeight: "bold",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
            onClick={() => {
              dispatch({ type: "GO_MENU" });
              // Chama a cena do Phaser caso o jogo esteja no objeto global window.game ou window.phaserGame
              const game = (window as any).phaserGame || (window as any).game;
              if (game && game.scene) {
                game.scene.start("MenuScene");
              }
            }}
            aria-label="Voltar ao menu inicial"
          >
            ← Voltar ao Menu
          </button>
          <button 
            className="btn gc-replay-btn"
            style={{ 
              backgroundColor: "#D4A843", 
              color: "#1E1E1E",
              border: "none",
              fontWeight: "bold",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
            onClick={() => {
              audio.sfxClick();
              resetProgressHook();
              const newProgress = resetProgress();
              dispatch({ type: "RESET_PROGRESS", progress: newProgress });
            }}
            aria-label="Jogar novamente"
          >
            🔄 Jogar de Novo
          </button>
        </div>
      </div>
    </div>
  );
}
