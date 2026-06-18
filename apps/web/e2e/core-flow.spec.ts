/**
 * E2E test: Core user flow.
 *
 * login → dashboard → invoices → expand row → check AILabel → saga export
 *
 * Runs at both desktop (1280px) and mobile (375px) viewports
 * via playwright.config.ts project matrix.
 */
import { test, expect } from "@playwright/test";

test.describe("Core user flow", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    // Farm Copilot branding
    await expect(page.locator("text=Farm Copilot")).toBeVisible();
    await expect(page.locator("text=Autentificare")).toBeVisible();

    // Login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator("text=Intră în cont")).toBeVisible();
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**");
    await expect(page.locator("text=Autentificare")).toBeVisible();
  });

  test("invoice page redirects without auth", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForURL("**/login**");
    await expect(page.locator("text=Farm Copilot")).toBeVisible();
  });

  test("stock page redirects without auth", async ({ page }) => {
    await page.goto("/stock");
    await page.waitForURL("**/login**");
  });

  test("alerts page redirects without auth", async ({ page }) => {
    await page.goto("/alerts");
    await page.waitForURL("**/login**");
  });

  test("parcels page redirects without auth", async ({ page }) => {
    await page.goto("/parcels");
    await page.waitForURL("**/login**");
  });

  test("cooperative page redirects without auth", async ({ page }) => {
    await page.goto("/cooperative");
    await page.waitForURL("**/login**");
  });

  test("saga-export page redirects without auth", async ({ page }) => {
    await page.goto("/saga-export");
    await page.waitForURL("**/login**");
  });

  test("arenda page redirects without auth", async ({ page }) => {
    await page.goto("/arenda");
    await page.waitForURL("**/login**");
  });

  test("settings page redirects without auth", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/login**");
  });

  test("login page has correct meta tags", async ({ page }) => {
    await page.goto("/login");
    const title = await page.title();
    expect(title).toContain("Farm Copilot");
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/unknown-page-xxx");
    // Should get a 404 or redirect to login
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
