import type { Result } from "./types";
import { resultSchema } from "./state";
export function encodeResult(result: Result): string {
  const bytes = new TextEncoder().encode(JSON.stringify(result));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function decodeResult(raw: string): Result {
  if (raw.length > 24000) throw Error("This shared result is too large.");
  const bin = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
  return resultSchema.parse(
    JSON.parse(
      new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))),
    ),
  );
}
export function resultText(r: Result, game: string): string {
  return [
    "Please, Not Chain Hook",
    game,
    r.skill?.name,
    [r.className, r.ascendancy].filter(Boolean).join(" / "),
    r.skill?.archetypes.join(", "),
    ...r.challenges.map((c) => c.name),
  ]
    .filter(Boolean)
    .join("\n");
}
export function download(content: Blob, name: string) {
  const url = URL.createObjectURL(content),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadCard(
  result: Result,
  game: string,
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const c = canvas.getContext("2d");
  if (!c) throw Error("PNG export is not available in this browser.");
  const lines: { text: string; size: number; color: string; y: number }[] = [];
  let y = 285;
  function add(text: string, size: number, color: string) {
    c!.font = `${size}px sans-serif`;
    let row = "";
    for (const char of text) {
      if (c!.measureText(row + char).width > 980) {
        lines.push({ text: row, size, color, y });
        y += size * 1.35;
        row = "";
      }
      row += char;
    }
    if (row) lines.push({ text: row, size, color, y });
    y += size * 1.5;
  }
  add(result.skill?.name ?? "Your next exile", 54, "#f0eaf7");
  add(
    [result.className, result.ascendancy].filter(Boolean).join(" / "),
    32,
    "#c5b6da",
  );
  add(result.skill?.archetypes.join(" · ") ?? "", 24, "#a9a2b8");
  y += 30;
  for (const challenge of result.challenges)
    add("• " + challenge.name, 24, "#e2dce9");
  canvas.height = Math.max(900, Math.ceil(y + 170));
  c.fillStyle = "#14121e";
  c.fillRect(0, 0, 1200, canvas.height);
  const gradient = c.createLinearGradient(0, 0, 1200, canvas.height);
  gradient.addColorStop(0, "#332840");
  gradient.addColorStop(1, "#171822");
  c.fillStyle = gradient;
  c.fillRect(28, 28, 1144, canvas.height - 56);
  c.strokeStyle = "#716084";
  c.strokeRect(50, 50, 1100, canvas.height - 100);
  c.fillStyle = "#b9a1e4";
  c.font = "bold 30px sans-serif";
  c.fillText("PNCH / Please, Not Chain Hook", 95, 120);
  c.fillStyle = "#aaa3bb";
  c.font = "24px sans-serif";
  c.fillText(game, 95, 170);
  for (const line of lines) {
    c.font = `${line.size}px sans-serif`;
    c.fillStyle = line.color;
    c.fillText(line.text, 95, line.y);
  }
  c.font = "20px sans-serif";
  c.fillStyle = "#aaa3bb";
  c.fillText("One draw. A different way to play.", 95, canvas.height - 90);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/png"),
  );
  if (!blob) throw Error("Could not export PNG.");
  download(blob, "pnch-result.png");
}
