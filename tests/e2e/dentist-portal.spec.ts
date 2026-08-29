import { test, expect } from "./fixtures";

test.describe("Dentist Portal", () => {
  test.use({ role: "dentist" });

  test("should display dentist portal schedule", async ({ authenticatedPage: page }) => {
    await page.goto("/dentist-portal/schedule");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("should display dentist portal queue", async ({ authenticatedPage: page }) => {
    await page.goto("/dentist-portal/queue");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("should display dentist portal more page", async ({ authenticatedPage: page }) => {
    await page.goto("/dentist-portal/more");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("should display emergency page", async ({ authenticatedPage: page }) => {
    await page.goto("/dentist-portal/emergency");
    await page.waitForTimeout(2000);
    const emergencyElement = page.locator("h1").or(page.locator("button")).or(page.locator("text=/emergency/i"));
    await expect(emergencyElement.first()).toBeVisible({ timeout: 10000 });
  });
});
