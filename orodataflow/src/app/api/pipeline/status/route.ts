import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const running = await prisma.runLog.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });

  const last = await prisma.runLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  return Response.json({ running: running || null, last: last || null });
}
