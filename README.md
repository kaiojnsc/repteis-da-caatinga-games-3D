# Répteis da Caatinga (Caatinga Alive)

Um jogo educacional 3D focado em ensinar sobre os répteis do bioma Caatinga através de diferentes mecânicas de gameplay, cultura nordestina (Cordel) e interatividade.

## 🎮 O Jogo

O projeto é dividido em três fases distintas, cada uma com mecânicas únicas focadas na sobrevivência e características de animais da Caatinga:

*   **Fase 1: Snake 3D** - Uma versão em três dimensões do clássico jogo da cobrinha. Colete itens para crescer e pontuar.
*   **Fase 2: Plataforma 3D** - Controle um personagem em um ambiente de plataforma, desviando de obstáculos, pulando e chegando ao objetivo.
*   **Fase 3: Sobrevivência na Água** - Uma fase aquática focada em coletar peixes e sobreviver aos perigos do ambiente.

### Recursos Principais
*   **Cultura Regional:** As instruções e histórias do jogo são contadas através de Literatura de Cordel.
*   **Acessibilidade:** Suporte a Text-to-Speech (TTS) para narração do Cordel e informações dos animais.
*   **Multiplataforma:** Controles adaptativos que suportam teclado para desktop e controles virtuais na tela (D-Pad, Jump Pad) para dispositivos móveis em modo paisagem.
*   **Sistema de Progressão:** Salva seu progresso localmente. Termine as fases ganhando de 1 a 5 estrelas baseado no seu tempo de sobrevivência e pontuação.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando um stack moderno de desenvolvimento web:

*   **[React 19](https://react.dev/)** - Biblioteca principal para a interface de usuário.
*   **[Three.js](https://threejs.org/)** - Motor 3D utilizado para renderizar todas as fases do jogo.
*   **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática para garantir maior segurança e qualidade do código.
*   **[Vite](https://vitejs.dev/)** - Bundler ultrarrápido para desenvolvimento.
*   **[Tailwind CSS v4](https://tailwindcss.com/)** - Framework de utilitários CSS para estilização ágil.
*   **Componentes UI:** [Radix UI](https://www.radix-ui.com/) e ícones com [Lucide React](https://lucide.dev/).
*   **Estado:** Gerenciamento de estado otimizado com Context API e Hooks customizados (`gameStore`, `useProgress`).

## 🚀 Como Executar o Projeto

### Pré-requisitos
*   [Node.js](https://nodejs.org/) (versão 18+ recomendada)
*   Gerenciador de pacotes (`npm`, `yarn`, `pnpm` ou `bun`)

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/caatinga-alive.git
   cd caatinga-alive
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra o navegador em `http://localhost:5173` (ou na porta indicada no terminal).

## 📦 Scripts Disponíveis

*   `npm run dev`: Inicia o servidor local de desenvolvimento usando Vite.
*   `npm run build`: Compila o projeto para produção.
*   `npm run preview`: Visualiza o build de produção localmente.
*   `npm run lint`: Executa o ESLint para encontrar problemas no código.
*   `npm run format`: Formata os arquivos utilizando o Prettier.

## 📂 Estrutura do Projeto

A lógica principal do jogo fica dentro da pasta `src/game/`:

*   `/data`: Textos em cordel e informações sobre os animais.
*   `/engine`: Classes core do jogo (Gerenciador do Three.js, Áudio e Text-to-Speech).
*   `/scenes`: As lógicas 3D de cada fase (`MenuScene3D`, `MapScene3D`, `Phase1Snake3D`, etc).
*   `/state`: Gerenciamento global de progresso e informações da sessão atual.
*   `/ui`: Componentes React sobrepostos ao canvas 3D (HUDs, Modais de Animais, Controles Mobile, Cordel).

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se livre para usá-lo e modificá-lo.
