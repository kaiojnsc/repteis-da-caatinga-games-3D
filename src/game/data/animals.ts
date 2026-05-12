export type Animal = {
  id: 1 | 2 | 3;
  nome: string;
  cientifico: string;
  tamanho: string;
  habitat: string;
  alimentacao: string;
  curiosidade: string;
  status: string;
  extra: string;
  cor: string; // hex for UI accents
};

export const animals: Animal[] = [
  {
    id: 1,
    nome: "Juquinha (Píton Albina)",
    cientifico: "Python bivittatus (forma albina)",
    tamanho: "Pode ultrapassar 4 metros",
    habitat: "Originária do sudeste asiático; hoje vive no museu",
    alimentacao: "Carnívora — roedores e aves",
    curiosidade: "É albina: não produz melanina, por isso é branca com manchas amarelas.",
    status: "Vulnerável (IUCN) — manejo legal pelo IBAMA",
    extra:
      "Juquinha é a estrela do Museu Vivo. Apesar do tamanho, é dócil e usada em ações educativas para desfazer mitos sobre as serpentes.",
    cor: "#F5E6C8",
  },
  {
    id: 2,
    nome: "Dragão Barbudo",
    cientifico: "Pogona vitticeps",
    tamanho: "40 a 60 cm",
    habitat: "Desertos e regiões áridas da Austrália",
    alimentacao: "Onívoro — insetos, folhas e flores",
    curiosidade: "Quando se sente ameaçado, infla a 'barba' sob o queixo, que escurece como aviso.",
    status: "Pouco preocupante (IUCN)",
    extra:
      "É um dos répteis mais populares do mundo no convívio humano. No museu, ajuda a contar a história da fauna desértica global.",
    cor: "#C9A26A",
  },
  {
    id: 3,
    nome: "Jacaré-de-papo-amarelo",
    cientifico: "Caiman latirostris",
    tamanho: "Até 2 metros",
    habitat: "Rios, lagoas e açudes do Brasil",
    alimentacao: "Carnívoro — peixes, caramujos, aves",
    curiosidade: "Foi resgatado no Açude Velho, em Campina Grande, por Silvaney, e hoje vive em Puxinanã.",
    status: "Pouco preocupante (IUCN) — protegido por lei no Brasil",
    extra:
      "Sua presença no museu é símbolo de educação ambiental: mostra como a fauna silvestre acaba parando em ambientes urbanos.",
    cor: "#4A7C2F",
  },
];

export const cordel = {
  menu: [
    "No sertão da Paraíba",
    "Existe um museu especial",
    "Onde vivem os répteis",
    "Num cantinho sem igual",
  ],
  fase1: [
    "Juquinha é uma cobra",
    "Que não faz maldade não",
    "Ela come sua ração",
    "Com alegria no coração",
  ],
  fase2: [
    "O Dragão Barbudo é um lagarto vaidoso",
    "Que veio lá da Austrália, bem orgulhoso",
    "Mas agora mora aqui no museu tão famoso",
    "Saltando pelas pedras do sertão pedregoso",
  ],
  fase3: [
    "No Açude Velho havia um jacaré",
    "Que ninguém sabia de onde vinha",
    "Foi parar no museu de Puxinanã",
    "Onde Silvaney dele se ocupava e cuidava",
  ],
};
