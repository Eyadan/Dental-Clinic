import { test as base, type Page } from "@playwright/test";

export const TEST_CREDENTIALS = {
  admin: { email: "admin@clinic.local", password: "AdminPass123!" },
  reception: { email: "reception@clinic.local", password: "ReceptionPass123!" },
  dentist: { email: "dentist@clinic.local", password: "DentistPass123!" },
};

type Role = keyof typeof TEST_CREDENTIALS;

async function loginAs(page: Page, role: Role): Promise<void> {
  const creds = TEST_CREDENTIALS[role];
  await page.goto("/login");
  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

export const test = base.extend<{
  authenticatedPage: Page;
  role: Role;
}>({
  role: ["admin", { option: true }],
  authenticatedPage: async ({ page, role }, use) => {
    await loginAs(page, role);
    await use(page);
  },
});

export { expect } from "@playwright/test";
