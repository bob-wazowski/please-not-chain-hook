import { createContext, useContext } from "react";
import type { AppState, GameState, Game, Result } from "../core/types";
export interface Context {
  state: AppState;
  game: Game;
  local: GameState;
  update: (fn: (s: AppState) => AppState) => void;
  updateLocal: (fn: (s: GameState) => GameState) => void;
  notify: (message: string) => void;
  share: (result: Result) => void;
}
export const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
