import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendWeeklyEmail(): Promise<string[]> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || "DataFlow <noreply@dataflow.app>";

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const trips = await prisma.tripRecord.findMany({
    where: { tripDate: { gte: weekAgo, lte: now } },
    select: {
      departure: true,
      arrival: true,
      tripDate: true,
      association: true,
      passengers: true,
      tariff: true,
      total: true,
    },
  });

  const totalTrips = trips.length;
  const totalPassengers = trips.reduce((s: number, t) => s + t.passengers, 0);
  const totalRevenue = trips.reduce((s: number, t) => s + t.tariff, 0);

  const routeMap = new Map<string, number>();
  for (const t of trips) {
    const key = `${t.departure} → ${t.arrival}`;
    routeMap.set(key, (routeMap.get(key) || 0) + 1);
  }
  const topRoutes = Array.from(routeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const assocMap = new Map<string, number>();
  for (const t of trips) {
    assocMap.set(t.association, (assocMap.get(t.association) || 0) + t.tariff);
  }
  const topAssocs = Array.from(assocMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const weekLabel = `${weekAgo.toISOString().slice(0, 10)} – ${now.toISOString().slice(0, 10)}`;

  const html = buildWeeklyEmailHtml({
    weekLabel,
    totalTrips,
    totalPassengers,
    totalRevenue,
    topRoutes,
    topAssocs,
  });

  const lastBackup = await prisma.csvBackup.findFirst({
    orderBy: { downloadedAt: "desc" },
  });

  const attachments: { filename: string; content: Buffer }[] = [];
  if (lastBackup) {
    const excelPath = path.join("/tmp", "dataflow", `DataFlow_Report_${lastBackup.reportDate}.xlsx`);
    try {
      const content = await fs.readFile(excelPath);
      attachments.push({ filename: `DataFlow_Report_${lastBackup.reportDate}.xlsx`, content });
    } catch {
      // File not available in /tmp; skip attachment
    }
  }

  const recipients = await prisma.emailRecipient.findMany({ where: { active: true } });
  const sent: string[] = [];

  for (const rec of recipients) {
    try {
      await transport.sendMail({
        from,
        to: rec.email,
        subject: `DataFlow Weekly Report — ${weekLabel}`,
        html,
        attachments,
      });
      sent.push(rec.email);
    } catch (err) {
      console.error(`Failed to send weekly email to ${rec.email}:`, err);
    }
  }

  return sent;
}

export async function sendTestEmail(toEmail: string): Promise<void> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || "DataFlow <noreply@dataflow.app>";
  await transport.sendMail({
    from,
    to: toEmail,
    subject: "DataFlow — Test Email",
    html: "<h2>DataFlow</h2><p>Your email configuration is working correctly.</p>",
  });
}

interface WeeklyEmailParams {
  weekLabel: string;
  totalTrips: number;
  totalPassengers: number;
  totalRevenue: number;
  topRoutes: [string, number][];
  topAssocs: [string, number][];
}

function buildWeeklyEmailHtml(p: WeeklyEmailParams): string {
  const routeRows = p.topRoutes
    .map(([route, count]) => `<tr><td style="padding:6px 12px;">${route}</td><td style="padding:6px 12px;text-align:right;">${count}</td></tr>`)
    .join("");

  const assocRows = p.topAssocs
    .map(([name, rev]) => `<tr><td style="padding:6px 12px;">${name}</td><td style="padding:6px 12px;text-align:right;">${rev.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB</td></tr>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2563EB;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:24px;">DataFlow</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;">Weekly Report — ${p.weekLabel}</p>
    </div>
    <div style="padding:32px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#2563EB;">${p.totalTrips.toLocaleString()}</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px;">Total Trips</div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${p.totalPassengers.toLocaleString()}</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px;">Passengers</div>
        </div>
        <div style="background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#d97706;">${p.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px;">Revenue (ETB)</div>
        </div>
      </div>

      <h3 style="color:#1e293b;margin:0 0 12px;">Top Routes</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:8px 12px;text-align:left;font-size:13px;color:#64748b;">Route</th><th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">Trips</th></tr></thead>
        <tbody>${routeRows}</tbody>
      </table>

      <h3 style="color:#1e293b;margin:0 0 12px;">Top Associations by Revenue</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:8px 12px;text-align:left;font-size:13px;color:#64748b;">Association</th><th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">Revenue</th></tr></thead>
        <tbody>${assocRows}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;">
      DataFlow — Automated Transport Data Pipeline
    </div>
  </div>
</body>
</html>`;
}
