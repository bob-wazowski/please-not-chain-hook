import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  ChevronDown,
  Trash2,
  Library,
} from "lucide-react";
import { useApp } from "../ui/context";
import { catalog, archetypes, damageTypes, title } from "../core/data";
import { GemDiamond, GemLink, Modal, Empty } from "../ui/shared";
import { matchesPlayability } from "../core/random";
import { DataActions } from "../ui/DataActions";
import type { Skill } from "../core/types";
export function Database() {
  const [tab, setTab] = useState<"Skills" | "Classes">("Skills");
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Library size={14} />
            Your collection
          </div>
          <h1>
            Database<span className="heading-dot">.</span>
          </h1>
          <p>Choose which skills, classes and Ascendancies can be drawn.</p>
        </div>
        {tab === "Skills" && (
          <button className="primary" onClick={() => setAdding(true)}>
            <Plus size={17} />
            Add custom skill
          </button>
        )}
      </div>
      <div className="mode-tabs" role="group" aria-label="Database sections">
        {(["Skills", "Classes"] as const).map((section) => (
          <button
            key={section}
            className={tab === section ? "active" : ""}
            aria-pressed={tab === section}
            onClick={() => setTab(section)}
          >
            {section}
          </button>
        ))}
      </div>
      <div hidden={tab !== "Skills"}>
        <Skills />
      </div>
      {tab === "Classes" && <Classes />}
      {adding && <AddSkill onClose={() => setAdding(false)} />}
    </>
  );
}

function Classes() {
  const { game, local, updateLocal } = useApp();
  function toggle(className: string, enabled: boolean, ascendancy?: string) {
    updateLocal((state) => {
      const current = state.classOverrides?.[className];
      const override = ascendancy
        ? {
            ...current,
            ascendancies: { ...current?.ascendancies, [ascendancy]: enabled },
          }
        : { ...current, enabled };
      return {
        ...state,
        classOverrides: { ...state.classOverrides, [className]: override },
      };
    });
  }
  return (
    <div className="class-grid">
      {game.classes.map(({ name, ascendancies }) => {
        const override = local.classOverrides?.[name];
        const enabled = override?.enabled !== false;
        return (
          <section className="skill-group class-group" key={name}>
            <header>
              <h2>{name}</h2>
              <label className="switch-only">
                <input
                  type="checkbox"
                  aria-label={`Include ${name} class`}
                  checked={enabled}
                  onChange={(e) => toggle(name, e.target.checked)}
                />
              </label>
            </header>
            {ascendancies.map((ascendancy) => (
              <label className="toggle" key={ascendancy}>
                <span>{ascendancy}</span>
                <input
                  type="checkbox"
                  disabled={!enabled}
                  checked={
                    enabled && override?.ascendancies?.[ascendancy] !== false
                  }
                  onChange={(e) => toggle(name, e.target.checked, ascendancy)}
                />
              </label>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Skills() {
  const { game, local, updateLocal, notify } = useApp();
  const [query, setQuery] = useState(""),
    [damage, setDamage] = useState("all"),
    [play, setPlay] = useState("all"),
    [variant, setVariant] = useState("all"),
    [showRemoved, setShowRemoved] = useState(false);
  const catalogSkills = useMemo(
    () => [...catalog(game.id), ...local.custom],
    [game.id, local.custom],
  );
  const all = catalogSkills.filter((g) =>
    matchesPlayability(g, local.settings),
  );
  const available = all.filter(
    (g) => showRemoved || !local.overrides[g.id]?.deleted,
  );
  const visible = available.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) &&
      (damage === "all" || g.damage.includes(damage)) &&
      (play === "all" || g.playability === play) &&
      (variant === "all" ||
        (variant === "vaal"
          ? g.variant.includes("vaal")
          : g.variant === variant)),
  );
  const groups = [...archetypes, "other"]
    .map((key) => ({
      key,
      members: available.filter((g) =>
        key === "other" ? !g.archetypes.length : g.archetypes.includes(key),
      ),
      shown: visible.filter((g) =>
        key === "other" ? !g.archetypes.length : g.archetypes.includes(key),
      ),
    }))
    .filter((g) => g.shown.length);
  const enabled = (g: Skill) =>
    !local.overrides[g.id]?.deleted && local.overrides[g.id]?.enabled !== false;
  function toggle(ids: string[], value: boolean) {
    updateLocal((s) => ({
      ...s,
      overrides: {
        ...s.overrides,
        ...Object.fromEntries(
          ids.map((id) => [id, { ...s.overrides[id], enabled: value }]),
        ),
      },
    }));
  }
  function remove(g: Skill) {
    if (
      !confirm(
        g.custom
          ? `Delete custom skill “${g.name}”?`
          : `Remove “${g.name}” from your personal pool? You can restore it later.`,
      )
    )
      return;
    updateLocal((s) =>
      g.custom
        ? { ...s, custom: s.custom.filter((c) => c.id !== g.id) }
        : {
            ...s,
            overrides: {
              ...s.overrides,
              [g.id]: { ...s.overrides[g.id], deleted: true },
            },
          },
    );
  }
  return (
    <>
      <div className="catalog-toolbar panel">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search skills"
            placeholder="Search skill gems…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Damage
          <select value={damage} onChange={(e) => setDamage(e.target.value)}>
            <option value="all">All damage</option>
            {damageTypes.map((v) => (
              <option key={v} value={v}>
                {title(v)}
              </option>
            ))}
          </select>
        </label>
        {local.settings.allActive && (
          <label>
            Playability
            <select value={play} onChange={(e) => setPlay(e.target.value)}>
              <option value="all">All playability</option>
              {["main", "conditional", "support_only", "excluded"].map((v) => (
                <option key={v} value={v}>
                  {title(v)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Variant
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="all">All variants</option>
            {["base", "transfigured", "vaal"].map((v) => (
              <option key={v} value={v}>
                {title(v)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="catalog-meta">
        <span>
          <strong>{visible.length}</strong> skills shown{" "}
          <span className="muted">/ {all.filter(enabled).length} enabled</span>
        </span>
        <label className="check">
          <input
            type="checkbox"
            checked={showRemoved}
            onChange={(e) => setShowRemoved(e.target.checked)}
          />
          Show removed skills
        </label>
      </div>
      <p className="help group-help">
        Group switches affect every member, including results hidden by search.
        Skills with multiple archetypes share one enabled state.
      </p>
      <div className="skill-groups">
        {groups.map(({ key, members, shown }, index) => {
          const count = members.filter(enabled).length;
          return (
            <details
              className="skill-group"
              key={key}
              open={
                index === 0 ||
                query ||
                damage !== "all" ||
                play !== "all" ||
                variant !== "all"
                  ? true
                  : undefined
              }
            >
              <summary>
                <span className="group-symbol">{title(key).slice(0, 1)}</span>
                <div>
                  <h2>{title(key)}</h2>
                  <small>
                    {shown.length} shown · {count} / {members.length} enabled
                  </small>
                </div>
                <span className="group-preview">
                  {shown.slice(0, 3).map((g) => (
                    <GemDiamond key={g.id} skill={g} size="small" />
                  ))}
                </span>
                <label
                  className="switch-only"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={"Enable " + title(key) + " group"}
                    checked={count === members.length}
                    ref={(node) => {
                      if (node)
                        node.indeterminate =
                          count > 0 && count < members.length;
                    }}
                    onChange={(e) =>
                      toggle(
                        members
                          .filter((g) => !local.overrides[g.id]?.deleted)
                          .map((g) => g.id),
                        e.target.checked,
                      )
                    }
                  />
                </label>
                <ChevronDown size={17} />
              </summary>
              <div className="group-actions">
                <span>{title(key)} skills</span>
                <button
                  onClick={() =>
                    toggle(
                      members
                        .filter((g) => !local.overrides[g.id]?.deleted)
                        .map((g) => g.id),
                      true,
                    )
                  }
                >
                  Enable group
                </button>
                <button
                  onClick={() =>
                    toggle(
                      members.map((g) => g.id),
                      false,
                    )
                  }
                >
                  Disable group
                </button>
              </div>
              <div className="gem-rows">
                {shown.map((g) => (
                  <div
                    className={`gem-row ${!enabled(g) ? "disabled-gem" : ""}`}
                    key={g.id}
                  >
                    <GemDiamond skill={g} />
                    <div className="gem-info">
                      <h3>
                        <GemLink skill={g} />
                        {g.custom && <span className="badge">Custom</span>}
                      </h3>
                      <div className="tag-list">
                        <span>{title(g.variant)}</span>
                        <span>{title(g.playability)}</span>
                        {g.damage.map((d) => (
                          <span key={d}>{title(d)}</span>
                        ))}
                      </div>
                      <p className="gem-tags">
                        {g.tags.slice(0, 10).join(" · ") ||
                          g.archetypes.map(title).join(" · ")}
                      </p>
                    </div>
                    <span
                      className="requirements"
                      title={
                        game.id === "poe2"
                          ? "Attribute affinity weights"
                          : "Snapshot attribute requirements"
                      }
                    >
                      {g.requirements.strength} STR
                      <br />
                      {g.requirements.dexterity} DEX
                      <br />
                      {g.requirements.intelligence} INT
                    </span>
                    <div className="gem-tools">
                      {local.overrides[g.id]?.deleted ? (
                        <button
                          onClick={() =>
                            updateLocal((s) => ({
                              ...s,
                              overrides: {
                                ...s.overrides,
                                [g.id]: { enabled: true, deleted: false },
                              },
                            }))
                          }
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <label className="switch-only">
                            <input
                              type="checkbox"
                              checked={enabled(g)}
                              aria-label={`Include ${g.name}`}
                              onChange={(e) => toggle([g.id], e.target.checked)}
                            />
                          </label>
                          <button
                            className="icon-button"
                            aria-label={`Remove ${g.name}`}
                            onClick={() => remove(g)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
      {!groups.length && (
        <Empty title="No skills found">
          Try a different name or clear the filters.
        </Empty>
      )}
      <div className="data-footer">
        <DataActions />
        <button
          onClick={() => {
            if (
              confirm(
                "Reset this game’s skills? This restores built-in skills and deletes custom skills.",
              )
            ) {
              updateLocal((s) => ({ ...s, overrides: {}, custom: [] }));
              notify("Skills restored.");
            }
          }}
        >
          <RotateCcw size={15} />
          Reset skills
        </button>
        <small>
          Source JSON stays intact. Your choices are saved on this device.
        </small>
      </div>
    </>
  );
}
function AddSkill({ onClose }: { onClose: () => void }) {
  const { updateLocal, notify } = useApp();
  const [name, setName] = useState(""),
    [archetype, setArchetype] = useState("spellcaster"),
    [damage, setDamage] = useState("lightning"),
    [kind, setKind] = useState("hit"),
    [activation, setActivation] = useState("spell");
  return (
    <Modal title="Add a custom skill" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const skill: Skill = {
            id: "custom:" + crypto.randomUUID(),
            name: name.trim(),
            archetypes: [archetype],
            damage: [damage],
            kinds: [kind],
            activation: [activation],
            tags: [archetype, damage, activation],
            playability: "main",
            variant: "base",
            requirements: { strength: 0, dexterity: 0, intelligence: 0 },
            wiki: "",
            custom: true,
            family: name.trim().toLowerCase(),
          };
          updateLocal((s) => ({ ...s, custom: [...s.custom, skill] }));
          notify("Custom skill added to this game.");
          onClose();
        }}
      >
        <label>
          Skill name
          <input
            required
            maxLength={100}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="two-col">
          <label>
            Archetype
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
            >
              {archetypes.map((a) => (
                <option key={a} value={a}>
                  {title(a)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Damage
            <select value={damage} onChange={(e) => setDamage(e.target.value)}>
              {damageTypes.map((a) => (
                <option key={a} value={a}>
                  {title(a)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Damage kind
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="hit">Hit</option>
              <option value="dot">DoT</option>
            </select>
          </label>
          <label>
            Activation
            <select
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
            >
              <option value="spell">Spell</option>
              <option value="attack">Attack</option>
            </select>
          </label>
        </div>
        <p className="help">
          Custom skills are stored locally and included when sharing a result.
          They never modify the built-in catalog.
        </p>
        <button className="primary" type="submit">
          Add skill
        </button>
      </form>
    </Modal>
  );
}
