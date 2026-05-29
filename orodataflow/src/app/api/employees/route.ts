import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tripRecords: true } } },
  });
  return Response.json(employees);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
  try {
    const emp = await prisma.employee.create({ data: { name: name.trim() } });
    return Response.json(emp, { status: 201 });
  } catch {
    return Response.json({ error: "Employee name already exists" }, { status: 409 });
  }
}
