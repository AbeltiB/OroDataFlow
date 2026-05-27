import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const from = new Date();
  from.setDate(from.getDate() - days);

  const trips = await prisma.tripRecord.findMany({
    where: { tripDate: { gte: from } },
    select: {
      tripDate: true,
      departure: true,
      arrival: true,
      fleetType: true,
      association: true,
      passengers: true,
      tariff: true,
    },
  });

  // Daily trips
  const dailyMap = new Map<string, { trips: number; passengers: number }>();
  for (const t of trips) {
    const day = t.tripDate.toISOString().slice(0, 10);
    const cur = dailyMap.get(day) || { trips: 0, passengers: 0 };
    dailyMap.set(day, { trips: cur.trips + 1, passengers: cur.passengers + t.passengers });
  }
  const daily = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  // Top routes
  const routeMap = new Map<string, number>();
  for (const t of trips) {
    const key = `${t.departure} → ${t.arrival}`;
    routeMap.set(key, (routeMap.get(key) || 0) + 1);
  }
  const topRoutes = Array.from(routeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  // Fleet split
  const fleetMap = new Map<string, number>();
  for (const t of trips) {
    fleetMap.set(t.fleetType, (fleetMap.get(t.fleetType) || 0) + 1);
  }
  const fleetSplit = Array.from(fleetMap.entries()).map(([name, value]) => ({ name, value }));

  // Revenue by association
  const assocMap = new Map<string, number>();
  for (const t of trips) {
    assocMap.set(t.association, (assocMap.get(t.association) || 0) + t.tariff);
  }
  const revenueByAssoc = Array.from(assocMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue: +revenue.toFixed(2) }));

  // Summary
  const totalTrips = trips.length;
  const totalPassengers = trips.reduce((s: number, t) => s + t.passengers, 0);
  const totalRevenue = trips.reduce((s: number, t) => s + t.tariff, 0);

  return Response.json({ daily, topRoutes, fleetSplit, revenueByAssoc, totalTrips, totalPassengers, totalRevenue });
}
