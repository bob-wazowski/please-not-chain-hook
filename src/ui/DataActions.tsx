import { useRef } from "react";
import { Upload, Download } from "lucide-react";
import { useApp } from "./context";
import { parseState } from "../core/state";
import { download } from "../core/share";
export function DataActions() {
  const { state, update, notify } = useApp();
  const file = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={() =>
          download(
            new Blob([JSON.stringify(state, null, 2)], {
              type: "application/json",
            }),
            "pnch-settings.json",
          )
        }
      >
        <Download size={15} />
        Export settings
      </button>
      <button onClick={() => file.current?.click()}>
        <Upload size={15} />
        Import settings
      </button>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Import settings file"
        onChange={async (e) => {
          const input = e.target,
            f = input.files?.[0];
          if (!f) return;
          try {
            if (f.size > 3_000_000) throw Error("Settings file is too large.");
            const parsed = parseState(await f.text());
            if (
              confirm(
                "Replace settings and custom data for all games with this file?",
              )
            ) {
              update(() => parsed);
              notify("Settings imported successfully.");
            }
          } catch {
            notify(
              "Import rejected: invalid format, unsupported version, or unsafe custom data. Your current settings were preserved.",
            );
          } finally {
            input.value = "";
          }
        }}
      />
    </>
  );
}
