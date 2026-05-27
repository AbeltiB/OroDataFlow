import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const [runs, total] = await Promise.all([
    prisma.runLog.findMany({
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.runLog.count(),
  ]);

  return Response.json({ runs, total, page, limit });
}
