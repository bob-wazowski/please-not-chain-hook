import { useState } from "react";
import { Swords, Shuffle, RotateCcw, Trash2, Plus, Share2 } from "lucide-react";
import { useApp } from "../ui/context";
import { categories, challengePool, fits } from "../core/challenges";
import { shuffled } from "../core/random";
import { Modal, Empty } from "../ui/shared";
import type { Challenge } from "../core/types";
export function Challenges() {
  const { game, local, updateLocal, share, notify } = useApp();
  const [cats, setCats] = useState([...categories]),
    [difficulty, setDifficulty] = useState(0),
    [count, setCount] = useState(3),
    [result, setResult] = useState<Challenge[]>([]),
    [adding, setAdding] = useState(false);
  const pool = challengePool(game.id, local.challenges, cats, difficulty);
  function generate() {
    const next: Challenge[] = [];
    for (const c of shuffled(pool)) {
      if (fits(c, next)) next.push(c);
      if (next.length === count) break;
    }
    setResult(next);
    if (next.length < count)
      notify(
        `Only ${next.length} compatible conditions are available. Add categories or lower the requested count.`,
      );
  }
  function reroll(i: number) {
    const c = shuffled(pool).find(
      (c) =>
        c.id !== result[i].id &&
        fits(
          c,
          result.filter((_, j) => j !== i),
        ),
    );
    if (c) setResult((r) => r.map((x, j) => (j === i ? c : x)));
    else notify("No alternative compatible condition is available.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Swords size={14} />
            Raise the stakes
          </div>
          <h1>
            Challenges<span className="heading-dot">.</span>
          </h1>
          <p>A new build is only the beginning. Give it an ordeal.</p>
        </div>
        <button onClick={() => setAdding(true)}>
          <Plus size={16} />
          Custom challenge
        </button>
      </div>
      <div className="challenge-layout">
        <aside className="panel challenge-controls">
          <h2>Set your limits</h2>
          <div className="setting-block">
            <span>Categories</span>
            {categories.map((c) => (
              <label className="check" key={c}>
                <input
                  type="checkbox"
                  checked={cats.includes(c)}
                  onChange={(e) =>
                    setCats(
                      e.target.checked
                        ? [...cats, c]
                        : cats.filter((x) => x !== c),
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            >
              <option value="0">Any difficulty</option>
              <option value="1">Standard</option>
              <option value="2">Up to hard</option>
              <option value="3">Up to brutal</option>
            </select>
          </label>
          <label>
            Number of conditions
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            onClick={generate}
            disabled={!pool.length}
          >
            <Shuffle size={17} />
            Generate challenge
          </button>
          <small>{pool.length} available conditions</small>
        </aside>
        <section className="challenge-results">
          <div className="section-heading">
            <h2>Your ordeal</h2>
            {result.length > 0 && (
              <button
                onClick={() =>
                  share({ version: 1, game: game.id, challenges: result })
                }
              >
                <Share2 size={15} />
                Share
              </button>
            )}
          </div>
          {!result.length ? (
            <Empty title="Every exile needs a challenge">
              Choose your categories and generate an ordeal.
            </Empty>
          ) : (
            result.map((c, i) => (
              <article className="challenge-card" key={c.id}>
                <span className="challenge-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="badge">{c.category}</span>
                  <h3>{c.name}</h3>
                  <small>
                    {["", "Standard", "Hard", "Brutal"][c.difficulty]}
                    {c.custom ? " · Custom" : ""}
                  </small>
                </div>
                <div className="challenge-actions">
                  <button
                    className="icon-button"
                    aria-label={`Reroll ${c.name}`}
                    onClick={() => reroll(i)}
                  >
                    <RotateCcw size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() =>
                      setResult((r) => r.filter((x) => x.id !== c.id))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          )}
          {local.challenges.length > 0 && (
            <div className="panel custom-challenges">
              <h3>Custom conditions</h3>
              {local.challenges.map((c) => (
                <div className="row space" key={c.id}>
                  <span>{c.name}</span>
                  <button
                    className="icon-button"
                    aria-label={`Delete custom challenge ${c.name}`}
                    onClick={() =>
                      updateLocal((s) => ({
                        ...s,
                        challenges: s.challenges.filter((x) => x.id !== c.id),
                      }))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {adding && <CustomChallenge onClose={() => setAdding(false)} />}
    </>
  );
}
function CustomChallenge({ onClose }: { onClose: () => void }) {
  const { game, local, updateLocal } = useApp();
  const [name, setName] = useState(""),
    [category, setCategory] = useState(categories[0]),
    [difficulty, setDifficulty] = useState(2),
    [conflicts, setConflicts] = useState<string[]>([]);
  const all = challengePool(game.id, local.challenges, categories, 0);
  return (
    <Modal title="Create a challenge" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          updateLocal((s) => ({
            ...s,
            challenges: [
              ...s.challenges,
              {
                id: "custom:" + crypto.randomUUID(),
                name: name.trim(),
                category,
                difficulty,
                games: [game.id],
                conflicts,
                custom: true,
              },
            ],
          }));
          onClose();
        }}
      >
        <label>
          Condition
          <input
            required
            autoFocus
            maxLength={140}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Use only self-crafted weapons"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          >
            <option value="1">Standard</option>
            <option value="2">Hard</option>
            <option value="3">Brutal</option>
          </select>
        </label>
        <details>
          <summary>Incompatible conditions</summary>
          {all.map((c) => (
            <label className="check" key={c.id}>
              <input
                type="checkbox"
                checked={conflicts.includes(c.id)}
                onChange={(e) =>
                  setConflicts(
                    e.target.checked
                      ? [...conflicts, c.id]
                      : conflicts.filter((x) => x !== c.id),
                  )
                }
              />
              {c.name}
            </label>
          ))}
        </details>
        <p className="help">
          Saved for {game.name}. Mark conflicts explicitly; custom free-text
          conditions cannot be checked automatically.
        </p>
        <button className="primary">Add challenge</button>
      </form>
    </Modal>
  );
}
