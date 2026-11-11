import { useEffect, useRef, useState } from "react";
import {
  Layers3,
  Swords,
  Library,
  Settings2,
  Zap,
  ChevronRight,
  ExternalLink,
  X,
  Menu,
} from "lucide-react";
import { games } from "./core/data";
import { loadState, saveState } from "./core/state";
import type { AppState, Result } from "./core/types";
import { decodeResult } from "./core/share";
import { AppContext } from "./ui/context";
import { ShareModal } from "./ui/shared";
import { Randomizer } from "./pages/Randomizer";
import { Database } from "./pages/Database";
import { Settings } from "./pages/Settings";
import { Challenges } from "./pages/Challenges";
const pages = [
  ["randomizer", "Randomizer", Layers3],
  ["challenges", "Challenges", Swords],
  ["database", "Database", Library],
  ["settings", "Settings", Settings2],
] as const;
function route() {
  const hash = location.hash.slice(1);
  return pages.some((p) => p[0] === hash) ? hash : "randomizer";
}
function withAvailableGame(state: AppState): AppState {
  return games.some((game) => game.id === state.game && game.available)
    ? state
    : { ...state, game: "poe1" };
}
export default function App() {
  const initial = useRef(loadState());
  const [state, setState] = useState(() =>
      withAvailableGame(initial.current.state),
    ),
    [page, setPage] = useState(route),
    [message, setMessage] = useState(initial.current.warning),
    [shared, setShared] = useState<Result | null>(null),
    [menu, setMenu] = useState(false),
    [saveError, setSaveError] = useState(false);
  const first = useRef(true);
  const game = games.find((g) => g.id === state.game)!;
  const local = state.games[state.game];
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveError(!saveState(state));
  }, [state]);
  useEffect(() => {
    function hash() {
      if (location.hash.startsWith("#result=")) {
        try {
          setShared(decodeResult(location.hash.slice(8)));
          setPage("randomizer");
        } catch {
          setMessage("This shared result is invalid or damaged.");
        }
      } else setPage(route());
    }
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  const update = (fn: (s: AppState) => AppState) =>
    setState((s) => withAvailableGame(fn(s)));
  return (
    <AppContext.Provider
      value={{
        state,
        game,
        local,
        update,
        updateLocal: (fn) =>
          setState((s) => ({
            ...s,
            games: { ...s.games, [s.game]: fn(s.games[s.game]) },
          })),
        notify: setMessage,
        share: setShared,
      }}
    >
      <div className={`app-shell ${menu ? "menu-open" : ""}`}>
        <button
          className="icon-button mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          aria-controls="sidebar"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <aside className="sidebar" id="sidebar">
          <a href="#randomizer" className="brand">
            <span className="brand-mark">
              <Zap fill="currentColor" size={26} />
            </span>
            <span>
              PNCH<small>Please, Not Chain Hook</small>
            </span>
          </a>
          <span className="sidebar-caption">Your next exile starts here</span>
          <nav aria-label="Main navigation">
            {pages.map(([id, label, Icon]) => (
              <a
                key={id}
                href={"#" + id}
                aria-current={page === id ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {page === id && (
                  <ChevronRight className="nav-arrow" size={15} />
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <label className="game-picker">
              <select
                aria-label="Game / Ruleset"
                value={state.game}
                onChange={(e) => {
                  const selected = games.find((g) => g.id === e.target.value);
                  if (!selected?.available) return;
                  setState((s) => ({ ...s, game: selected.id }));
                  setMessage("");
                  setMenu(false);
                }}
              >
                {games
                  .filter((g) => g.id !== "phrecia")
                  .map((g) => (
                    <option key={g.id} value={g.id} disabled={!g.available}>
                      {g.id === "poe1" ? "PoE 1" : "PoE 2"}
                    </option>
                  ))}
              </select>
            </label>
            <a href="https://www.poewiki.net/" target="_blank" rel="noreferrer">
              PoE Wiki <ExternalLink size={13} />
            </a>
            <small>
              Unofficial fan project.
              <br />
              Not affiliated with Grinding Gear Games.
            </small>
          </div>
        </aside>
        <div className="app-content">
          {saveError && (
            <div className="notice" role="alert">
              Your browser could not save changes. Export settings before
              closing this tab.
            </div>
          )}
          {message && (
            <div className="notice toast" role="status">
              <span>{message}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <main
            key={state.game}
            className={page === "randomizer" ? "random-page" : undefined}
          >
            {!game.available ? (
              <div className="coming-soon">
                <Layers3 size={40} />
                <h1>{game.name}</h1>
                <h2>Coming Soon</h2>
                <p>
                  Verified data for this ruleset is not available yet. Choose
                  another game to continue.
                </p>
              </div>
            ) : page === "database" ? (
              <Database />
            ) : page === "settings" ? (
              <Settings />
            ) : page === "challenges" ? (
              <Challenges />
            ) : (
              <Randomizer />
            )}
          </main>
        </div>
      </div>
      {shared && (
        <ShareModal
          result={shared}
          onClose={() => {
            setShared(null);
            if (location.hash.startsWith("#result="))
              location.hash = "randomizer";
          }}
        />
      )}
    </AppContext.Provider>
  );
}
