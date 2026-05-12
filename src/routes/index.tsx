import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/game/GameApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Répteis da Caatinga — O Museu Vivo | Jogo 3D educativo" },
      {
        name: "description",
        content:
          "Jogo 3D educativo do Museu Vivo Répteis da Caatinga, em Puxinanã/PB. Explore o museu, conheça os répteis e jogue mini-fases inspiradas neles.",
      },
      { property: "og:title", content: "Répteis da Caatinga — O Museu Vivo" },
      { property: "og:description", content: "Jogo 3D educativo sobre os répteis do sertão da Paraíba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <GameApp />;
}
