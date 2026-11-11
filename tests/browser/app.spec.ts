import { test, expect } from "@playwright/test";
import { fresh } from "../../src/core/state";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (state) => {
      if (!localStorage.getItem("pnch:v1"))
        localStorage.setItem("pnch:v1", JSON.stringify(state));
    },
    (() => {
      const s = fresh();
      s.games.poe1.settings.skip = true;
      return s;
    })(),
  );
  await page.goto("/");
});
test("Pick 1 reveals each chosen card and keeps a configurable shortlist", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pick 1 of 3", exact: true }).click();
  await page.getByLabel("Cards to reveal").selectOption("4");
  await expect(
    page.getByRole("button", { name: "Pick 1 of 4", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.locator(".draw-card")).toHaveCount(12);
  await expect(page.locator(".face-up")).toHaveCount(0);
  for (let i = 1; i <= 4; i++) {
    await page
      .getByRole("button", { name: `Face-down card ${i}`, exact: true })
      .click();
    await expect(page.locator(".face-up")).toHaveCount(i);
    await expect(page.locator(".draw-card")).toHaveCount(i < 4 ? 12 : 4);
  }
  await expect(
    page.getByRole("button", { name: /^Face-down card/ }),
  ).toHaveCount(0);
  const revealed = page.locator(".face-up").first();
  await expect(revealed.getByRole("link")).toHaveAttribute(
    "href",
    /^https:\/\/www\.poewiki\.net\/wiki\//,
  );
  await expect(revealed.locator(".gem-diamond")).toHaveClass(
    /gem-(str|dex|int|all)/,
  );
  await expect(revealed.locator("img")).toHaveCount(0);
  await page
    .context()
    .route("https://www.poewiki.net/wiki/**", (route) =>
      route.fulfill({ body: "" }),
    );
  const popup = page.waitForEvent("popup");
  await revealed.getByRole("link").click();
  await (await popup).close();
  await expect(page.locator(".result-panel")).toHaveCount(0);
  const select = revealed.getByRole("button", { name: /^Select / });
  await select.hover({ position: { x: 10, y: 10 } });
  await expect(revealed).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -5)");
  await select.click({ position: { x: 10, y: 10 } });
  await expect(page.locator(".face-up")).toHaveCount(4);
  await expect(
    page.locator(".result-identity").getByRole("link"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Share result" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toBe("pnch-result.png");
  await page.getByText("Result text and link", { exact: true }).click();
  const url = await page
    .getByRole("textbox", { name: "Share link", exact: true })
    .inputValue();
  await page.goto(url);
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("Database follows the active-gem setting", async ({ page }) => {
  await page.getByRole("link", { name: "Database" }).click();
  await page
    .getByRole("searchbox")
    .or(page.getByLabel("Search skills"))
    .fill("Portal");
  await expect(page.getByText("No skills found")).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: /Include all active gems/ }).check();
  await page.getByRole("link", { name: "Database" }).click();
  await page.getByLabel("Search skills").fill("Portal");
  const portal = page
    .getByRole("link", { name: "Portal", exact: true })
    .first();
  await expect(portal).toHaveAttribute(
    "href",
    "https://www.poewiki.net/wiki/Portal",
  );
});
test("Full build draws class, matching Ascendancy, then skill with fresh decks", async ({
  page,
}) => {
  await page.getByLabel("What are we drawing?").selectOption("Full build");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Shuffle & deal" }).click();
    await page.locator(".draw-card").first().click();
    if (i < 2)
      await page
        .getByRole("button", { name: /Draw (Ascendancy|Skill) deck/ })
        .click();
  }
  await expect(page.locator(".result-panel")).toBeVisible();
  await expect(page.locator(".result-identity p")).not.toBeEmpty();
  const build = await page.locator(".result-identity").innerText();
  await page.reload();
  await expect(page.locator(".result-identity")).toHaveText(build, {
    useInnerText: true,
  });
});

test("Random result and attached challenges survive reload and reset stays cleared", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await page.locator(".draw-card").first().click();
  await expect(page.locator(".result-panel")).toBeVisible();
  await page.getByRole("button", { name: "Add random challenge" }).click();
  const result = await page.locator(".result-identity").innerText();
  const challenges = await page.locator(".attached-challenges").innerText();
  await page.reload();
  await expect(page.locator(".result-identity")).toHaveText(result, {
    useInnerText: true,
  });
  await expect(page.locator(".attached-challenges")).toHaveText(challenges, {
    useInnerText: true,
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  await expect(page.locator(".result-identity")).toHaveText(result, {
    useInnerText: true,
  });
  await page.locator(".attached-challenges button").click();
  await page.reload();
  await expect(page.locator(".attached-challenges")).toHaveCount(0);
  await page.getByRole("button", { name: "Draw again", exact: true }).click();
  await page.reload();
  await expect(page.locator(".result-panel")).toHaveCount(0);
});
test("Database class controls persist and restrict class and Ascendancy decks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("link", { name: "Database", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Skills", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Classes", exact: true }).click();
  await expect(page.getByLabel("Search skills")).toBeHidden();
  const cards = page.locator(".class-group");
  await expect(cards).toHaveCount(7);
  const layout = await cards.evaluateAll((groups) =>
    groups.map((group) => ({
      bottom: group.getBoundingClientRect().bottom,
      switchColumns: new Set(
        Array.from(
          group.querySelectorAll("input"),
          (input) => input.getBoundingClientRect().right,
        ),
      ).size,
    })),
  );
  expect(Math.max(...layout.map((card) => card.bottom))).toBeLessThanOrEqual(
    720,
  );
  expect(layout.every((card) => card.switchColumns === 1)).toBe(true);
  const witch = page.getByRole("checkbox", {
    name: "Include Witch class",
    exact: true,
  });
  const occultist = page.getByRole("checkbox", {
    name: "Occultist",
    exact: true,
  });
  await occultist.uncheck();
  await witch.uncheck();
  await expect(occultist).toBeDisabled();
  await witch.check();
  await expect(occultist).not.toBeChecked();
  await page
    .getByRole("checkbox", { name: "Necromancer", exact: true })
    .uncheck();

  const otherClasses = page.getByRole("checkbox", {
    name: /^Include (?!Witch ).+ class$/,
  });
  for (const checkbox of await otherClasses.all()) await checkbox.uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Classes", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Include Ranger class" }),
  ).not.toBeChecked();
  await expect(occultist).not.toBeChecked();

  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  await page.getByText("More filters", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Classes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ascendancies", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("What are we drawing?").selectOption("Full build");
  for (const name of ["Witch", "Elementalist"]) {
    await page.getByRole("button", { name: "Shuffle & deal" }).click();
    await expect(page.locator(".draw-card")).toHaveCount(1);
    await page.locator(".draw-card").click();
    await expect(page.locator(".face-up")).toHaveText(new RegExp(name));
    await page
      .getByRole("button", { name: /Draw (Ascendancy|Skill) deck/ })
      .click();
  }
});
test("Group toggles synchronize all members and persist after reload", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Database", exact: true }).click();
  const checkbox = page.getByRole("checkbox", {
    name: "Enable Melee group",
    exact: true,
  });
  await checkbox.uncheck();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Enable Melee group", exact: true }),
  ).not.toBeChecked();
  const group = page.locator(".skill-group").first();
  await expect(
    group.locator(".gem-row input[type=checkbox]").first(),
  ).not.toBeChecked();
  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  const melee = page.getByRole("button", { name: "Melee", exact: true });
  await expect(melee).toHaveCount(0);
  await page.getByRole("link", { name: "Database", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Enable Melee group", exact: true })
    .check();
  await expect(
    group.locator(".gem-row input[type=checkbox]").first(),
  ).toBeChecked();
  await page.getByLabel("Search skills").fill("no-match-skill");
  await expect(page.getByText("No skills found")).toBeVisible();
  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  await expect(melee).toBeVisible();
});
test("Custom skills are saved and found under their archetype", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Database", exact: true }).click();
  await page.getByRole("button", { name: "Add custom skill" }).click();
  await page.getByLabel("Skill name").fill("Test Astral Skill");
  await page.getByRole("button", { name: "Add skill", exact: true }).click();
  await page.getByLabel("Search skills").fill("Test Astral Skill");
  await expect(
    page.getByRole("heading", { name: "Test Astral Skill Custom" }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Search skills").fill("Test Astral Skill");
  await expect(page.locator(".gem-row")).toHaveCount(1);
});
test("Tournament renders rounds, advances matches and reveals champion", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Skill Tournament", exact: true })
    .click();
  await page.getByRole("button", { name: "Start tournament" }).click();
  await expect(page.locator(".bracket-round")).toHaveCount(4);
  for (let i = 0; i < 7; i++)
    await page.locator(".bracket-match button:not([disabled])").first().click();
  await expect(page.locator(".champion strong")).toBeVisible();
  await expect(page.locator(".result-panel")).toBeVisible();
  const winner = await page.locator(".result-identity h2").innerText();
  await page
    .getByRole("button", { name: "Absolute Random", exact: true })
    .click();
  await expect(page.locator(".result-panel")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Skill Tournament", exact: true })
    .click();
  await expect(page.locator(".result-identity h2")).toHaveText(winner);
});
test("Randomizer tabs keep their own results and challenges", async ({
  page,
}) => {
  const absolute = page.getByRole("button", {
    name: "Absolute Random",
    exact: true,
  });
  const pickThree = page.getByRole("button", {
    name: "Pick 1 of 3",
    exact: true,
  });
  const identity = page.locator(".result-identity");

  await page.getByLabel("What are we drawing?").selectOption("Class");
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await page
    .getByRole("button", { name: "Face-down card 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Add random challenge" }).click();
  const firstResult = await identity.innerText();
  const challenges = await page.locator(".attached-challenges").innerText();

  await pickThree.click();
  await expect(identity).toHaveCount(0);
  await page.getByLabel("What are we drawing?").selectOption("Skill");
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  for (let i = 1; i <= 3; i++) {
    await page
      .getByRole("button", { name: `Face-down card ${i}`, exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: /^Select / })
    .first()
    .click({ position: { x: 10, y: 10 } });
  const secondResult = await identity.innerText();

  await absolute.click();
  await expect(identity).toHaveText(firstResult, { useInnerText: true });
  await expect(page.locator(".attached-challenges")).toHaveText(challenges, {
    useInnerText: true,
  });
  await pickThree.click();
  await expect(identity).toHaveText(secondResult, { useInnerText: true });
  await page.getByRole("button", { name: "Draw again" }).click();
  await expect(identity).toHaveCount(0);
  await absolute.click();
  await expect(identity).toHaveText(firstResult, { useInnerText: true });
});
test("Challenge generation and individual reroll/removal", async ({ page }) => {
  await page.getByRole("link", { name: "Challenges", exact: true }).click();
  await page.getByRole("button", { name: "Generate challenge" }).click();
  await expect(page.locator(".challenge-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: /^Reroll / })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Remove / })
    .first()
    .click();
  await expect(page.locator(".challenge-card")).toHaveCount(2);
});
test("All pages fit mobile and desktop; no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["randomizer", "database", "challenges", "settings"]) {
      await page.goto("/#" + route);
      await expect(page.locator("h1")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${route} at ${width}px`).toBe(false);
    }
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/pnch-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/pnch-mobile.png",
    fullPage: true,
  });
});
test("Game picker in the sidebar switches between PoE 1 and PoE 2", async ({
  page,
}) => {
  const picker = page
    .locator(".sidebar-bottom")
    .getByRole("combobox", { name: "Game / Ruleset" });
  await expect(picker.getByRole("option")).toHaveText(["PoE 1", "PoE 2"]);
  await expect(picker).toHaveValue("poe1");
  await picker.selectOption("poe2");
  await page.reload();
  await expect(picker).toHaveValue("poe2");
  await expect(page.locator(".pool-indicator strong")).not.toHaveText("0");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(picker).toBeVisible();
  await picker.selectOption("poe1");
  await expect(picker).toBeHidden();
});
test("Randomizer fits on a 1280 by 720 screen with More filters collapsed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(
    page.getByRole("heading", { name: "Your next build", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topbar")).toHaveCount(0);
  await expect(page.locator(".extra-filters")).not.toHaveAttribute("open");
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  expect(height).toBeLessThanOrEqual(720);
  await page.getByRole("button", { name: "Shuffle & deal" }).click();
  await expect(page.locator(".draw-card")).toHaveCount(12);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(720);
});
test("Settings are ordered and gem inclusion is controlled in Randomizer", async ({
  page,
}) => {
  const names = [
    "Include Vaal gems",
    "Include transfigured gems",
    "Include custom gems",
  ];
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-layout h2")).toHaveText([
    "Randomization",
    "Animation",
    "Data management",
  ]);
  await expect(
    page
      .locator(".settings-section")
      .first()
      .getByRole("checkbox", { name: /Include all active gems/ }),
  ).toBeVisible();
  for (const name of names)
    await expect(page.getByRole("checkbox", { name })).toHaveCount(0);

  await page.getByRole("link", { name: "Randomizer", exact: true }).click();
  const damageType = page.getByRole("heading", {
    name: "Damage type",
    exact: true,
  });
  await expect(damageType).toBeHidden();
  const [vaal, transfigured, custom] = names.map((name) =>
    page.getByRole("checkbox", { name }),
  );
  for (const checkbox of [vaal, transfigured, custom]) {
    await expect(checkbox).toBeVisible();
  }
  await expect(
    page.getByRole("checkbox", { name: /^One variant per skill/ }),
  ).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Soft Random/ })).toHaveCount(
    0,
  );
  await page.getByText("More filters", { exact: true }).click();
  await expect(damageType).toBeVisible();
  await expect(vaal).not.toBeChecked();
  await expect(transfigured).toBeChecked();
  await expect(custom).toBeChecked();
  await vaal.check();
  await transfigured.uncheck();
  await custom.uncheck();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(vaal).not.toBeChecked();
  await expect(transfigured).toBeChecked();
  await expect(custom).toBeChecked();
});
