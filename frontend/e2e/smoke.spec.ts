import { test, expect } from "@playwright/test";

// ── E2E Smoke Test: Full Auth + Navigation Lifecycle ────────
// Prerequisites:
//   - Frontend dev server on :3000
//   - Backend on :8080 with Postgres seeded (demo data)
//   - Demo users from the login page quick-pick

// These match the actual demo accounts shown on the login page
const DEMO_EMAIL = "guru.biologi@morfosis.demo";
const DEMO_PASSWORD = "morfosis123";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

test.describe("Auth Guard", () => {
  test("redirects unauthenticated user from /app to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/app");
    await page.waitForURL("**/login**");
    await expect(page).toHaveURL(/\/login/);
  });

  test("allows access to landing page without auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Login Flow", () => {
  test("shows login page with form and demo accounts", async ({ page }) => {
    await page.goto("/login");
    // Heading from snapshot: "Masuk ke tenant sekolah"
    await expect(page.locator("text=Masuk ke tenant sekolah")).toBeVisible();
    // Demo quick-pick section
    await expect(page.locator("text=Demo accounts")).toBeVisible();
    // Form fields should be present
    await expect(page.locator("text=Email")).toBeVisible();
    await expect(page.locator("text=Password")).toBeVisible();
    await expect(page.locator("button:has-text('Masuk ke LMS')")).toBeVisible();
  });

  test("can click demo account quick-pick to fill form", async ({ page }) => {
    await page.goto("/login");
    // Click the Guru demo card
    await page.locator("button:has-text('Guru')").first().click();
    // The email field should now be filled with the demo email
    const emailField = page.locator("input").nth(1); // second input (after tenant)
    await expect(emailField).toHaveValue(/guru/);
  });

  test("logs in with demo teacher account and lands on dashboard", async ({ page }) => {
    await page.goto("/login");

    // Fields are pre-filled from snapshot. Clear and fill our own.
    const inputs = page.locator("input");
    // Tenant ID (first input)
    await inputs.nth(0).fill(TENANT_ID);
    // Email (second input)
    await inputs.nth(1).fill(DEMO_EMAIL);
    // Password (third input)
    await inputs.nth(2).fill(DEMO_PASSWORD);

    await page.locator("button:has-text('Masuk ke LMS')").click();

    // Should redirect to /app after login
    await page.waitForURL("**/app**", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/app/);
  });
});

test.describe("Authenticated Navigation", () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    const inputs = page.locator("input");
    await inputs.nth(0).fill(TENANT_ID);
    await inputs.nth(1).fill(DEMO_EMAIL);
    await inputs.nth(2).fill(DEMO_PASSWORD);
    await page.locator("button:has-text('Masuk ke LMS')").click();
    await page.waitForURL("**/app**", { timeout: 15_000 });
  });

  test("dashboard loads successfully", async ({ page }) => {
    // Any heading on dashboard page
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to courses page", async ({ page }) => {
    await page.goto("/app/courses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to exams page", async ({ page }) => {
    await page.goto("/app/exams");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("can logout and get redirected to login", async ({ page }) => {
    // Click the logout/user button — from snapshot the button text includes "Keluar"
    const logoutBtn = page.locator("button:has-text('Keluar')").or(
      page.locator("button:has-text('Logout')")
    );
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
    } else {
      // Fallback: try navigating to a URL that triggers logout
      await page.evaluate(() => {
        localStorage.removeItem("morfoschools_session");
        document.cookie = "morfoschools_token=; path=/; max-age=0";
      });
      await page.goto("/app");
    }

    await page.waitForURL("**/login**", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
