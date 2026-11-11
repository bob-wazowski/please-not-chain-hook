import { useState } from "react";
import { Trophy, Play, RotateCcw, ArrowRight } from "lucide-react";
import type { Skill } from "../core/types";
import { GemDiamond, GemLink } from "./shared";
export function Tournament({
  pool,
  onWinner,
  onStart,
  prepare,
}: {
  pool: Skill[];
  onWinner: (s: Skill) => void;
  onStart: () => void;
  prepare: (count: number) => Skill[];
}) {
  const [size, setSize] = useState(8),
    [rounds, setRounds] = useState<(Skill | null)[][]>([]),
    [error, setError] = useState("");
  function start() {
    if (pool.length < size) {
      setError(
        `This bracket needs ${size} unique skills. Only ${pool.length} are available.`,
      );
      return;
    }
    const first = prepare(size);
    const r: (Skill | null)[][] = [first];
    for (let n = size / 2; n >= 1; n /= 2) r.push(Array(n).fill(null));
    setRounds(r);
    setError("");
    onStart();
  }
  function choose(round: number, match: number, g: Skill) {
    if (rounds[round + 1][match]) return;
    const next = rounds.map((r) => [...r]);
    next[round + 1][match] = g;
    setRounds(next);
    if (next[round + 1].length === 1) onWinner(g);
  }
  return (
    <section className="tournament panel">
      <div className="section-heading">
        <div>
          <h2>
            <Trophy size={19} />
            Skill Tournament
          </h2>
          <p>
            Choose the winner of each match. Follow the bracket to the final.
          </p>
        </div>
        <div className="row">
          <label className="sr-only" htmlFor="bracket-size">
            Participants
          </label>
          <select
            id="bracket-size"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {[8, 16, 32, 64].map((n) => (
              <option key={n} value={n}>
                {n} participants
              </option>
            ))}
          </select>
          <button className="primary" onClick={start}>
            {rounds.length ? <RotateCcw size={15} /> : <Play size={15} />}{" "}
            {rounds.length ? "New bracket" : "Start tournament"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {rounds.length > 0 ? (
        <div
          className="bracket-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tournament bracket. Scroll horizontally to see every round."
        >
          <div className="bracket-board">
            {rounds.map((round, r) => {
              const final = r === rounds.length - 2,
                semi = r === rounds.length - 3;
              return (
                <div
                  className={`bracket-round ${final ? "final-round" : ""} ${semi ? "semifinal-round" : ""}`}
                  key={r}
                >
                  <h3>
                    {round.length === 1
                      ? "Champion"
                      : final
                        ? "Final"
                        : semi
                          ? "Semifinals"
                          : `Round ${r + 1}`}
                  </h3>
                  <div
                    className="round-matches"
                    style={{
                      height: (rounds[0].length / 2) * 110,
                      gridTemplateRows: `repeat(${Math.max(1, round.length / 2)}, 1fr)`,
                    }}
                  >
                    {round.length === 1 ? (
                      <div className="champion">
                        {round[0] ? (
                          <>
                            <Trophy size={30} />
                            <GemDiamond skill={round[0]} />
                            <strong>
                              <GemLink skill={round[0]} />
                            </strong>
                          </>
                        ) : (
                          <>
                            <Trophy size={30} />
                            <span>Awaiting a champion</span>
                          </>
                        )}
                      </div>
                    ) : (
                      Array.from({ length: round.length / 2 }, (_, m) => {
                        const winner = rounds[r + 1][m];
                        return (
                          <div
                            className="bracket-match"
                            key={m}
                            style={
                              {
                                "--slot": `${110 * 2 ** r}px`,
                              } as React.CSSProperties
                            }
                          >
                            {[round[m * 2], round[m * 2 + 1]].map((g, j) => (
                              <div
                                key={j}
                                className={`bracket-entry ${g && winner?.id === g.id ? "winner" : ""}`}
                              >
                                {g ? (
                                  <>
                                    <GemDiamond skill={g} size="small" />
                                    <GemLink skill={g} />
                                    <button
                                      type="button"
                                      className="icon-button"
                                      disabled={
                                        !round[m * 2] ||
                                        !round[m * 2 + 1] ||
                                        !!winner
                                      }
                                      aria-label={`Advance ${g.name}`}
                                      onClick={() => choose(r, m, g)}
                                    >
                                      {winner?.id === g.id ? (
                                        <Trophy size={13} />
                                      ) : (
                                        <ArrowRight size={13} />
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <span>Awaiting winner</span>
                                )}
                              </div>
                            ))}
                            {m % 2 === 0 && !final && (
                              <span className="bracket-join" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="tournament-placeholder">
          <Trophy size={42} />
          <h3>Every skill gets a shot.</h3>
          <p>
            Start with 8, 16, 32 or 64 gems. Only one becomes your next build.
          </p>
        </div>
      )}
    </section>
  );
}
