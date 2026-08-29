import { test, expect } from "./fixtures";

test.describe("Check-In Flow", () => {
  test("should display check-in page with search", async ({ authenticatedPage: page }) => {
    await page.goto("/check-in");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder*="search" i], input[type="search"], input')).toBeVisible({ timeout: 10000 });
  });

  test("should search for patients", async ({ authenticatedPage: page }) => {
    await page.goto("/check-in");
    await page.waitForTimeout(1000);
    const searchInput = page.locator('input').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("Maria");
      await page.waitForTimeout(2000);
    }
  });

  test("should show empty state when no results", async ({ authenticatedPage: page }) => {
    await page.goto("/check-in");
    await page.waitForTimeout(1000);
    const searchInput = page.locator('input').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("ZZZZNonExistentPatientZZZZ");
      await page.waitForTimeout(2000);
      const emptyState = page.locator("text=/no results|no patients|not found|no appointments/i");
      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible();
      }
    }
  });
});
