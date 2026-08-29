import { test, expect } from "./fixtures";

test.describe("Authentication Flow", () => {
  test("should login as admin successfully", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clinic.local");
    await page.fill('input[name="password"]', "AdminPass123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should login as reception successfully", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "reception@clinic.local");
    await page.fill('input[name="password"]', "ReceptionPass123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should login as dentist successfully", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "dentist@clinic.local");
    await page.fill('input[name="password"]', "DentistPass123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page).toHaveURL(/\/dentist-portal|\/dashboard/);
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clinic.local");
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });
});
