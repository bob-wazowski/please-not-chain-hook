import { test } from "node:test";
import assert from "node:assert/strict";
import {
  draw,
  emptyFilters,
  pool,
  skillDeck,
  compatible,
  allowedClasses,
} from "../src/core/random.ts";
import { fresh, parseState, defaults } from "../src/core/state.ts";
import { fits, challengePool, categories } from "../src/core/challenges.ts";
import { encodeResult, decodeResult } from "../src/core/share.ts";
import type { Skill, Character, Result } from "../src/core/types.ts";
const gem = (id: string, archetypes = ["spellcaster"]): Skill => ({
  id,
  name: id,
  archetypes,
  damage: ["lightning"],
  activation: ["spell"],
  kinds: ["hit"],
  tags: [],
  playability: "main",
  variant: "base",
  requirements: { strength: 0, dexterity: 0, intelligence: 100 },
  wiki: "",
  family: id,
});
const witch: Character = {
  name: "Witch",
  attributes: { strength: 14, dexterity: 14, intelligence: 32 },
  ascendancies: ["Occultist", "Elementalist"],
};
test("Empty pool fails immediately and unique decks stop at available count", () => {
  assert.throws(() => draw([], 12), /empty|No results/i);
  const values = Array.from({ length: 7 }, (_, i) => i);
  for (let k = 0; k < 100; k++) {
    const picked = draw(values, 12);
    assert.equal(picked.length, 7);
    assert.equal(new Set(picked).size, 7);
  }
});
test("Database overrides outrank all-active settings and quick filters", () => {
  const state = fresh().games.poe1;
  state.settings.allActive = true;
  state.overrides.a = { enabled: false };
  state.overrides.b = { deleted: true };
  assert.deepEqual(
    pool([gem("a"), gem("b"), gem("c")], state, emptyFilters()).map(
      (g) => g.id,
    ),
    ["c"],
  );
});
test("Draws use only main gems unless all active gems are included", () => {
  const state = fresh().games.poe1;
  const conditional: Skill = { ...gem("utility"), playability: "conditional" };
  const skills = [gem("main"), conditional];
  assert.deepEqual(pool(skills, state, emptyFilters()), [skills[0]]);
  state.settings.allActive = true;
  assert.deepEqual(pool(skills, state, emptyFilters()), skills);
});
test("Filter intersection never returns disallowed damage, variant or repeat", () => {
  const state = fresh().games.poe1;
  const vaal = { ...gem("v"), variant: "vaal" };
  const f = emptyFilters();
  f.damage = ["fire"];
  assert.equal(pool([gem("a"), vaal], state, f).length, 0);
  f.damage = [];
  assert.deepEqual(pool([gem("a"), vaal], state, f, undefined, ["a"]), []);
});
test("Gem variant and custom filters control draws directly", () => {
  const state = fresh().games.poe1;
  const vaal = { ...gem("vaal"), variant: "vaal" };
  const transfigured = { ...gem("transfigured"), variant: "transfigured" };
  const custom = { ...gem("custom:gem"), custom: true };
  state.custom = [custom];
  const gems = [vaal, transfigured];
  assert.deepEqual(pool(gems, state, emptyFilters()), [transfigured, custom]);
  assert.deepEqual(
    pool(gems, state, {
      ...emptyFilters(),
      vaal: true,
      transfigured: false,
      custom: false,
    }),
    [vaal],
  );
});
test("Class and Ascendancy exclusions survive export and retain ownership", () => {
  const state = fresh();
  assert.deepEqual(allowedClasses([witch], state.games.poe1), [witch]);
  state.games.poe1.classOverrides = {
    Witch: { ascendancies: { Elementalist: false } },
    Marauder: { enabled: false },
  };
  const saved = parseState(JSON.stringify(state)).games.poe1;
  const marauder = { ...witch, name: "Marauder", ascendancies: ["Berserker"] };
  assert.deepEqual(allowedClasses([witch, marauder], saved), [
    { ...witch, ascendancies: ["Occultist"] },
  ]);
});
test("Strict affinity is explicit and filter-safe", () => {
  assert.ok(compatible(gem("a"), witch));
  const melee = {
    ...gem("b"),
    requirements: { strength: 100, dexterity: 0, intelligence: 0 },
  };
  assert.ok(!compatible(melee, witch));
  const state = fresh().games.poe1;
  state.settings.compatibility = "strict";
  assert.deepEqual(
    pool([gem("a"), melee], state, emptyFilters(), witch).map((g) => g.id),
    ["a"],
  );
});
test("Same archetype produces a shared group or an explicit failure", () => {
  const list = [gem("a"), gem("b"), gem("c"), gem("d", ["bow"])];
  for (let i = 0; i < 25; i++) {
    const deck = skillDeck(list, 12, defaults, undefined, "Same Archetype");
    assert.equal(deck.length, 3);
    assert.ok(deck.every((g) => g.archetypes.includes("spellcaster")));
  }
  assert.throws(() =>
    skillDeck(list.slice(1), 12, defaults, undefined, "Same Archetype"),
  );
  assert.throws(
    () => skillDeck(list, 12, defaults, undefined, "Same Archetype", 4),
    /4 unique skills/,
  );
});
test("Different archetypes solves overlapping membership without duplicate skills", () => {
  const list = [
    gem("a", ["spellcaster", "minion"]),
    gem("b", ["spellcaster"]),
    gem("c", ["bow"]),
  ];
  const deck = skillDeck(list, 12, defaults, undefined, "Different Archetypes");
  assert.equal(deck.length, 3);
  assert.equal(new Set(deck.map((g) => g.id)).size, 3);
  assert.throws(
    () => skillDeck(list, 12, defaults, undefined, "Different Archetypes", 4),
    /4 distinct archetypes/,
  );
  assert.throws(() =>
    skillDeck(
      [gem("a"), gem("b"), gem("c")],
      12,
      defaults,
      undefined,
      "Different Archetypes",
    ),
  );
});
test("Game state is isolated and stable IDs survive catalog changes", () => {
  const state = fresh();
  state.games.poe1.overrides["stable-id"] = { enabled: false };
  assert.deepEqual(state.games.phrecia.overrides, {});
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  assert.equal(
    pool([gem("stable-id"), gem("new-id")], state.games.poe1, emptyFilters())[0]
      .id,
    "new-id",
  );
});
test("Legacy results migrate to the default randomizer tab", () => {
  const state = fresh();
  const result: Result = {
    version: 1,
    game: "poe1",
    skill: gem("legacy"),
    challenges: [],
  };
  const legacy = {
    ...state,
    games: { ...state.games, poe1: { ...state.games.poe1, result } },
  };
  const migrated = parseState(JSON.stringify(legacy));
  assert.deepEqual(migrated.games.poe1.results, { "Absolute Random": result });
  assert.deepEqual(parseState(JSON.stringify(migrated)), migrated);
});
test("Malformed or dangerous imports are rejected or sanitized", () => {
  const state = fresh();
  assert.throws(() => parseState("{no"));
  assert.throws(() => parseState(JSON.stringify({ ...state, version: 2 })));
  state.games.poe1.settings.cardCount = -3;
  assert.throws(() => parseState(JSON.stringify(state)));
  const valid = fresh();
  const legacyGem = {
    ...gem("custom:one"),
    custom: true,
    image: "https://tracker.invalid/a.png",
    wiki: "javascript:alert(1)",
  };
  valid.games.poe1.custom = [legacyGem];
  const parsed = parseState(JSON.stringify(valid));
  assert.equal("image" in parsed.games.poe1.custom[0], false);
  assert.equal(parsed.games.poe1.custom[0].wiki, "");
  valid.games.poe1.custom.push(valid.games.poe1.custom[0]);
  assert.throws(() => parseState(JSON.stringify(valid)));
});
test("Share links carry Unicode and custom skill snapshots without requiring catalog membership", () => {
  const r: Result = {
    version: 1,
    game: "poe1",
    skill: { ...gem("custom:test"), name: "Aether — 雪", custom: true },
    challenges: [],
  };
  assert.deepEqual(decodeResult(encodeResult(r)), r);
  const legacy = { ...r, skill: { ...r.skill!, image: "gems/old.png" } };
  assert.deepEqual(decodeResult(encodeResult(legacy)), r);
  assert.throws(() => decodeResult("not a valid share"));
  assert.throws(() => decodeResult("x".repeat(25000)));
});
test("Challenges respect rulesets and both directions of conflict declarations", () => {
  const p = challengePool("poe1", [], categories, 0);
  const hc = p.find((c) => c.id === "hardcore")!,
    nd = p.find((c) => c.id === "no-deaths")!;
  assert.equal(fits(hc, [nd]), false);
  assert.equal(fits(nd, [hc]), false);
  assert.equal(fits(hc, [hc]), false);
  assert.equal(
    challengePool("poe2", [], categories, 0).some((c) => c.id === "maven"),
    false,
  );
  assert.ok(
    challengePool("poe1", [], categories, 1).every((c) => c.difficulty <= 1),
  );
});
