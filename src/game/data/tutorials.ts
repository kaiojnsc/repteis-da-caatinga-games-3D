export type TutorialContent = {
  title: string;
  goal: string;
  controlsDesktop: string[];
  controlsTouch: string[];
  tips: string[];
};

export const tutorials: Record<1 | 2 | 3, TutorialContent> = {
  1: {
    title: "Fase 1 — Juquinha",
    goal: "Coma os ovos para crescer. Não bata nos mandacarus, nas paredes nem em si mesmo.",
    controlsDesktop: ["Setas ou WASD para virar"],
    controlsTouch: ["Use o D-pad na tela para virar"],
    tips: ["A cada ovo você fica mais rápido", "60 segundos no relógio"],
  },
  2: {
    title: "Fase 2 — Dragão Barbudo",
    goal: "Pule pelas pedras até a placa do museu, fugindo dos escorpiões.",
    controlsDesktop: ["A/D ou ← → para correr", "Espaço, W ou ↑ para pular"],
    controlsTouch: ["Toque ◀ ▶ para correr", "Botão amarelo para pular"],
    tips: ["Coletar grilos vale pontos", "Não caia das plataformas"],
  },
  3: {
    title: "Fase 3 — Jacaré do Açude",
    goal: "Nade até o Açude Velho desviando de pilares, barcos e lixo.",
    controlsDesktop: ["WASD ou setas para nadar"],
    controlsTouch: ["Use o D-pad para nadar"],
    tips: ["Cada peixe vale +15 pontos", "A correnteza empurra para frente"],
  },
};
