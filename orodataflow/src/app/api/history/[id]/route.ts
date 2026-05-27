import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.runLog.findUnique({ where: { id } });
  if (!run) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(run);
}
