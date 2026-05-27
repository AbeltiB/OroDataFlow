import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config) {
    config = await prisma.appConfig.create({ data: { id: "singleton" } });
  }
  return Response.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { cronEnabled, cronTime, timezone, weeklyEnabled, weeklyDay, weeklyTime } = body;

  const config = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", cronEnabled, cronTime, timezone, weeklyEnabled, weeklyDay, weeklyTime },
    update: { cronEnabled, cronTime, timezone, weeklyEnabled, weeklyDay, weeklyTime },
  });
  return Response.json(config);
}
