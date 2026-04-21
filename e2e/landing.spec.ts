import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("shows hero section and navigation", async ({ page }) => {
    await page.goto("/de");
    await expect(page.locator("h1")).toContainText("Wette mit virtuellen Tokens");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("link", { name: /Events/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Rangliste|Leaderboard/i })).toBeVisible();
  });

  test("has register and login buttons", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByRole("link", { name: /Registrieren/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Anmelden/i })).toBeVisible();
  });

  test("navigates to events page", async ({ page }) => {
    await page.goto("/de");
    await page.getByRole("link", { name: /Events/i }).first().click();
    await expect(page).toHaveURL(/\/de\/events/);
  });

  test("navigates to leaderboard page", async ({ page }) => {
    await page.goto("/de");
    await page.getByRole("link", { name: /Rangliste/i }).first().click();
    await expect(page).toHaveURL(/\/de\/leaderboard/);
  });

  test("english locale works", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1")).toContainText("Bet with virtual Tokens");
  });
});
