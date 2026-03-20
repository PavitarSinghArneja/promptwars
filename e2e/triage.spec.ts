/**
 * Aegis Bridge — Playwright E2E Tests
 * Tests the core triage user journey end-to-end.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Aegis Bridge — Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Aegis Bridge/i);
  });

  test("has skip-navigation link", async ({ page }) => {
    const skipNav = page.locator(".skip-nav");
    await expect(skipNav).toBeAttached();
    // Skip-nav is visually hidden until focused
    await skipNav.focus();
    await expect(skipNav).toBeVisible();
  });

  test("hero section is visible with heading", async ({ page }) => {
    const heading = page.getByRole("heading", { name: /Precision in Chaos/i, level: 1 });
    await expect(heading).toBeVisible();
  });

  test("triage workspace section is present", async ({ page }) => {
    const section = page.locator("#triage");
    await expect(section).toBeAttached();
  });

  test("hospital map section is present", async ({ page }) => {
    const section = page.locator("#hospital-map");
    await expect(section).toBeAttached();
  });
});

test.describe("Aegis Bridge — Triage Workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator("#triage").scrollIntoViewIfNeeded();
  });

  test("dropzone is keyboard accessible", async ({ page }) => {
    const dropzone = page.getByRole("button", { name: /Upload images/i });
    await expect(dropzone).toBeVisible();
    await dropzone.focus();
    await expect(dropzone).toBeFocused();
  });

  test("audio recorder button is present and accessible", async ({ page }) => {
    const recordBtn = page.getByRole("button", { name: /Start Recording/i });
    await expect(recordBtn).toBeVisible();
  });

  test("medical notes textarea is accessible", async ({ page }) => {
    const textarea = page.getByLabel(/Paste medical notes/i);
    await expect(textarea).toBeVisible();
    await textarea.focus();
    await textarea.fill("Patient has chest pain and shortness of breath. Allergic to penicillin.");
    await expect(textarea).toHaveValue(/chest pain/i);
  });

  test("triage submit button is disabled when no inputs provided", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /Run Emergency Triage/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("triage submit button enables after text input", async ({ page }) => {
    const textarea = page.getByLabel(/Paste medical notes/i);
    await textarea.fill("Patient has severe allergic reaction to bee sting.");
    const submitBtn = page.getByRole("button", { name: /Run Emergency Triage/i });
    await expect(submitBtn).not.toBeDisabled();
  });
});

test.describe("Aegis Bridge — Accessibility", () => {
  test("all feature cards have accessible roles", async ({ page }) => {
    await page.goto(BASE_URL);
    const featureList = page.getByRole("list", { name: /Key features/i });
    await expect(featureList).toBeAttached();
    const items = featureList.getByRole("listitem");
    await expect(items).toHaveCount(4);
  });

  test("header has correct landmark roles", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("navigation has accessible label", async ({ page }) => {
    await page.goto(BASE_URL);
    const nav = page.getByRole("navigation", { name: /Primary navigation/i });
    await expect(nav).toBeVisible();
  });

  test("sign-in button is accessible", async ({ page }) => {
    await page.goto(BASE_URL);
    // Button might show as loading or sign-in depending on auth state
    const signInBtn = page.getByRole("button", { name: /Sign in with Google/i });
    // Not asserting visible since auth might load user from session
    await expect(signInBtn.or(page.getByRole("button", { name: /Sign Out/i }))).toHaveCount(1);
  });
});
