import { test, expect } from "./fixtures";

test.describe("Live Chat", () => {
  test("should display chat page", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/chat|conversation|messenger/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show conversation list or empty state", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(2000);
    const conversationList = page.locator('[data-testid="conversation"], .conversation-item').or(page.locator("text=/no conversations|no active|select a conversation/i"));
    await expect(conversationList.first()).toBeVisible({ timeout: 10000 });
  });
});
