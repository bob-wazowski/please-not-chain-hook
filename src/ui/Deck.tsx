import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layers3, Shuffle, FastForward, Zap } from "lucide-react";
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
  revealCount,
  prepare,
  onChoose,
  kind,
}: {
  settings: Settings;
  revealCount?: number;
  prepare: () => CardOption[];
  onChoose: (card: CardOption) => void;
  kind: string;
}) {
  const [cards, setCards] = useState<CardOption[]>([]),
    [phase, setPhase] = useState<
      "idle" | "shuffle" | "choose" | "keep" | "done"
    >("idle"),
    [revealed, setRevealed] = useState<number[]>([]),
    [chosen, setChosen] = useState(-1),
    [error, setError] = useState(""),
    [dealing, setDealing] = useState(false);
  const board = useRef<HTMLDivElement>(null),
    restoreFocus = useRef(false),
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
      if (
        revealCount !== undefined &&
        kind === "Skill" &&
        next.length < revealCount
      )
        throw Error(
          `This draw has ${next.length} cards. Lower Cards to reveal or broaden your filters.`,
        );
      setCards(next);
      setRevealed([]);
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
  useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    const selector =
      phase === "keep" ? ".card-select" : "button.draw-card:not(:disabled)";
    board.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  }, [phase, revealed]);
  const revealTarget =
    revealCount === undefined ? 1 : Math.min(revealCount, cards.length);
  function keep(i: number) {
    setChosen(i);
    setPhase("done");
    tone();
    onChoose(cards[i]);
  }
  function pick(i: number, keyboard: boolean) {
    if (revealCount === undefined) {
      keep(i);
      return;
    }
    restoreFocus.current = keyboard;
    const next = [...revealed, i];
    setRevealed(next);
    if (next.length === revealTarget) setPhase("keep");
    tone();
  }
  const empty = phase === "idle";
  const showShortlist =
    revealCount !== undefined && (phase === "keep" || phase === "done");
  const visibleCards = cards
    .map((card, index) => ({ card, index }))
    .filter(({ index }) => !showShortlist || revealed.includes(index));
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
          {empty ? `Up to ${settings.cardCount}` : visibleCards.length} cards
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
          className={`draw-grid ${visibleCards.length <= 3 ? "short-deck" : ""} ${phase === "shuffle" ? "in-motion" : ""}`}
          aria-label={`${kind} cards`}
        >
          {visibleCards.map(({ card: c, index: i }) => {
            const face = revealed.includes(i) || chosen === i;
            const className = `draw-card ${chosen === i ? "marked" : ""} ${face ? "face-up" : ""} ${phase === "done" && !face ? "unpicked" : ""}`;
            const rank = String(i + 1).padStart(2, "0");
            if (face) {
              return (
                <div key={c.id} className={className}>
                  {phase === "keep" && (
                    <button
                      type="button"
                      className="card-select"
                      aria-label={`Select ${c.name}`}
                      onClick={() => keep(i)}
                    />
                  )}
                  <span className="card-corner" aria-hidden="true">
                    {rank}
                  </span>
                  {c.skill ? (
                    <GemDiamond skill={c.skill} />
                  ) : (
                    <Layers3 size={25} />
                  )}
                  <strong>
                    {c.skill ? <GemLink skill={c.skill} /> : c.name}
                  </strong>
                  <small>{c.subtitle}</small>
                </div>
              );
            }
            return (
              <button
                key={c.id}
                className={className}
                disabled={phase !== "choose"}
                aria-label={`Face-down card ${i + 1}`}
                onClick={(event) => pick(i, event.detail === 0)}
              >
                <span className="card-corner" aria-hidden="true">
                  {rank}
                </span>
                <span className="card-seal">
                  <Zap size={23} />
                </span>
                <span className="card-wordmark">PNCH</span>
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
              ? revealCount !== undefined
                ? `${revealed.length} of ${revealTarget} cards revealed. Choose a face-down card.`
                : "Choose any card to reveal your result."
              : phase === "keep"
                ? "Click a revealed card to choose it."
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
      </div>
      <div className="deck-bottomline">
        <span>Unique cards. No duplicates.</span>
        <span>
          {revealCount === undefined
            ? "Pick 1"
            : `Reveal ${empty ? revealCount : revealTarget}, then keep 1`}
        </span>
      </div>
    </section>
  );
}
