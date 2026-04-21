import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("header is sticky and visible on scroll", async ({ page }) => {
    await page.goto("/de");
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(header).toBeVisible();
  });

  test("mobile menu toggle works", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/de");
    // Mobile menu button should be visible
    const menuBtn = page.locator("button.md\\:hidden").first();
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    // Mobile nav should appear
    const mobileNav = page.locator("header div.md\\:hidden nav");
    await expect(mobileNav).toBeVisible();
  });

  test("leaderboard page loads", async ({ page }) => {
    await page.goto("/de/leaderboard");
    await expect(page.locator("h1, h2").first()).toContainText(/Rangliste|Leaderboard/i);
  });
});
