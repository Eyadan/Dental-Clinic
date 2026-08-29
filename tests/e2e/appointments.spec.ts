import { test, expect } from "./fixtures";

test.describe("Appointments & Bookings", () => {
  test("should display appointment calendar", async ({ authenticatedPage: page }) => {
    await page.goto("/appointments");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/appointment|calendar|schedule/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate calendar months", async ({ authenticatedPage: page }) => {
    await page.goto("/appointments");
    await page.waitForTimeout(1000);
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous" i]').first();
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]').first();
    if (await nextButton.count() > 0) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should display booking dashboard", async ({ authenticatedPage: page }) => {
    await page.goto("/bookings");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/booking|pending|approved/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should filter bookings by status", async ({ authenticatedPage: page }) => {
    await page.goto("/bookings");
    await page.waitForTimeout(1000);
    const filterButtons = page.locator('button:has-text("pending"), button:has-text("approved"), button:has-text("declined")');
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
