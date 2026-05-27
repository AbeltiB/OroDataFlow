import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.recipient.delete({ where: { id } });
  return Response.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { active } = await request.json();
  const rec = await prisma.recipient.update({ where: { id }, data: { active } });
  return Response.json(rec);
}
