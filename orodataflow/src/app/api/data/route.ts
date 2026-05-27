import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;

  const where: Record<string, unknown> = {};

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    where.tripDate = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo + "T23:59:59Z") }),
    };
  }

  if (searchParams.get("departure")) where.departure = { contains: searchParams.get("departure"), mode: "insensitive" };
  if (searchParams.get("arrival")) where.arrival = { contains: searchParams.get("arrival"), mode: "insensitive" };
  if (searchParams.get("fleetType")) where.fleetType = searchParams.get("fleetType");
  if (searchParams.get("level")) where.level = searchParams.get("level");
  if (searchParams.get("association")) where.association = { contains: searchParams.get("association"), mode: "insensitive" };

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { employeeName: { contains: search, mode: "insensitive" } },
      { plateNo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [trips, total] = await Promise.all([
    prisma.tripRecord.findMany({
      where,
      orderBy: { tripDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tripRecord.count({ where }),
  ]);

  return Response.json({ trips, total, page, limit });
}
