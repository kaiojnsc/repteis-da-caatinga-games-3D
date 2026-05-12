import { useGame } from "../state/gameStore";

export function AboutModal() {
  const { state, dispatch } = useGame();
  if (state.modal !== "about") return null;
  return (
    <div className="overlay modal-backdrop" onClick={() => dispatch({ type: "CLOSE_MODAL" })}>
      <div className="xilo-card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Sobre o Museu</h2>
        <p>
          O <strong>Museu Vivo Répteis da Caatinga</strong> fica em Puxinanã, na Paraíba. É um espaço
          educativo dedicado à conservação e ao estudo dos répteis, recebendo escolas e visitantes
          para conhecer animais resgatados, manejados legalmente, e aprender sobre a fauna do sertão.
        </p>
        <p>
          Este jogo é um passeio interativo pelo museu: explore os recintos, conheça os animais e
          jogue mini-fases inspiradas em cada um deles.
        </p>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => dispatch({ type: "CLOSE_MODAL" })}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
