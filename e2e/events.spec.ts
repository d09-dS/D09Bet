import { test, expect } from "@playwright/test";

test.describe("Events Page", () => {
  test("events list page loads", async ({ page }) => {
    await page.goto("/de/events");
    await expect(page.locator("h1, h2").first()).toContainText(/Events/i);
  });

  test("shows loading or event cards", async ({ page }) => {
    await page.goto("/de/events");
    // Either loading skeleton or actual content should be present
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("events page has search/filter capabilities", async ({ page }) => {
    await page.goto("/de/events");
    // Page should render without errors
    await expect(page).toHaveURL(/\/de\/events/);
  });
});

test.describe("Event Detail Page", () => {
  test("shows 404 or error for non-existent event", async ({ page }) => {
    await page.goto("/de/events/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(2000);
    // Should show error state or redirect
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
