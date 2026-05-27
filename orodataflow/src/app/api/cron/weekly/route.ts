import { sendWeeklyEmail } from "@/lib/pipeline/emailer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const run = await prisma.runLog.create({
    data: { triggeredBy: "cron-weekly", status: "running", stage: "email" },
  });

  try {
    const sent = await sendWeeklyEmail();
    await prisma.runLog.update({
      where: { id: run.id },
      data: { status: "success", sentToEmail: sent, finishedAt: new Date() },
    });
    return Response.json({ ok: true, sentTo: sent });
  } catch (err) {
    await prisma.runLog.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
