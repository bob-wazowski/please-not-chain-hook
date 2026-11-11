import { test, expect } from "@playwright/test";
test("Packet shuffle renders on desktop and mobile and deals in under 530ms", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Shuffle & deal" }).click();
    const timings = await page.locator(".draw-card").evaluateAll((cards) =>
      cards.map((card) => {
        const animation = card.getAnimations()[0];
        animation.pause();
        animation.currentTime = 500;
        return Number(animation.effect!.getTiming().duration);
      }),
    );
    expect(timings).toHaveLength(12);
    expect(Math.max(...timings) - 1800).toBeLessThanOrEqual(530);
    await page
      .locator(".deck-stage")
      .screenshot({ path: `test-results/shuffle-${width}.png` });
    await page.getByRole("button", { name: "Skip animation" }).click();
    await expect(page.locator(".draw-card").first()).toBeEnabled();
    await expect(page.locator(".in-motion")).toHaveCount(0);
    await page.locator(".draw-card").first().click();
    await expect(page.locator(".result-panel")).toBeVisible();
  }
});
