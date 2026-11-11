import {
  randomModes,
  type AppState,
  type Settings,
  type GameState,
} from "./types";
import { z } from "zod";
export const KEY = "pnch:v1";
export const defaults: Settings = {
  allActive: false,
  compatibility: "weighted",
  avoidRepeats: true,
  animation: "card-deck",
  cardCount: 12,
  duration: 1.8,
  skip: false,
  reduced: false,
  particles: true,
  sound: false,
};
const gameState = (): GameState => ({
  overrides: {},
  custom: [],
  settings: { ...defaults },
  challenges: [],
});
export const fresh = (): AppState => ({
  version: 1,
  game: "poe1",
  games: { poe1: gameState(), poe2: gameState(), phrecia: gameState() },
});
const text = z.string().min(1).max(160),
  list = z.array(text).max(80);
const gameId = z.enum(["poe1", "poe2", "phrecia"]);
export const skillSchema = z.object({
  id: text,
  name: text,
  archetypes: list,
  damage: list,
  kinds: list,
  activation: list,
  tags: list,
  playability: z.enum(["main", "conditional", "support_only", "excluded"]),
  variant: z.enum(["base", "transfigured", "vaal", "vaal_transfigured"]),
  requirements: z.object({
    strength: z.number().finite().min(0).max(10000),
    dexterity: z.number().finite().min(0).max(10000),
    intelligence: z.number().finite().min(0).max(10000),
  }),
  color: z.enum(["str", "dex", "int", "all"]).optional(),
  wiki: z
    .string()
    .max(1000)
    .transform((v) =>
      /^https:\/\/(www\.)?(poewiki\.net|poe2wiki\.net)\//.test(v) ? v : "",
    ),
  custom: z.boolean().optional(),
  family: text,
});
export const challengeSchema = z.object({
  id: text,
  name: text,
  category: text,
  difficulty: z.number().int().min(1).max(3),
  games: z.array(gameId).min(1).max(3),
  conflicts: list,
  custom: z.boolean().optional(),
});
export const resultSchema = z.object({
  version: z.literal(1),
  game: gameId,
  skill: skillSchema.optional(),
  className: z.string().max(80).optional(),
  ascendancy: z.string().max(80).optional(),
  challenges: z.array(challengeSchema).max(20),
});
const settingsSchema = z.object({
  allActive: z.boolean(),
  compatibility: z.enum(["strict", "weighted", "unrestricted"]),
  avoidRepeats: z.boolean(),
  animation: z.literal("card-deck"),
  cardCount: z.number().int().min(3).max(48),
  duration: z.number().min(0).max(6),
  skip: z.boolean(),
  reduced: z.boolean(),
  particles: z.boolean(),
  sound: z.boolean(),
});
const perGame = z
  .object({
    result: resultSchema.nullable().optional(),
    results: z
      .partialRecord(z.enum(randomModes), resultSchema.nullable())
      .optional(),
    classOverrides: z
      .record(
        text,
        z.object({
          enabled: z.boolean().optional(),
          ascendancies: z.record(text, z.boolean()).optional(),
        }),
      )
      .optional(),
    overrides: z.record(
      text,
      z.object({
        enabled: z.boolean().optional(),
        deleted: z.boolean().optional(),
      }),
    ),
    custom: z
      .array(skillSchema)
      .max(500)
      .refine(
        (a) => new Set(a.map((s) => s.id)).size === a.length,
        "Duplicate skill IDs",
      )
      .refine(
        (a) => a.every((s) => s.id.startsWith("custom:")),
        "Custom skills must use custom IDs",
      ),
    settings: settingsSchema,
    challenges: z
      .array(challengeSchema)
      .max(200)
      .refine(
        (a) => a.every((c) => c.id.startsWith("custom:")),
        "Custom challenges must use custom IDs",
      ),
  })
  .transform(({ result, ...state }) =>
    !state.results && result
      ? { ...state, results: { [randomModes[0]]: result } }
      : state,
  );
export const stateSchema = z.object({
  version: z.literal(1),
  game: gameId,
  games: z.object({ poe1: perGame, poe2: perGame, phrecia: perGame }),
});
export function parseState(value: string): AppState {
  if (value.length > 3_000_000) throw Error("Settings file is too large.");
  return stateSchema.parse(JSON.parse(value));
}
export function loadState(): { state: AppState; warning: string } {
  try {
    const raw = localStorage.getItem(KEY);
    return { state: raw ? parseState(raw) : fresh(), warning: "" };
  } catch {
    return {
      state: fresh(),
      warning:
        "Saved data could not be read. Defaults are active. Export your changes before closing this tab.",
    };
  }
}
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
