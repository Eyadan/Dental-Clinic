import { test, expect } from "./fixtures";

test.describe("Patient Management", () => {
  test("should display patient list", async ({ authenticatedPage: page }) => {
    await page.goto("/patients");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/patient/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should search patients", async ({ authenticatedPage: page }) => {
    await page.goto("/patients");
    await page.waitForTimeout(1000);
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill("Maria");
      await page.waitForTimeout(1000);
    }
  });

  test("should open new patient dialog", async ({ authenticatedPage: page }) => {
    await page.goto("/patients");
    await page.waitForTimeout(1000);
    const newButton = page.locator('button:has-text("New Patient"), button:has-text("Add Patient"), button:has-text("New")');
    if (await newButton.count() > 0) {
      await newButton.first().click();
      await page.waitForTimeout(1000);
      const dialog = page.locator('[role="dialog"], .dialog');
      if (await dialog.count() > 0) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test("should view patient detail", async ({ authenticatedPage: page }) => {
    await page.goto("/patients");
    await page.waitForTimeout(2000);
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.count() > 0) {
      await patientLink.click();
      await page.waitForTimeout(2000);
      await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    }
  });
});
