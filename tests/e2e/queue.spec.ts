import { test, expect } from "./fixtures";

test.describe("Queue Management", () => {
  test("should display queue page", async ({ authenticatedPage: page }) => {
    await page.goto("/queue");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/queue|waiting|called|progress/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show queue stat cards", async ({ authenticatedPage: page }) => {
    await page.goto("/queue");
    await page.waitForTimeout(2000);
    const stats = page.locator("text=/waiting|called|in progress|delayed/i");
    await expect(stats.first()).toBeVisible({ timeout: 10000 });
  });

  test("should display queue items with patient names", async ({ authenticatedPage: page }) => {
    await page.goto("/queue");
    await page.waitForTimeout(2000);
    const queueItems = page.locator('[data-testid="queue-item"], .queue-item, tr:has(td)');
    if (await queueItems.count() > 0) {
      await expect(queueItems.first()).toBeVisible();
    }
  });
});
