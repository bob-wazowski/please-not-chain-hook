import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
test("Production bundle works below a GitHub Pages repository path and reloads hash routes", async ({
  page,
}) => {
  const root = resolve("dist");
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url!, "http://localhost").pathname,
      );
      if (!pathname.startsWith("/pnch/")) {
        res.writeHead(404).end();
        return;
      }
      const file = resolve(root, pathname.slice(6) || "index.html");
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        (
          {
            ".js": "text/javascript",
            ".css": "text/css",
            ".html": "text/html",
            ".png": "image/png",
            ".svg": "image/svg+xml",
          } as Record<string, string>
        )[extname(file)] ?? "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/pnch/`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + "#database");
    await expect(
      page.getByRole("heading", { name: "Database." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".skill-group").first()).toBeVisible();
    await page.goto(base + "#randomizer");
    await page.getByRole("button", { name: "Shuffle & deal" }).click();
    await page.getByRole("button", { name: "Skip animation" }).click();
    await expect(page.locator(".draw-card").first()).toBeEnabled();
    await page.locator(".draw-card").first().click();
    await page.getByRole("button", { name: "Share result" }).click();
    await page.getByText("Result text and link", { exact: true }).click();
    const link = await page
      .getByRole("textbox", { name: "Share link", exact: true })
      .inputValue();
    expect(link).toContain("/pnch/#result=");
    await page.goto(link);
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
