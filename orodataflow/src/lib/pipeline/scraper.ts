import path from "path";
import fs from "fs/promises";
import os from "os";

export interface ScrapeResult {
  csvPath: string;
  filename: string;
}

export async function scrapeCSV(): Promise<ScrapeResult> {
  const tmpDir = path.join(os.tmpdir(), "dataflow");
  await fs.mkdir(tmpDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `Total_${today}.csv`;
  const csvPath = path.join(tmpDir, filename);

  return await scrapeWithPlaywright(csvPath, filename);
}

async function scrapeWithPlaywright(
  csvPath: string,
  filename: string
): Promise<ScrapeResult> {
  let browser;

  try {
    const { chromium } = await import("playwright");

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const dashboardUrl     = process.env.DASHBOARD_URL!;
    const email            = process.env.DASHBOARD_EMAIL!;
    const password         = process.env.DASHBOARD_PASSWORD!;
    const emailSelector    = process.env.DASHBOARD_EMAIL_SELECTOR    || "input[type='email']";
    const passwordSelector = process.env.DASHBOARD_PASSWORD_SELECTOR || "input[type='password']";
    const submitSelector   = process.env.DASHBOARD_SUBMIT_SELECTOR   || "button[type='submit']";
    const reportPath       = process.env.DASHBOARD_REPORT_PATH       || "/reports/daily-report";

    // ── 1. Navigate to login page ──────────────────────────────────────────────
    await page.goto(dashboardUrl, { waitUntil: "networkidle", timeout: 30_000 });
    const loginPageUrl = page.url();

    // ── 2. Fill credentials with real keystrokes (React controlled inputs) ─────
    await page.waitForSelector(emailSelector, { timeout: 10_000 });

    const emailInput = page.locator(emailSelector).first();
    await emailInput.click({ clickCount: 3 });
    await emailInput.pressSequentially(email, { delay: 40 });

    const passInput = page.locator(passwordSelector).first();
    await passInput.click({ clickCount: 3 });
    await passInput.pressSequentially(password, { delay: 40 });

    // ── 3. Submit and wait for redirect ────────────────────────────────────────
    await page.locator(submitSelector).first().click();

    try {
      await page.waitForURL((u) => u.href !== loginPageUrl, { timeout: 20_000 });
    } catch {
      throw new Error(
        "Login failed: URL did not change after submit. Check DASHBOARD_EMAIL/PASSWORD in .env."
      );
    }
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // ── 4. Navigate to the daily report page ──────────────────────────────────
    const origin = new URL(dashboardUrl).origin;
    await page.goto(`${origin}${reportPath}`, { waitUntil: "networkidle", timeout: 30_000 });

    // ── 5. Click Export and capture the download ───────────────────────────────
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: "Export" }).click(),
    ]);

    await download.saveAs(csvPath);
    return { csvPath, filename };
  } finally {
    await browser?.close();
  }
}
