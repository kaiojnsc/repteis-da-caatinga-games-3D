import { createContext, useContext, useReducer, type Dispatch, type ReactNode, createElement } from "react";
import { loadProgress, type Progress } from "./progress";

export type AppState = "MENU" | "MAPA" | "FASE1" | "FASE2" | "FASE3" | "RESULTADO" | "GAME_COMPLETE";
export type ModalKey = "about" | "animal1" | "animal2" | "animal3" | "cordel1" | "cordel2" | "cordel3" | null;

export type State = {
  app: AppState;
  modal: ModalKey;
  selectedAnimal: 1 | 2 | 3 | null;
  lastResult: { phase: 1 | 2 | 3; stars: number; score: number } | null;
  progress: Progress;
};

export type Action =
  | { type: "GO_MENU" }
  | { type: "GO_MAP" }
  | { type: "OPEN_MODAL"; modal: ModalKey; animal?: 1 | 2 | 3 }
  | { type: "CLOSE_MODAL" }
  | { type: "START_PHASE"; phase: 1 | 2 | 3 }
  | { type: "FINISH_PHASE"; phase: 1 | 2 | 3; stars: number; score: number; progress: Progress }
  | { type: "GO_GAME_COMPLETE" }
  | { type: "TOGGLE_MUTE"; progress: Progress }
  | { type: "RESET_PROGRESS"; progress: Progress };

const initialState: State = {
  app: "MENU",
  modal: null,
  selectedAnimal: null,
  lastResult: null,
  progress: loadProgress(),
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GO_MENU":
      return { ...state, app: "MENU", modal: null, selectedAnimal: null };
    case "GO_MAP":
      return { ...state, app: "MAPA", modal: null, selectedAnimal: null, lastResult: null };
    case "OPEN_MODAL":
      return { ...state, modal: action.modal, selectedAnimal: action.animal ?? state.selectedAnimal };
    case "CLOSE_MODAL":
      return { ...state, modal: null };
    case "START_PHASE":
      return { ...state, app: (`FASE${action.phase}`) as AppState, modal: null };
    case "FINISH_PHASE":
      return {
        ...state,
        app: "RESULTADO",
        modal: null,
        lastResult: { phase: action.phase, stars: action.stars, score: action.score },
        progress: action.progress,
      };
    case "GO_GAME_COMPLETE":
      return { ...state, app: "GAME_COMPLETE", modal: null };
    case "TOGGLE_MUTE":
      return { ...state, progress: action.progress };
    case "RESET_PROGRESS":
      return { ...state, app: "MAPA", modal: null, selectedAnimal: null, lastResult: null, progress: action.progress };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return createElement(Ctx.Provider, { value: { state, dispatch } }, children);
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame outside provider");
  return v;
}
