import { prisma } from "@/lib/prisma";
import { ethiopianDayRange, todayEthiopian } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const stationId  = searchParams.get("stationId")  || undefined;
  const arrivalId  = searchParams.get("arrivalId")  || undefined;
  const fleetType  = searchParams.get("fleetType")  || undefined;
  const assocName  = searchParams.get("assocName")  || undefined;
  const levelFleet = searchParams.get("levelFleet") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const dateParam  = searchParams.get("date")       || "all";
  const dateFrom   = searchParams.get("dateFrom")   || undefined;
  const dateTo     = searchParams.get("dateTo")     || undefined;

  const where = buildWhere({ stationId, arrivalId, fleetType, assocName, levelFleet, employeeId, dateFrom, dateTo, dateParam });
  const todayRange = ethiopianDayRange(todayEthiopian());
  const todayWhere = buildWhere({ stationId, arrivalId, fleetType, assocName, levelFleet, employeeId, dateParam: "today" });

  const [totalTrips, sumAgg, todayTrips, todaySumAgg, routeRows] = await Promise.all([
    prisma.tripRecord.count({ where }),

    prisma.tripRecord.aggregate({
      where,
      _sum: { passengers: true, serviceChargeSum: true, tariff: true, serviceCharge: true, tripDistance: true, total: true },
    }),

    prisma.tripRecord.count({ where: todayWhere }),

    prisma.tripRecord.aggregate({
      where: todayWhere,
      _sum: { passengers: true, serviceChargeSum: true, tariff: true, serviceCharge: true, tripDistance: true, total: true },
    }),

    prisma.tripRecord.groupBy({
      by: ["departure", "arrival"],
      where,
      _sum: { passengers: true, serviceChargeSum: true, serviceCharge: true, tariff: true, tripDistance: true },
      _count: { departure: true },
      orderBy: { _sum: { passengers: "desc" } },
      take: 30,
    }),
  ]);

  return Response.json({
    totals: {
      trips:            totalTrips,
      passengers:       sumAgg._sum.passengers       ?? 0,
      serviceChargeSum: sumAgg._sum.serviceChargeSum ?? 0,
      tariff:           sumAgg._sum.tariff           ?? 0,
      total:            sumAgg._sum.total            ?? 0,
      distance:         sumAgg._sum.tripDistance     ?? 0,
    },
    today: {
      trips:            todayTrips,
      passengers:       todaySumAgg._sum.passengers       ?? 0,
      serviceChargeSum: todaySumAgg._sum.serviceChargeSum ?? 0,
      tariff:           todaySumAgg._sum.tariff           ?? 0,
      total:            todaySumAgg._sum.total            ?? 0,
      distance:         todaySumAgg._sum.tripDistance     ?? 0,
    },
    routes: routeRows.map((r) => ({
      route:            `${r.departure} → ${r.arrival}`,
      departure:        r.departure,
      arrival:          r.arrival,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trips:            (r._count as any)?.departure ?? 0,
      passengers:       r._sum?.passengers       ?? 0,
      serviceChargeSum: r._sum?.serviceChargeSum ?? 0,
      tariff:           r._sum?.tariff           ?? 0,
      distance:         r._sum?.tripDistance     ?? 0,
    })),
    todayRange,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWhere(f: {
  stationId?: string; arrivalId?: string; fleetType?: string;
  assocName?: string; levelFleet?: string; employeeId?: string;
  dateFrom?: string; dateTo?: string; dateParam?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (f.stationId)  where.stationId    = f.stationId;
  if (f.arrivalId)  where.arrivalRefId = f.arrivalId;
  if (f.fleetType)  where.fleetType    = f.fleetType;
  if (f.assocName)  where.associationName = f.assocName;
  if (f.employeeId) where.employeeId   = f.employeeId;
  if (f.levelFleet) {
    const [lvl, ft] = f.levelFleet.split(" - ");
    if (lvl) where.level     = lvl.trim();
    if (ft)  where.fleetType = ft.trim();
  }
  if (f.dateFrom || f.dateTo) {
    where.tripDate = {};
    if (f.dateFrom) {
      const parts = f.dateFrom.split("-").map(Number);
      if (parts.length === 3) where.tripDate.gte = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    }
    if (f.dateTo) {
      const parts = f.dateTo.split("-").map(Number);
      if (parts.length === 3) where.tripDate.lt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
    }
  } else if (f.dateParam === "today") {
    where.tripDate = ethiopianDayRange(todayEthiopian());
  }
  // "all" = no date filter
  return where;
}
