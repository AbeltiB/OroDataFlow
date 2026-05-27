import "dotenv/config";
import { chromium } from "playwright";
import path from "path";
import fs from "fs/promises";

const SS = path.join(process.cwd(), "scripts", "screenshots");

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>;

async function shot(page: Page, name: string) {
  await fs.mkdir(SS, { recursive: true });
  const p = path.join(SS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`   📸 ${p}`);
}

async function typeInto(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  await loc.click({ clickCount: 3 }); // select-all
  await loc.pressSequentially(value, { delay: 40 }); // real keystrokes
  // verify React state received the value
  const actual = await loc.inputValue();
  if (actual !== value) throw new Error(`Field "${selector}" has "${actual}" instead of expected value`);
}

async function testLogin() {
  const url       = process.env.DASHBOARD_URL!;
  const email     = process.env.DASHBOARD_EMAIL!;
  const password  = process.env.DASHBOARD_PASSWORD!;
  const emailSel  = process.env.DASHBOARD_EMAIL_SELECTOR!;
  const passSel   = process.env.DASHBOARD_PASSWORD_SELECTOR!;
  const submitSel = process.env.DASHBOARD_SUBMIT_SELECTOR!;

  console.log("─── DataFlow Login Test ───────────────────────────────");
  console.log(`URL     : ${url}`);
  console.log(`Email   : ${email}`);
  console.log("──────────────────────────────────────────────────────\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  try {
    // ── 1. Load page ──────────────────────────────────────────────────────────
    console.log("[1/5] Navigating to login page...");
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    console.log(`      Loaded: ${page.url()}`);
    await shot(page, "1-loaded");

    // ── 2. Type credentials (pressSequentially triggers React onChange) ────────
    console.log("\n[2/5] Typing credentials with real keystrokes...");
    await page.waitForSelector(emailSel, { timeout: 10_000 });
    await typeInto(page, emailSel, email);
    console.log("      Email ✓");
    await typeInto(page, passSel, password);
    console.log("      Password ✓");
    await shot(page, "2-filled");

    // ── 3. Submit ─────────────────────────────────────────────────────────────
    console.log("\n[3/5] Clicking Login button...");
    const startUrl = page.url();

    await page.locator(submitSel).first().click();

    // Wait strictly for URL to change, then for the new route to render
    try {
      await page.waitForURL((u) => u.href !== startUrl, { timeout: 25_000 });
    } catch {
      // no navigation — login likely failed
    }
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, "3-after-submit");

    const endUrl = page.url();
    console.log(`      Start: ${startUrl}`);
    console.log(`      End  : ${endUrl}`);

    // ── 4. Error detection ────────────────────────────────────────────────────
    console.log("\n[4/5] Checking for error messages...");
    const errors = await page.evaluate(() => {
      const sels = ['[role="alert"]', '[class*="error"]', '[class*="toast"]', '[class*="danger"]'];
      const msgs: string[] = [];
      for (const s of sels) {
        document.querySelectorAll<HTMLElement>(s).forEach((el) => {
          const t = el.innerText?.trim();
          if (t && t.toLowerCase() !== "login") msgs.push(`${s}: "${t}"`);
        });
      }
      return msgs;
    });
    if (errors.length) {
      errors.forEach((e) => console.log(`      ⚠️  ${e}`));
    } else {
      console.log("      No error messages.");
    }

    // ── 5. Result ─────────────────────────────────────────────────────────────
    console.log("\n[5/5] Result:");
    if (endUrl !== startUrl) {
      console.log(`\n✅  LOGIN SUCCESSFUL`);
      console.log(`   Redirected to : ${endUrl}`);
      const cookies = await context.cookies();
      console.log(`   Cookies set   : ${cookies.map((c) => c.name).join(", ") || "(none)"}`);
    } else {
      console.log(`\n❌  LOGIN FAILED — URL did not change`);
      process.exitCode = 1;
    }
  } catch (err) {
    await shot(page, "error").catch(() => {});
    console.error("\n❌  EXCEPTION:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testLogin();
