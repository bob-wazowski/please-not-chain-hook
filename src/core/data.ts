import source from "../data/poe1.json";
import type { Skill, Game, GameId } from "./types";
const generated = import.meta.glob("../data/{games,poe2}.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;
export const skills: Skill[] = source.map((g) => ({
  id: g.id,
  name: g.name,
  archetypes: g.archetypes,
  damage: g.damage,
  kinds: g.kinds,
  activation: g.activation,
  tags: g.tags,
  playability: g.playability as Skill["playability"],
  variant: g.variant,
  requirements: {
    strength: g.requirements.strength ?? 0,
    dexterity: g.requirements.dexterity ?? 0,
    intelligence: g.requirements.intelligence ?? 0,
  },
  color: g.color as Skill["color"],
  wiki: g.wiki,
  family: g.family,
}));
const fallback: Game[] = [
  {
    id: "poe1",
    name: "Path of Exile 1",
    catalog: "poe1",
    available: true,
    version: "Existing RePoE gem snapshot",
    classes: [
      {
        name: "Marauder",
        attributes: { strength: 32, dexterity: 14, intelligence: 14 },
        ascendancies: ["Juggernaut", "Berserker", "Chieftain"],
      },
      {
        name: "Ranger",
        attributes: { strength: 14, dexterity: 32, intelligence: 14 },
        ascendancies: ["Deadeye", "Warden", "Pathfinder"],
      },
      {
        name: "Witch",
        attributes: { strength: 14, dexterity: 14, intelligence: 32 },
        ascendancies: ["Necromancer", "Elementalist", "Occultist"],
      },
      {
        name: "Duelist",
        attributes: { strength: 23, dexterity: 23, intelligence: 14 },
        ascendancies: ["Slayer", "Gladiator", "Champion"],
      },
      {
        name: "Templar",
        attributes: { strength: 23, dexterity: 14, intelligence: 23 },
        ascendancies: ["Inquisitor", "Hierophant", "Guardian"],
      },
      {
        name: "Shadow",
        attributes: { strength: 14, dexterity: 23, intelligence: 23 },
        ascendancies: ["Assassin", "Saboteur", "Trickster"],
      },
      {
        name: "Scion",
        attributes: { strength: 20, dexterity: 20, intelligence: 20 },
        ascendancies: ["Ascendant"],
      },
    ],
  },
  {
    id: "poe2",
    name: "Path of Exile 2",
    catalog: "poe2",
    classes: [],
    available: false,
  },
  {
    id: "phrecia",
    name: "Legacy of Phrecia",
    catalog: "poe1",
    classes: [],
    available: false,
  },
];
type PreparedGem = {
  id: string;
  name: string;
  archetypes: string[];
  requirements: Record<string, number>;
  playability: Skill["playability"];
  variant: string;
  color: Skill["color"];
  wiki: string;
  family: string;
  damage?: string[];
  kinds?: string[];
  activation?: string[];
  tags?: string[];
};
const second = (generated["../data/poe2.json"] ?? []) as PreparedGem[];
const poe2: Skill[] = second.map((g) => ({
  ...g,
  damage: g.damage ?? [],
  kinds: g.kinds ?? [],
  activation: g.activation ?? [],
  tags: g.tags ?? [],
  requirements: {
    strength: g.requirements.strength ?? g.requirements.str ?? 0,
    dexterity: g.requirements.dexterity ?? g.requirements.dex ?? 0,
    intelligence: g.requirements.intelligence ?? g.requirements.int ?? 0,
  },
}));
export const games: Game[] = (
  (generated["../data/games.json"] ?? fallback) as Game[]
).map((g) => ({
  ...g,
  available: g.id === "poe1" && g.classes.length > 0,
}));
export function catalog(game: GameId): Skill[] {
  return game === "poe2" ? poe2 : skills;
}
export const archetypes = [
  "melee",
  "bow",
  "spellcaster",
  "minion",
  "totem",
  "trap",
  "mine",
  "brand",
  "dot",
  "projectile",
  "channeling",
  "warcry",
  "attack",
];
export const damageTypes = ["physical", "fire", "cold", "lightning", "chaos"];
export const title = (s: string) =>
  s === "dot"
    ? "DoT"
    : s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
