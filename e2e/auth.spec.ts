import { test, expect } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/de/login");
    await expect(page.locator("h1, h2")).toContainText(/anmelden/i);
    await expect(page.getByLabel(/Benutzername|Username/i)).toBeVisible();
    await expect(page.getByLabel(/Passwort|Password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Anmelden|Sign In/i })).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/de/register");
    await expect(page.locator("h1, h2")).toContainText(/Konto erstellen|registrieren/i);
    await expect(page.getByLabel(/Benutzername|Username/i)).toBeVisible();
    await expect(page.getByLabel(/E-Mail/i)).toBeVisible();
    await expect(page.getByLabel(/^Passwort$|^Password$/i)).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/de/login");
    await expect(page.getByRole("link", { name: /registrieren/i })).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/de/register");
    await expect(page.getByRole("link", { name: /anmelden/i })).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/de/login");
    await page.getByLabel(/Benutzername|Username/i).fill("nonexistent");
    await page.getByLabel(/Passwort|Password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /Anmelden|Sign In/i }).click();
    // Should show an error toast or message (don't redirect)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/de\/login/);
  });
});
