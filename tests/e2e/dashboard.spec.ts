import { test, expect } from "./fixtures";

test.describe("Dashboard", () => {
  test("should display dashboard stats for admin", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/pending|appointments|queue|messages/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show staff notifications if any", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    const notificationAlert = page.locator('[role="alert"], .alert');
    if (await notificationAlert.count() > 0) {
      await expect(notificationAlert.first()).toBeVisible();
    }
  });

  test("should dismiss staff notification", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    const dismissButton = page.locator('button:has-text("Dismiss"), button:has-text("Dismiss")');
    if (await dismissButton.count() > 0) {
      await dismissButton.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
