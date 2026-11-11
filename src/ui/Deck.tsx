import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layers3, Shuffle, FastForward, Check, Zap } from "lucide-react";
import type { Settings, Skill } from "../core/types";
import { GemDiamond, GemLink } from "./shared";
import { deckMotion } from "./deckMotion";
export interface CardOption {
  id: string;
  name: string;
  subtitle?: string;
  skill?: Skill;
  className?: string;
}
export function Deck({
  settings,
  pickThree,
  prepare,
  onChoose,
  kind,
}: {
  settings: Settings;
  pickThree: boolean;
  prepare: () => CardOption[];
  onChoose: (card: CardOption) => void;
  kind: string;
}) {
  const [cards, setCards] = useState<CardOption[]>([]),
    [phase, setPhase] = useState<
      "idle" | "shuffle" | "choose" | "reveal" | "done"
    >("idle"),
    [marked, setMarked] = useState<number[]>([]),
    [chosen, setChosen] = useState(-1),
    [error, setError] = useState(""),
    [dealing, setDealing] = useState(false);
  const board = useRef<HTMLDivElement>(null),
    animations = useRef<Animation[]>([]),
    token = useRef(0),
    sound = useRef<AudioContext | null>(null);
  const reduce =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    settings.reduced ||
    settings.skip;
  useEffect(
    () => () => {
      token.current++;
      animations.current.forEach((a) => a.cancel());
      void sound.current?.close();
    },
    [],
  );
  function tone() {
    if (!settings.sound) return;
    try {
      const a = sound.current ?? new AudioContext();
      sound.current = a;
      void a.resume();
      const osc = a.createOscillator(),
        gain = a.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, a.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, a.currentTime + 0.14);
      gain.gain.setValueAtTime(0.035, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + 0.23);
    } catch {
      /* Sound is optional. */
    }
  }
  function start() {
    try {
      const next = prepare();
      if (!next.length)
        throw Error("No results are available. Adjust your filters.");
      if (pickThree && next.length < 3)
        throw Error(
          "Pick 1 of 3 needs three unique results. Broaden the pool or use Absolute Random.",
        );
      setCards(next);
      setMarked([]);
      setChosen(-1);
      setError("");
      setPhase(reduce || settings.duration === 0 ? "choose" : "shuffle");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useLayoutEffect(() => {
    if (phase !== "shuffle" || !board.current) return;
    const id = ++token.current;
    const container = board.current.getBoundingClientRect();
    setDealing(false);
    const dealTimer = window.setTimeout(
      () => setDealing(true),
      settings.duration * 1000,
    );
    animations.current = [
      ...board.current.querySelectorAll<HTMLButtonElement>(".draw-card"),
    ].map((b, i) => {
      const motion = deckMotion(
        b.getBoundingClientRect(),
        container,
        i,
        cards.length,
        settings.duration,
      );
      return b.animate(motion.frames, {
        duration: motion.duration,
        fill: "both",
      });
    });
    void Promise.allSettled(animations.current.map((a) => a.finished)).then(
      () => {
        if (token.current === id) setPhase("choose");
      },
    );
    return () => {
      window.clearTimeout(dealTimer);
      token.current++;
      animations.current.forEach((a) => a.cancel());
      animations.current = [];
    };
  }, [phase, settings.duration, cards.length]);
  function pick(i: number) {
    if (phase === "reveal" || !pickThree) {
      setChosen(i);
      setMarked([i]);
      setPhase("done");
      tone();
      onChoose(cards[i]);
      return;
    }
    setMarked((v) =>
      v.includes(i) ? v.filter((x) => x !== i) : v.length < 3 ? [...v, i] : v,
    );
  }
  const empty = phase === "idle";
  return (
    <section
      className={`deck-stage ${settings.particles ? "with-particles" : ""} ${reduce ? "motion-off" : ""}`}
    >
      <div className="deck-topline">
        <span>
          <Layers3 size={15} />
          {kind} deck
        </span>
        <span>
          {empty ? `Up to ${settings.cardCount}` : cards.length} cards
        </span>
      </div>
      {empty ? (
        <div className="deck-intro">
          <div className="stack-art" aria-hidden="true">
            <span />
            <span />
            <span>
              <Zap size={40} />
            </span>
          </div>
          <h2>A different build is waiting.</h2>
          <p>
            Shuffle the deck. Choose a card.
            <br />
            Let the unexpected take it from there.
          </p>
        </div>
      ) : (
        <div
          ref={board}
          className={`draw-grid ${cards.length <= 3 ? "short-deck" : ""} ${phase === "shuffle" ? "in-motion" : ""}`}
          aria-label={`${kind} cards`}
        >
          {cards.map((c, i) => {
            const face =
              (phase === "reveal" && marked.includes(i)) ||
              (phase === "done" && chosen === i);
            const className = `draw-card ${marked.includes(i) ? "marked" : ""} ${face ? "face-up" : ""} ${phase === "done" && chosen !== i ? "unpicked" : ""}`;
            const rank = String(i + 1).padStart(2, "0");
            if (face && c.skill) {
              return (
                <div key={c.id} className={className}>
                  <span className="card-corner" aria-hidden="true">
                    {rank}
                  </span>
                  <GemDiamond skill={c.skill} />
                  <strong>
                    <GemLink skill={c.skill} />
                  </strong>
                  <small>{c.subtitle}</small>
                  {phase === "reveal" && (
                    <button
                      className="keep-card"
                      aria-label={`Keep ${c.name}`}
                      onClick={() => pick(i)}
                    >
                      Keep
                    </button>
                  )}
                </div>
              );
            }
            return (
              <button
                key={c.id}
                className={className}
                disabled={
                  phase === "shuffle" ||
                  phase === "done" ||
                  (phase === "reveal" && !marked.includes(i))
                }
                aria-label={face ? c.name : `Face-down card ${i + 1}`}
                aria-pressed={marked.includes(i)}
                onClick={() => pick(i)}
              >
                <span className="card-corner" aria-hidden="true">
                  {rank}
                </span>
                {face ? (
                  <>
                    <Layers3 size={25} />
                    <strong>{c.name}</strong>
                    <small>{c.subtitle}</small>
                  </>
                ) : (
                  <>
                    <span className="card-seal">
                      <Zap size={23} />
                    </span>
                    <span className="card-wordmark">PNCH</span>
                    {marked.includes(i) && (
                      <Check className="mark-check" size={16} />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="deck-status" aria-live="polite">
        {phase === "idle"
          ? "Your choice. Your fate."
          : phase === "shuffle"
            ? dealing
              ? "Dealing your cards…"
              : "Shuffling the deck…"
            : phase === "choose"
              ? pickThree
                ? `${marked.length} of 3 cards selected. Their contents stay hidden until you reveal.`
                : "Choose any card to reveal your result."
              : phase === "reveal"
                ? "Choose one of the three revealed cards."
                : "Result locked in."}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="deck-actions">
        {phase === "idle" && (
          <button className="primary large" onClick={start}>
            <Shuffle size={17} />
            Shuffle & deal
          </button>
        )}
        {phase === "shuffle" && (
          <button onClick={() => animations.current.forEach((a) => a.finish())}>
            <FastForward size={16} />
            Skip animation
          </button>
        )}
        {phase === "choose" && pickThree && (
          <button
            className="primary"
            disabled={marked.length !== 3}
            onClick={() => {
              tone();
              setPhase("reveal");
            }}
          >
            Reveal 3 cards
          </button>
        )}
      </div>
      <div className="deck-bottomline">
        <span>Unique cards. No duplicates.</span>
        <span>Pick {pickThree ? "3, then keep 1" : "1"}</span>
      </div>
    </section>
  );
}
