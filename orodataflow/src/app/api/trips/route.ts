import { prisma } from "@/lib/prisma";
import { ethiopianDayRange, todayEthiopian, parseEthiopianISO } from "@/lib/ethiopian-calendar";

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
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.min(200, parseInt(searchParams.get("limit") ?? "100", 10));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (stationId)  where.stationId    = stationId;
  if (arrivalId)  where.arrivalRefId = arrivalId;
  if (fleetType)  where.fleetType    = fleetType;
  if (assocName)  where.associationName = assocName;
  if (employeeId) where.employeeId   = employeeId;
  if (levelFleet) {
    const [lvl, ft] = levelFleet.split(" - ");
    if (lvl) where.level     = lvl.trim();
    if (ft)  where.fleetType = ft.trim();
  }

  // Date filter — all dates stored as UTC midnight identity-mapped ET dates
  if (dateFrom || dateTo) {
    where.tripDate = {};
    if (dateFrom) {
      const et = parseEthiopianISO(dateFrom);
      if (et) where.tripDate.gte = new Date(Date.UTC(et.year, et.month - 1, et.day));
    }
    if (dateTo) {
      const et = parseEthiopianISO(dateTo);
      if (et) where.tripDate.lt = new Date(Date.UTC(et.year, et.month - 1, et.day + 1));
    }
  } else if (dateParam === "today") {
    where.tripDate = ethiopianDayRange(todayEthiopian());
  } else if (dateParam !== "all") {
    const et = parseEthiopianISO(dateParam);
    if (et) where.tripDate = ethiopianDayRange(et);
  }

  const [total, rows] = await Promise.all([
    prisma.tripRecord.count({ where }),
    prisma.tripRecord.findMany({
      where,
      orderBy: { tripDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        departure: true,
        arrival: true,
        tripDate: true,
        plate: true,
        level: true,
        fleetType: true,
        associationName: true,
        associationLevel: true,
        passengers: true,
        tariff: true,
        serviceCharge: true,
        serviceChargeSum: true,
        tripDistance: true,
        employeeName: true,
        total: true,
        plateNo: true,
        plateCode: true,
      },
    }),
  ]);

  return Response.json({ total, page, limit, rows });
}
