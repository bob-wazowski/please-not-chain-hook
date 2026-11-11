import type { Skill, GameState, Filters, Character, Settings } from "./types";
export const emptyFilters = (): Filters => ({
  archetypes: [],
  damage: [],
  kinds: [],
  activation: [],
  vaal: false,
  transfigured: true,
  custom: true,
  unique: true,
});
export function usable(base: Skill[], state: GameState): Skill[] {
  return [...base, ...state.custom].filter(
    (g) =>
      !state.overrides[g.id]?.deleted &&
      state.overrides[g.id]?.enabled !== false,
  );
}
const intersects = (a: string[], b: string[]) =>
  !b.length || a.some((v) => b.includes(v));
export function compatible(g: Skill, c: Character): boolean {
  const entries = Object.entries(c.attributes);
  const max = Math.max(...entries.map(([, v]) => v));
  const dominant = entries.filter(([, v]) => v === max).map(([k]) => k);
  const req = Object.entries(g.requirements);
  const required = Math.max(...req.map(([, v]) => v));
  return (
    required === 0 ||
    req.some(([k, v]) => v === required && dominant.includes(k))
  );
}
export const matchesPlayability = (skill: Skill, settings: Settings) =>
  settings.allActive || skill.playability === "main";

export function pool(
  base: Skill[],
  state: GameState,
  f: Filters,
  character?: Character,
  recent: string[] = [],
): Skill[] {
  return usable(base, state).filter(
    (g) =>
      (f.custom || !g.custom) &&
      matchesPlayability(g, state.settings) &&
      (!g.variant.includes("vaal") || f.vaal) &&
      (!g.variant.includes("transfigured") || f.transfigured) &&
      intersects(g.archetypes, f.archetypes) &&
      intersects(g.damage, f.damage) &&
      intersects(g.kinds, f.kinds) &&
      intersects(g.activation, f.activation) &&
      (!character ||
        state.settings.compatibility !== "strict" ||
        compatible(g, character)) &&
      (!state.settings.avoidRepeats || !recent.includes(g.id)),
  );
}
export function randomInt(n: number): number {
  if (!Number.isSafeInteger(n) || n < 1) throw Error("The pool is empty.");
  const data = new Uint32Array(1),
    limit = Math.floor(4294967296 / n) * n;
  do {
    crypto.getRandomValues(data);
  } while (data[0] >= limit);
  return data[0] % n;
}
export function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function draw<T>(
  list: T[],
  count: number,
  weight: (value: T) => number = () => 1,
): T[] {
  if (!list.length) throw Error("No results match your filters.");
  const rest = [...list],
    out: T[] = [];
  for (let i = 0; i < Math.min(count, list.length); i++) {
    const weights = rest.map((x) => Math.max(1, Math.round(weight(x)))),
      total = weights.reduce((a, b) => a + b, 0);
    let v = randomInt(total),
      index = 0;
    while (v >= weights[index]) v -= weights[index++];
    out.push(rest.splice(index, 1)[0]);
  }
  return shuffled(out);
}
export function skillDeck(
  list: Skill[],
  count: number,
  settings: Settings,
  character?: Character,
  submode = "Any Archetype",
  minimum = 3,
): Skill[] {
  let candidates = list;
  if (submode === "Same Archetype") {
    const groups = new Map<string, Skill[]>();
    for (const g of list)
      for (const a of g.archetypes) {
        groups.set(a, [...(groups.get(a) || []), g]);
      }
    const valid = [...groups.values()].filter((g) => g.length >= minimum);
    if (!valid.length)
      throw Error(`No archetype contains ${minimum} unique skills.`);
    candidates = valid[randomInt(valid.length)];
  }
  if (submode === "Different Archetypes") {
    const assigned = new Map<string, Skill>();
    const visit = (g: Skill, seen: Set<string>): boolean => {
      for (const a of shuffled(g.archetypes)) {
        if (seen.has(a)) continue;
        seen.add(a);
        const previous = assigned.get(a);
        if (!previous || visit(previous, seen)) {
          assigned.set(a, g);
          return true;
        }
      }
      return false;
    };
    for (const g of shuffled(list)) visit(g, new Set());
    const unique = [
      ...new Map([...assigned.values()].map((g) => [g.id, g])).values(),
    ];
    if (unique.length < minimum)
      throw Error(
        `At least ${minimum} distinct archetypes with unique skills are required.`,
      );
    candidates = unique;
  }
  return draw(candidates, count, (g) =>
    character &&
    settings.compatibility === "weighted" &&
    compatible(g, character)
      ? 3
      : 1,
  );
}
export function allowedClasses(
  classes: Character[],
  state: GameState,
): Character[] {
  return classes
    .filter((c) => state.classOverrides?.[c.name]?.enabled !== false)
    .map((c) => ({
      ...c,
      ascendancies: c.ascendancies.filter(
        (a) => state.classOverrides?.[c.name]?.ascendancies?.[a] !== false,
      ),
    }));
}
