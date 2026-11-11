import { test, expect } from "@playwright/test";
import { fresh } from "../../src/core/state";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("Animation can be skipped, replayed and controlled with the keyboard", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await page.getByRole("button", { name: "Skip animation" }).click();
  await expect(page.locator(".draw-card").first()).toBeEnabled();
  await page.locator(".draw-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".result-panel")).toBeVisible();
  await page.getByRole("button", { name: "Draw again" }).click();
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.locator(".draw-card").first()).toBeEnabled({
    timeout: 10000,
  });
  await page.locator(".draw-card").first().click();
  await expect(page.locator(".result-panel")).toBeVisible();
});
test("Reduced motion preserves manual selection and settings cap the count", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Cards on the table").selectOption("6");
  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.locator(".draw-card")).toHaveCount(6);
  await expect(page.locator(".draw-card").first()).toBeEnabled();
  await expect(page.locator(".result-panel")).toHaveCount(0);
});
test("Impossible filters and insufficient pick-three pools show errors", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pick 1 of 3", exact: true }).click();
  await page.getByRole("button", { name: "Melee", exact: true }).click();
  await page.getByText("More filters", { exact: true }).click();
  await page.getByRole("button", { name: "Chaos", exact: true }).click();
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await page.getByRole("button", { name: "Skip animation" }).click();
  await expect(page.locator(".draw-card").first()).toBeEnabled();
});
test("Invalid settings imports preserve state; blocked storage remains usable", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import settings file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Import rejected" }),
  ).toBeVisible();
  await expect(page.getByLabel("Cards on the table")).toHaveValue("12");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.reload();
  await page.getByLabel("Cards on the table").selectOption("6");
  await expect(page.getByRole("alert")).toContainText("could not save");
  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.locator(".draw-card")).toHaveCount(6);
});
test("Every tournament size renders exact match counts and joins aligned to rounds", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Skill Tournament", exact: true })
    .click();
  for (const size of [8, 16, 32, 64]) {
    await page.getByLabel("Participants").selectOption(String(size));
    await page
      .getByRole("button", { name: /Start tournament|New bracket/ })
      .click();
    await expect(page.locator(".bracket-match")).toHaveCount(size - 1);
    await expect(page.locator(".bracket-round")).toHaveCount(
      Math.log2(size) + 1,
    );
    const heights = await page
      .locator(".round-matches")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect().height),
      );
    expect(new Set(heights).size).toBe(1);
  }
  await page.screenshot({
    path: "test-results/pnch-tournament.png",
    fullPage: true,
  });
});
test("A saved disabled ruleset falls back to PoE 1", async ({ page }) => {
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Cards on the table").selectOption("24");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("pnch:v1")!);
    saved.game = "phrecia";
    localStorage.setItem("pnch:v1", JSON.stringify(saved));
  });
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Game / Ruleset" }),
  ).toHaveValue("poe1");
  await expect(page.getByLabel("Cards on the table")).toHaveValue("24");
});
