import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
  try {
    const e = await prisma.employee.update({ where: { id }, data: { name: name.trim() } });
    return Response.json(e);
  } catch {
    return Response.json({ error: "Not found or duplicate name" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
