import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stationId } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
  try {
    const arrival = await prisma.arrival.create({
      data: { name: name.trim(), stationId },
    });
    return Response.json(arrival, { status: 201 });
  } catch {
    return Response.json({ error: "Arrival already exists for this station" }, { status: 409 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stationId } = await params;
  const { searchParams } = new URL(req.url);
  const arrivalId = searchParams.get("arrivalId");
  if (!arrivalId) return Response.json({ error: "arrivalId required" }, { status: 400 });
  await prisma.arrival.deleteMany({ where: { id: arrivalId, stationId } });
  return new Response(null, { status: 204 });
}
