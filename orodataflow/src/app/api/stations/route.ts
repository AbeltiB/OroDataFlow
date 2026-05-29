import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const stations = await prisma.station.findMany({
    orderBy: { name: "asc" },
    include: {
      arrivals: { orderBy: { name: "asc" } },
      _count: { select: { tripRecords: true } },
    },
  });
  return Response.json(stations);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
  try {
    const station = await prisma.station.create({ data: { name: name.trim() } });
    return Response.json(station, { status: 201 });
  } catch {
    return Response.json({ error: "Station name already exists" }, { status: 409 });
  }
}
