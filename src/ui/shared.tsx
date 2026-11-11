import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Gem, Download, Copy, Link, Check } from "lucide-react";
import type { GameId, Skill, Result } from "../core/types";
import { catalog, games, title } from "../core/data";
import { downloadCard, encodeResult, resultText } from "../core/share";
import { useApp } from "./context";
export function GemDiamond({
  skill,
  size = "normal",
}: {
  skill: Skill;
  size?: string;
}) {
  const color =
    skill.color ??
    catalog(skill.id.startsWith("poe2:") ? "poe2" : "poe1").find(
      (gem) => gem.id === skill.id,
    )?.color ??
    "all";
  return <span className={`gem-diamond ${size} gem-${color}`} aria-hidden="true" />;
}

export function GemLink({ skill, gameId }: { skill: Skill; gameId?: GameId }) {
  const { game } = useApp();
  const wiki = (gameId ?? game.id) === "poe2" ? "poe2wiki.net" : "poewiki.net";
  const href =
    skill.wiki ||
    `https://www.${wiki}/w/index.php?search=${encodeURIComponent(skill.name)}`;
  return (
    <a className="gem-link" href={href} target="_blank" rel="noreferrer">
      {skill.name}
    </a>
  );
}
export function Chips({
  values,
  selected,
  onChange,
}: {
  values: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  return (
    <div className="chips">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={`chip ${selected.includes(v) ? "selected" : ""}`}
          aria-pressed={selected.includes(v)}
          onClick={() =>
            onChange(
              selected.includes(v)
                ? selected.filter((s) => s !== v)
                : [...selected, v],
            )
          }
        >
          {title(v)}
        </button>
      ))}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="toggle">
      <span>{children}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function Modal({
  title: heading,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="modal-head">
        <h2>{heading}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({
  title: heading,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Gem size={35} />
      <h3>{heading}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ShareModal({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [copied, setCopied] = useState("");
  const name = games.find((g) => g.id === result.game)?.name ?? result.game;
  const known = games
    .find((g) => g.id === result.game)
    ?.classes.find((c) => c.name === result.className);
  const unknown =
    result.ascendancy && !known?.ascendancies.includes(result.ascendancy);
  async function copy(link: boolean) {
    try {
      const url =
        location.href.split("#")[0] + "#result=" + encodeResult(result);
      await navigator.clipboard.writeText(
        link ? url : resultText(result, name),
      );
      setCopied(link ? "link" : "text");
    } catch {
      notify("Clipboard access is unavailable. Use the selectable text below.");
    }
  }
  return (
    <Modal title="Share your fate" onClose={onClose}>
      <div className="share-card">
        <div className="share-brand">
          PNCH <span>Please, Not Chain Hook</span>
        </div>
        <small>{name}</small>
        {result.skill && <GemDiamond skill={result.skill} size="large" />}
        <h2>
          {result.skill ? (
            <GemLink skill={result.skill} gameId={result.game} />
          ) : (
            "Your next exile"
          )}
        </h2>
        <p>
          {[result.className, result.ascendancy].filter(Boolean).join(" / ")}
        </p>
        <div className="tag-list">
          {result.skill?.archetypes.map((a) => (
            <span key={a}>{title(a)}</span>
          ))}
        </div>
        {result.challenges.length > 0 && (
          <ul>
            {result.challenges.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
        <small>One draw. A different way to play.</small>
      </div>
      {result.skill?.custom && (
        <p className="help">
          This custom skill is included in the share link. It does not alter the
          recipient’s database.
        </p>
      )}
      {unknown && (
        <p className="notice">
          This Ascendancy is not in the current local ruleset. The shared name
          is preserved.
        </p>
      )}
      <div className="actions">
        <button
          className="primary"
          onClick={() =>
            downloadCard(result, name).catch((e) => notify(e.message))
          }
        >
          <Download size={16} />
          Download PNG
        </button>
        <button onClick={() => copy(false)}>
          {copied === "text" ? <Check size={16} /> : <Copy size={16} />}Copy
          result
        </button>
        <button onClick={() => copy(true)}>
          {copied === "link" ? <Check size={16} /> : <Link size={16} />}Share
          link
        </button>
      </div>
      <details className="copy-fallback">
        <summary>Result text and link</summary>
        <textarea
          readOnly
          aria-label="Result text"
          value={resultText(result, name)}
        />
        <input
          readOnly
          aria-label="Share link"
          value={
            location.href.split("#")[0] + "#result=" + encodeResult(result)
          }
        />
      </details>
    </Modal>
  );
}
