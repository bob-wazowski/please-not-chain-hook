import { useMemo, useState } from "react";
import {
  Layers3,
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  Share2,
  Plus,
  Check,
  Info,
  X,
} from "lucide-react";
import { useApp } from "../ui/context";
import { catalog, archetypes, damageTypes, title } from "../core/data";
import {
  allowedClasses,
  emptyFilters,
  matchesPlayability,
  pool,
  draw,
  skillDeck,
  shuffled,
  usable,
} from "../core/random";
import {
  randomModes,
  type Filters,
  type RandomMode,
  type Result,
  type Target,
  type Skill,
} from "../core/types";
import { Deck, type CardOption } from "../ui/Deck";
import { Tournament } from "../ui/Tournament";
import { Chips, GemDiamond, GemLink, Toggle } from "../ui/shared";
import { categories, challengePool, fits } from "../core/challenges";
export function Randomizer() {
  const { game, local, updateLocal, notify, share } = useApp();
  const [filters, setFilters] = useState<Filters>(emptyFilters),
    [target, setTarget] = useState<Target>("Skill"),
    [mode, setMode] = useState<RandomMode>(randomModes[0]),
    [submode, setSubmode] = useState("Random 3"),
    [recent, setRecent] = useState<string[]>([]),
    [draft, setDraft] = useState<Partial<Result>>({}),
    [step, setStep] = useState(0),
    [round, setRound] = useState(0);
  const result = local.results?.[mode] ?? null;
  function setResult(result: Result | null) {
    updateLocal((s) => ({
      ...s,
      results: { ...s.results, [mode]: result },
    }));
  }
  const steps =
    target === "Full build" || target === "Class / Ascendancy, then Skill"
      ? ["Class", "Ascendancy", "Skill"]
      : [target];
  const kind = steps[step];
  const classPool = allowedClasses(game.classes, local);
  const character = classPool.find((c) => c.name === draft.className);
  const base = useMemo(() => catalog(game.id), [game.id]);
  const enabledArchetypes = new Set(
    usable(base, local)
      .filter((skill) => matchesPlayability(skill, local.settings))
      .flatMap((skill) => skill.archetypes),
  );
  const archetypeOptions = archetypes.filter((key) =>
    enabledArchetypes.has(key),
  );
  const eligible = pool(base, local, filters, character, recent);
  const done = !!result;
  function resetDraw() {
    setDraft({});
    setStep(0);
    setRound((r) => r + 1);
  }
  function reset() {
    resetDraw();
    setResult(null);
  }
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    reset();
  }
  function prepare(): CardOption[] {
    if (kind === "Class") {
      const classes =
        target === "Class"
          ? classPool
          : classPool.filter((c) => c.ascendancies.length > 0);
      return draw(classes, local.settings.cardCount).map((c) => ({
        id: c.name,
        name: c.name,
        subtitle: "Class",
        className: c.name,
      }));
    }
    if (kind === "Ascendancy") {
      const classes = character ? [character] : classPool;
      const options = classes.flatMap((c) =>
        c.ascendancies.map((a) => ({
          id: c.name + ":" + a,
          name: a,
          subtitle: c.name,
          className: c.name,
        })),
      );
      return draw(options, local.settings.cardCount);
    }
    let list = eligible;
    if (filters.unique) {
      const ids = new Set<string>();
      list = shuffled(list).filter((g) => {
        if (ids.has(g.family)) return false;
        ids.add(g.family);
        return true;
      });
    }
    return skillDeck(
      list,
      local.settings.cardCount,
      local.settings,
      character,
      mode === "Pick 1 of 3" ? submode : "Random 3",
    ).map((g) => ({
      id: g.id,
      name: g.name,
      subtitle: g.archetypes.map(title).slice(0, 2).join(" / "),
      skill: g,
    }));
  }
  function complete(c: CardOption) {
    const next = { ...draft };
    if (kind === "Class") next.className = c.name;
    else if (kind === "Ascendancy") {
      next.className = c.className;
      next.ascendancy = c.name;
    } else next.skill = c.skill;
    setDraft(next);
    if (step === steps.length - 1) {
      const final: Result = {
        ...next,
        version: 1,
        game: game.id,
        challenges: [],
      };
      setResult(final);
      if (c.skill) setRecent((r) => [...r, c.skill!.id]);
    } else if (result) {
      setResult(null);
    }
  }
  const selected =
    kind === "Class"
      ? draft.className
      : kind === "Ascendancy"
        ? draft.ascendancy
        : draft.skill;
  function challenge() {
    if (!result) return;
    if (result.challenges.length >= 20) {
      notify("A shared result can contain up to 20 challenges.");
      return;
    }
    const options = challengePool(
      game.id,
      local.challenges,
      categories,
      0,
    ).filter(
      (c) =>
        fits(c, result.challenges) &&
        (!result.skill ||
          result.skill.playability === "main" ||
          c.id !== "rolled-skill"),
    );
    const c = shuffled(options)[0];
    if (!c) {
      notify("No additional compatible challenges are available.");
      return;
    }
    setResult({ ...result, challenges: [...result.challenges, c] });
  }
  function tournamentWinner(skill: Skill) {
    setResult({ version: 1, game: game.id, skill, challenges: [] });
    setRecent((r) => [...r, skill.id]);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Layers3 size={14} />
            Leave something to chance
          </div>
          <h1>
            Your next build<span className="heading-dot">.</span>
          </h1>
          <p>Less theorycrafting. More unexpected adventures.</p>
        </div>
        <span className="pool-indicator">
          <span className="live-dot" />
          <strong>{eligible.length}</strong> skills in your pool
        </span>
      </div>
      <div className="mode-tabs" aria-label="Randomization mode">
        {randomModes.map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            aria-pressed={mode === m}
            onClick={() => {
              if (m === mode) return;
              setMode(m);
              resetDraw();
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div
        className={`random-layout ${mode === "Skill Tournament" ? "tournament-layout" : ""}`}
      >
        <aside className="random-options panel">
          <h2>
            <SlidersHorizontal size={16} />
            Draw settings
          </h2>
          {mode !== "Skill Tournament" && (
            <label>
              What are we drawing?
              <select
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value as Target);
                  reset();
                }}
              >
                {(
                  [
                    "Skill",
                    "Class",
                    "Ascendancy",
                    "Full build",
                    "Class / Ascendancy, then Skill",
                  ] as Target[]
                ).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          {mode === "Pick 1 of 3" && (
            <label>
              Skill selection
              <select
                value={submode}
                onChange={(e) => {
                  setSubmode(e.target.value);
                  reset();
                }}
              >
                {["Random 3", "Same Archetype", "Different Archetypes"].map(
                  (m) => (
                    <option key={m}>{m}</option>
                  ),
                )}
              </select>
            </label>
          )}
          {archetypeOptions.length > 0 && (
            <div className="filter-block">
              <h3>Archetypes</h3>
              <Chips
                values={archetypeOptions}
                selected={filters.archetypes}
                onChange={(v) => setFilter("archetypes", v)}
              />
            </div>
          )}
          <details className="extra-filters">
            <summary>More filters</summary>
            <div className="filter-block">
              <h3>Damage type</h3>
              <Chips
                values={damageTypes}
                selected={filters.damage}
                onChange={(v) => setFilter("damage", v)}
              />
            </div>
            <div className="filter-block">
              <h3>Damage kind</h3>
              <Chips
                values={["hit", "dot"]}
                selected={filters.kinds}
                onChange={(v) => setFilter("kinds", v)}
              />
            </div>
            <div className="filter-block">
              <h3>Activation</h3>
              <Chips
                values={["attack", "spell"]}
                selected={filters.activation}
                onChange={(v) => setFilter("activation", v)}
              />
            </div>
          </details>
          <div className="gem-filters">
            <Toggle
              checked={filters.vaal}
              onChange={(v) => setFilter("vaal", v)}
            >
              Include Vaal gems
              <small>Allow gems that grant a Vaal skill.</small>
            </Toggle>
            <Toggle
              checked={filters.transfigured}
              onChange={(v) => setFilter("transfigured", v)}
            >
              Include transfigured gems
              <small>Allow alternate versions of base skills.</small>
            </Toggle>
            <Toggle
              checked={filters.custom}
              onChange={(v) => setFilter("custom", v)}
            >
              Include custom gems
              <small>Use gems you added in Database.</small>
            </Toggle>
            <Toggle
              checked={filters.unique}
              onChange={(v) => setFilter("unique", v)}
            >
              One variant per skill
              <small>
                Base, Vaal and transfigured gems share one spot per deck.
              </small>
            </Toggle>
          </div>
          <button
            className="reset-button"
            onClick={() => {
              setFilters(emptyFilters());
              reset();
            }}
          >
            <RotateCcw size={14} />
            Reset filters
          </button>
          {recent.length > 0 && (
            <button
              className="text-button"
              onClick={() => {
                setRecent([]);
                reset();
              }}
            >
              Clear {recent.length} recent result
              {recent.length === 1 ? "" : "s"}
            </button>
          )}
          <div className="filter-note">
            <Info size={15} />
            <span>Database exclusions and global settings always apply.</span>
          </div>
        </aside>
        <div className="random-main">
          {mode === "Skill Tournament" ? (
            <Tournament
              key={round + JSON.stringify(filters)}
              pool={
                filters.unique
                  ? eligible.filter(
                      (g, i, list) =>
                        list.findIndex((x) => x.family === g.family) === i,
                    )
                  : eligible
              }
              onWinner={tournamentWinner}
              onStart={() => setResult(null)}
              prepare={(n) => {
                let candidates = shuffled(eligible);
                if (filters.unique)
                  candidates = candidates.filter(
                    (g, i, list) =>
                      list.findIndex((x) => x.family === g.family) === i,
                  );
                return skillDeck(candidates, n, local.settings, character);
              }}
            />
          ) : (
            <>
              <div className="draw-progress">
                {steps.map((s, i) => (
                  <span
                    className={
                      i === step ? "current" : i < step ? "finished" : ""
                    }
                    key={s}
                  >
                    <b>{i < step ? <Check size={12} /> : i + 1}</b>
                    {s}
                    {i < steps.length - 1 && <ArrowRight size={13} />}
                  </span>
                ))}
                <a href="#settings">
                  {local.settings.cardCount} cards max · Card Deck
                </a>
              </div>
              <Deck
                key={
                  round +
                  ":" +
                  step +
                  ":" +
                  JSON.stringify(local.settings) +
                  ":" +
                  JSON.stringify(local.overrides)
                }
                settings={local.settings}
                pickThree={mode === "Pick 1 of 3"}
                prepare={prepare}
                kind={kind}
                onChoose={complete}
              />
              {selected && !done && (
                <div className="next-deck-bar">
                  <span>
                    <Check size={16} />
                    {typeof selected === "string" ? (
                      selected
                    ) : (
                      <GemLink skill={selected} />
                    )}{" "}
                    selected
                  </span>
                  <button
                    className="primary"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Draw {steps[step + 1]} deck
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {!done && (
                <div className="build-strip">
                  {["Class", "Ascendancy", "Skill"].map((k) => (
                    <div key={k}>
                      <small>{k}</small>
                      <span>
                        {k === "Class" ? (
                          (draft.className ?? "Undiscovered")
                        ) : k === "Ascendancy" ? (
                          (draft.ascendancy ?? "Undiscovered")
                        ) : draft.skill ? (
                          <GemLink skill={draft.skill} />
                        ) : (
                          "Undiscovered"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {result && (
            <section className="result-panel panel" aria-live="polite">
              <div className="result-heading">
                <span className="eyebrow">
                  <Check size={14} />
                  Your fate, revealed
                </span>
                <span className="badge">{game.name}</span>
              </div>
              <div className="result-identity">
                {result.skill && <GemDiamond skill={result.skill} size="large" />}
                <div>
                  <h2>
                    {result.skill ? (
                      <GemLink skill={result.skill} gameId={result.game} />
                    ) : (
                      (result.ascendancy ?? result.className)
                    )}
                  </h2>
                  <p>
                    {[result.className, result.ascendancy]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  <div className="tag-list">
                    {result.skill?.archetypes.map((a) => (
                      <span key={a}>{title(a)}</span>
                    ))}
                  </div>
                </div>
              </div>
              {result.challenges.length > 0 && (
                <ul className="attached-challenges">
                  {result.challenges.map((c) => (
                    <li key={c.id}>
                      <span>{c.name}</span>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${c.name}`}
                        onClick={() =>
                          setResult({
                            ...result,
                            challenges: result.challenges.filter(
                              (x) => x.id !== c.id,
                            ),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="actions">
                <button className="primary" onClick={() => share(result)}>
                  <Share2 size={15} />
                  Share result
                </button>
                <button onClick={challenge}>
                  <Plus size={15} />
                  Add random challenge
                </button>
                <button onClick={reset}>
                  <RotateCcw size={15} />
                  Draw again
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
