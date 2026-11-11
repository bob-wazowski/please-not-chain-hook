import { Layers3, SlidersHorizontal, Database, RotateCcw } from "lucide-react";
import { useApp } from "../ui/context";
import { Toggle } from "../ui/shared";
import { DataActions } from "../ui/DataActions";
import { defaults, fresh } from "../core/state";
import type { Settings as SettingsType } from "../core/types";
export function Settings() {
  const { local, updateLocal, update, notify, game } = useApp();
  const s = local.settings;
  function set<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    updateLocal((g) => ({ ...g, settings: { ...g.settings, [key]: value } }));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <SlidersHorizontal size={14} />
            Make it yours
          </div>
          <h1>
            Settings<span className="heading-dot">.</span>
          </h1>
          <p>Set the ground rules for {game.name}. Saved automatically.</p>
        </div>
        <span className="saved-badge">
          <span className="live-dot" />
          On this device
        </span>
      </div>
      <div className="settings-layout">
        <section className="settings-section panel">
          <h2>
            <SlidersHorizontal size={19} />
            Randomization
          </h2>
          <Toggle checked={s.allActive} onChange={(v) => set("allActive", v)}>
            Include all active gems
            <small>Off limits the Skills tab and draws to main gems.</small>
          </Toggle>
          <label className="setting-row">
            <span>
              Cards on the table
              <small>
                Maximum per deck. Fewer unique results means fewer cards.
              </small>
            </span>
            <select
              value={s.cardCount}
              onChange={(e) => set("cardCount", Number(e.target.value))}
            >
              {[3, 6, 9, 12, 16, 24, 32, 48].includes(s.cardCount) ? null : (
                <option>{s.cardCount}</option>
              )}
              {[3, 6, 9, 12, 16, 24, 32, 48].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>
              Attribute compatibility
              <small>
                Affinity uses class starting attributes and gem requirements.
              </small>
            </span>
            <select
              value={s.compatibility}
              onChange={(e) =>
                set(
                  "compatibility",
                  e.target.value as SettingsType["compatibility"],
                )
              }
            >
              <option value="strict">Strict</option>
              <option value="weighted">Weighted</option>
              <option value="unrestricted">Unrestricted</option>
            </select>
          </label>
          <p className="help">
            Strict keeps gems sharing a dominant attribute with the class.
            Weighted gives those gems 3× weight. This is build affinity, not an
            equipment-level requirement check.
          </p>
          <Toggle
            checked={s.avoidRepeats}
            onChange={(v) => set("avoidRepeats", v)}
          >
            Avoid repeats
            <small>
              Exclude skills already selected during this visit to Randomizer.
            </small>
          </Toggle>
          <div className="settings-tip">
            Each Class, Ascendancy and Skill draw uses a fresh deck. In Pick 1
            of 3, choose three closed cards, reveal them, then keep one.
          </div>
        </section>
        <section className="settings-section panel">
          <h2>
            <Layers3 size={19} />
            Animation
          </h2>
          <p>The ritual before the reveal.</p>
          <label className="setting-row">
            <span>
              Animation style
              <small>New animation types can be added here.</small>
            </span>
            <select value={s.animation} onChange={() => {}}>
              <option value="card-deck">Card Deck</option>
            </select>
          </label>
          <label className="setting-row">
            <span>
              Shuffle duration<small>{s.duration.toFixed(1)} seconds</small>
            </span>
            <input
              type="range"
              min="0"
              max="6"
              step="0.2"
              value={s.duration}
              onChange={(e) => set("duration", Number(e.target.value))}
            />
          </label>
          <Toggle checked={s.skip} onChange={(v) => set("skip", v)}>
            Skip animations
            <small>Deal instantly. You still choose the cards.</small>
          </Toggle>
          <Toggle checked={s.sound} onChange={(v) => set("sound", v)}>
            Sound effects<small>A quiet tone when a card is revealed.</small>
          </Toggle>
          <Toggle checked={s.reduced} onChange={(v) => set("reduced", v)}>
            Reduced motion
            <small>Your system preference is always respected.</small>
          </Toggle>
          <Toggle checked={s.particles} onChange={(v) => set("particles", v)}>
            Particle effects
          </Toggle>
        </section>
        <section className="settings-section panel">
          <h2>
            <Database size={19} />
            Data management
          </h2>
          <p>Export a backup before switching browsers or devices.</p>
          <div className="actions">
            <DataActions />
            <button
              onClick={() => {
                if (
                  confirm(
                    "Reset this game’s global settings? Your database edits are preserved.",
                  )
                )
                  updateLocal((g) => ({
                    ...g,
                    settings: {
                      ...defaults,
                    },
                  }));
              }}
            >
              <RotateCcw size={15} />
              Reset to defaults
            </button>
            <button
              className="danger"
              onClick={() => {
                if (
                  confirm(
                    "Delete all local settings, exclusions, custom skills and challenges for every game?",
                  )
                ) {
                  update(() => fresh());
                  notify("All local data has been reset.");
                }
              }}
            >
              Reset local data
            </button>
          </div>
          <p className="help">
            Priority: database exclusions → randomization settings → quick
            filters → class affinity → repeat avoidance. Quick filters can
            narrow the global pool; they cannot re-enable excluded gems.
          </p>
          <details className="provenance">
            <summary>Data sources and snapshot notes</summary>
            <p>{game.version}</p>
            <p>
              PoE 1 gems use the supplied RePoE snapshot. PoE 2 uses RePoE
              requirement weights. Legacy of Phrecia shares the PoE 1 gem
              catalog with its own class and Ascendancy data.
            </p>
            <a
              href="https://repoe-fork.github.io/"
              target="_blank"
              rel="noreferrer"
            >
              RePoE data
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/grindinggear/skilltree-export"
              target="_blank"
              rel="noreferrer"
            >
              GGG skill tree exports
            </a>
          </details>
        </section>
      </div>
    </>
  );
}
