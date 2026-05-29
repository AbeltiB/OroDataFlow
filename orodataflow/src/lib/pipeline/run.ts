import { prisma } from "@/lib/prisma";
import { scrapeCSV } from "./scraper";
import { parseCSV, type TripRow } from "./parser";
import { generateExcel } from "./excel";
import { sendTelegramFile, sendTelegramMessage } from "./telegram";

export type PipelineStage =
  | "login"
  | "download"
  | "parse"
  | "backup"
  | "excel"
  | "telegram"
  | "done";

async function setStage(runId: string, stage: PipelineStage) {
  await prisma.runLog.update({ where: { id: runId }, data: { stage } });
}

async function failRun(runId: string, error: string) {
  await prisma.runLog.update({
    where: { id: runId },
    data: { status: "failed", error, finishedAt: new Date() },
  });
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChat) {
    try { await sendTelegramMessage(adminChat, `DataFlow pipeline failed:\n${error}`); } catch {}
  }
}

/**
 * Auto-upsert Station, Arrival, Employee records from CSV rows.
 * Returns lookup maps: stationMap[name] = id, arrivalMap[stationId+":"+name] = id, employeeMap[name] = id
 */
async function syncReferenceData(trips: TripRow[]) {
  // ── Stations (unique departure names) ─────────────────────────────────────
  const stationNames = [...new Set(trips.map((t) => t.departure).filter(Boolean))];
  await prisma.station.createMany({
    data: stationNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const stations = await prisma.station.findMany({ where: { name: { in: stationNames } } });
  const stationMap: Record<string, string> = {};
  for (const s of stations) stationMap[s.name] = s.id;

  // ── Arrivals (unique per station) ─────────────────────────────────────────
  const arrivalPairs = [
    ...new Map(
      trips
        .filter((t) => t.departure && t.arrival)
        .map((t) => [`${t.departure}::${t.arrival}`, { dep: t.departure, arr: t.arrival }])
    ).values(),
  ];

  for (const { dep, arr } of arrivalPairs) {
    const stationId = stationMap[dep];
    if (!stationId) continue;
    await prisma.arrival.upsert({
      where: { name_stationId: { name: arr, stationId } },
      create: { name: arr, stationId },
      update: {},
    });
  }

  const arrivals = await prisma.arrival.findMany({
    where: { stationId: { in: Object.values(stationMap) } },
  });
  const arrivalMap: Record<string, string> = {};
  for (const a of arrivals) arrivalMap[`${a.stationId}:${a.name}`] = a.id;

  // ── Employees ─────────────────────────────────────────────────────────────
  const employeeNames = [...new Set(trips.map((t) => t.employeeName).filter(Boolean))];
  await prisma.employee.createMany({
    data: employeeNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const employees = await prisma.employee.findMany({ where: { name: { in: employeeNames } } });
  const employeeMap: Record<string, string> = {};
  for (const e of employees) employeeMap[e.name] = e.id;

  return { stationMap, arrivalMap, employeeMap };
}

export async function runPipeline(triggeredBy: "cron" | "manual"): Promise<string> {
  const running = await prisma.runLog.findFirst({ where: { status: "running" } });
  if (running) throw new Error("Pipeline is already running");

  const run = await prisma.runLog.create({
    data: { triggeredBy, status: "running", stage: "login" },
  });
  const runId = run.id;

  try {
    // ── Stage: login + download ──────────────────────────────────────────────
    await setStage(runId, "login");
    let csvPath: string;
    let csvFilename: string;
    try {
      const result = await scrapeCSV();
      csvPath = result.csvPath;
      csvFilename = result.filename;
    } catch {
      await new Promise((r) => setTimeout(r, 10000));
      const result = await scrapeCSV();
      csvPath = result.csvPath;
      csvFilename = result.filename;
    }

    await setStage(runId, "download");

    // ── Stage: parse ─────────────────────────────────────────────────────────
    await setStage(runId, "parse");
    const trips = await parseCSV(csvPath);
    if (!trips.length) {
      await failRun(runId, "CSV is empty — no rows to import");
      return runId;
    }

    // ── Stage: backup ────────────────────────────────────────────────────────
    await setStage(runId, "backup");
    const reportDate = trips[0].tripDate.toISOString().slice(0, 10);

    // Sync reference data (stations / arrivals / employees)
    const { stationMap, arrivalMap, employeeMap } = await syncReferenceData(trips);

    const existing = await prisma.csvBackup.findFirst({ where: { reportDate } });
    let backupId: string;

    if (existing) {
      backupId = existing.id;
      await prisma.runLog.update({
        where: { id: runId },
        data: { csvBackupId: backupId, rowCount: existing.rowCount },
      });
    } else {
      const backup = await prisma.csvBackup.create({
        data: { filename: csvFilename, reportDate, rowCount: trips.length, source: "playwright" },
      });
      backupId = backup.id;

      const BATCH = 500;
      for (let i = 0; i < trips.length; i += BATCH) {
        const batch = trips.slice(i, i + BATCH);
        await prisma.tripRecord.createMany({
          data: batch.map((t) => {
            const stationId   = stationMap[t.departure]   ?? null;
            const arrivalRefId = stationId
              ? (arrivalMap[`${stationId}:${t.arrival}`] ?? null)
              : null;
            const employeeId  = employeeMap[t.employeeName] ?? null;
            return {
              csvBackupId: backupId,
              departure:        t.departure,
              arrival:          t.arrival,
              tripDate:         t.tripDate,
              plate:            t.plate,
              associationName:  t.associationName,
              associationLevel: t.associationLevel,
              serviceChargeSum: t.serviceChargeSum,
              plateNo:          t.plateNo,
              plateCode:        t.plateCode,
              level:            t.level,
              fleetType:        t.fleetType,
              association:      t.association,
              passengers:       t.passengers,
              tariff:           t.tariff,
              serviceCharge:    t.serviceCharge,
              tripDistance:     t.tripDistance,
              employeeName:     t.employeeName,
              total:            t.total,
              stationId,
              arrivalRefId,
              employeeId,
            };
          }),
        });
      }

      await prisma.runLog.update({
        where: { id: runId },
        data: { csvBackupId: backupId, rowCount: trips.length },
      });
    }

    // ── Stage: excel ─────────────────────────────────────────────────────────
    await setStage(runId, "excel");
    const { filePath: excelPath, filename: excelFilename } = await generateExcel(trips, reportDate);
    await prisma.runLog.update({ where: { id: runId }, data: { excelFile: excelFilename } });

    // ── Stage: telegram ──────────────────────────────────────────────────────
    await setStage(runId, "telegram");
    const recipients = await prisma.recipient.findMany({ where: { active: true } });
    const sentToTelegram: string[] = [];

    if (recipients.length > 0) {
      const caption = `DataFlow Daily Report\nDate: ${reportDate}\nTrips: ${trips.length}`;
      const results = await sendTelegramFile(excelPath, caption, recipients.map((r) => r.chatId));
      for (const r of results) { if (r.success) sentToTelegram.push(r.chatId); }
      if (results.every((r: { success: boolean }) => !r.success) && results.length > 0) {
        await failRun(runId, "All Telegram sends failed");
        return runId;
      }
    }

    await setStage(runId, "done");
    await prisma.runLog.update({
      where: { id: runId },
      data: {
        status:
          sentToTelegram.length < recipients.length && recipients.length > 0
            ? "partial"
            : "success",
        sentToTelegram,
        finishedAt: new Date(),
      },
    });

    return runId;
  } catch (err) {
    await failRun(runId, String(err));
    return runId;
  }
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const dashboardUrl     = process.env.DASHBOARD_URL!;
    const email            = process.env.DASHBOARD_EMAIL!;
    const password         = process.env.DASHBOARD_PASSWORD!;
    const emailSelector    = process.env.DASHBOARD_EMAIL_SELECTOR    || "input[type='email']";
    const passwordSelector = process.env.DASHBOARD_PASSWORD_SELECTOR || "input[type='password']";
    const submitSelector   = process.env.DASHBOARD_SUBMIT_SELECTOR   || "button[type='submit']";

    await page.goto(dashboardUrl, { waitUntil: "networkidle", timeout: 30_000 });
    const loginPageUrl = page.url();

    await page.waitForSelector(emailSelector, { timeout: 10_000 });
    const emailInput = page.locator(emailSelector).first();
    await emailInput.click({ clickCount: 3 });
    await emailInput.pressSequentially(email, { delay: 40 });
    const passInput = page.locator(passwordSelector).first();
    await passInput.click({ clickCount: 3 });
    await passInput.pressSequentially(password, { delay: 40 });

    await page.locator(submitSelector).first().click();
    await page.waitForURL((u) => u.href !== loginPageUrl, { timeout: 20_000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    await browser?.close();
  }
}
