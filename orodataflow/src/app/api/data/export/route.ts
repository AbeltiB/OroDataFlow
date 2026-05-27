import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where: Record<string, unknown> = {};

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    where.tripDate = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo + "T23:59:59Z") }),
    };
  }
  if (searchParams.get("fleetType")) where.fleetType = searchParams.get("fleetType");
  if (searchParams.get("level")) where.level = searchParams.get("level");
  if (searchParams.get("association")) where.association = { contains: searchParams.get("association"), mode: "insensitive" };

  const trips = await prisma.tripRecord.findMany({ where, orderBy: { tripDate: "desc" }, take: 10000 });

  const headers = ["Departure","Arrival","Date","Plate No","Plate Code","Level","Fleet Type","Association","Passengers","Tariff","Service Charge","Trip Distance","Employee Name","Total"];
  const rows = trips.map((t) => [
    t.departure, t.arrival, t.tripDate.toISOString().slice(0,10),
    t.plateNo, t.plateCode, t.level, t.fleetType, t.association,
    t.passengers, t.tariff, t.serviceCharge, t.tripDistance, t.employeeName, t.total,
  ].map((v: string | number | Date) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dataflow_export.csv"`,
    },
  });
}
