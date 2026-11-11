export type GameId = "poe1" | "poe2" | "phrecia";
export type Playability = "main" | "conditional" | "support_only" | "excluded";
export interface Skill {
  id: string;
  name: string;
  archetypes: string[];
  damage: string[];
  kinds: string[];
  activation: string[];
  tags: string[];
  playability: Playability;
  variant: string;
  requirements: { strength: number; dexterity: number; intelligence: number };
  color?: "str" | "dex" | "int" | "all";
  wiki: string;
  custom?: boolean;
  family: string;
}
export interface Character {
  name: string;
  attributes: Skill["requirements"];
  ascendancies: string[];
}
export interface Game {
  id: GameId;
  name: string;
  catalog: string;
  classes: Character[];
  version?: string;
  available: boolean;
}
export interface Settings {
  allActive: boolean;
  compatibility: "strict" | "weighted" | "unrestricted";
  avoidRepeats: boolean;
  animation: "card-deck";
  cardCount: number;
  duration: number;
  skip: boolean;
  reduced: boolean;
  particles: boolean;
  sound: boolean;
}
export interface Override {
  enabled?: boolean;
  deleted?: boolean;
}
export interface Challenge {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  games: GameId[];
  conflicts: string[];
  custom?: boolean;
}
export const randomModes = [
  "Absolute Random",
  "Pick 1 of 3",
  "Skill Tournament",
] as const;
export type RandomMode = (typeof randomModes)[number];

export interface GameState {
  results?: Partial<Record<RandomMode, Result | null>>;
  classOverrides?: Record<
    string,
    { enabled?: boolean; ascendancies?: Record<string, boolean> }
  >;
  overrides: Record<string, Override>;
  custom: Skill[];
  settings: Settings;
  challenges: Challenge[];
}
export interface AppState {
  version: 1;
  game: GameId;
  games: Record<GameId, GameState>;
}
export interface Filters {
  archetypes: string[];
  damage: string[];
  kinds: string[];
  activation: string[];
  vaal: boolean;
  transfigured: boolean;
  custom: boolean;
  unique: boolean;
}
export interface Result {
  version: 1;
  game: GameId;
  skill?: Skill;
  className?: string;
  ascendancy?: string;
  challenges: Challenge[];
}
export type Target =
  | "Skill"
  | "Class"
  | "Ascendancy"
  | "Full build"
  | "Class / Ascendancy, then Skill";
