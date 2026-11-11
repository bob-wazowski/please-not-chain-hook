import type { Challenge, GameId } from "./types";
const both: GameId[] = ["poe1", "poe2", "phrecia"];
export const categories = [
  "Difficulty",
  "Progression",
  "Bosses",
  "Restrictions",
  "Build Challenges",
  "Chaos Challenges",
];
export const challenges: Challenge[] = [
  ["hardcore", "Hardcore", "Difficulty", 3, both, ["no-deaths"]],
  ["ssf", "Solo Self-Found", "Difficulty", 2, both, ["no-trading"]],
  ["no-trading", "No Trading", "Restrictions", 1, both, ["ssf"]],
  ["no-deaths", "No Deaths", "Difficulty", 2, both, ["hardcore"]],
  ["campaign", "Complete the Campaign", "Progression", 1, both, []],
  ["level90", "Reach Level 90", "Progression", 2, both, []],
  ["maven", "Defeat Maven", "Bosses", 3, ["poe1", "phrecia"], []],
  ["uber", "Defeat an Uber Boss", "Bosses", 3, ["poe1", "phrecia"], []],
  ["no-unique", "No Unique Items", "Restrictions", 2, both, []],
  ["no-respec", "No Respec", "Restrictions", 3, both, []],
  [
    "rolled-skill",
    "Use Your Rolled Skill as Your Main Damage Skill",
    "Build Challenges",
    2,
    both,
    [],
  ],
  [
    "no-bench",
    "No Crafting Bench",
    "Chaos Challenges",
    2,
    ["poe1", "phrecia"],
    [],
  ],
  ["no-vendor", "No Vendor Purchases", "Chaos Challenges", 3, both, []],
  [
    "no-flask",
    "No Utility Flasks",
    "Build Challenges",
    3,
    ["poe1", "phrecia"],
    [],
  ],
].map(
  ([id, name, category, difficulty, games, conflicts]) =>
    ({ id, name, category, difficulty, games, conflicts }) as Challenge,
);
export function fits(c: Challenge, chosen: Challenge[]): boolean {
  return !chosen.some(
    (x) =>
      x.id === c.id || x.conflicts.includes(c.id) || c.conflicts.includes(x.id),
  );
}
export function challengePool(
  game: GameId,
  custom: Challenge[],
  cats: string[],
  difficulty: number,
): Challenge[] {
  return [...challenges, ...custom].filter(
    (c) =>
      c.games.includes(game) &&
      cats.includes(c.category) &&
      (!difficulty || c.difficulty <= difficulty),
  );
}
