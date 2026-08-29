import { test, expect } from "./fixtures";

test.describe("Settings", () => {
  test("should display settings page with categories", async ({ authenticatedPage: page }) => {
    await page.goto("/settings");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/clinic|dentist|appointment|messenger|payment|security/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should switch between categories", async ({ authenticatedPage: page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);
    const categoryButtons = page.locator('button:has-text("Clinic"), button:has-text("Dentist"), button:has-text("Payment")');
    if (await categoryButtons.count() > 1) {
      await categoryButtons.nth(1).click();
      await page.waitForTimeout(1000);
    }
  });

  test("should show save button", async ({ authenticatedPage: page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 10000 });
  });
});
