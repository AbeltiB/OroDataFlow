import * as XLSX from "xlsx";
import path from "path";
import fs from "fs/promises";
import type { TripRow } from "./parser";

export interface ExcelResult {
  filePath: string;
  filename: string;
}

export async function generateExcel(trips: TripRow[], reportDate: string): Promise<ExcelResult> {
  const tmpDir = path.join("/tmp", "dataflow");
  await fs.mkdir(tmpDir, { recursive: true });

  const filename = `DataFlow_Report_${reportDate}.xlsx`;
  const filePath = path.join(tmpDir, filename);

  const wb = XLSX.utils.book_new();

  const tripSheet = buildTripSheet(trips);
  XLSX.utils.book_append_sheet(wb, tripSheet, "Daily Trips");

  const summarySheet = buildSummarySheet(trips, reportDate);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const assocSheet = buildAssociationSheet(trips);
  XLSX.utils.book_append_sheet(wb, assocSheet, "By Association");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  await fs.writeFile(filePath, buffer);

  return { filePath, filename };
}

function buildTripSheet(trips: TripRow[]) {
  const headers = [
    "Departure", "Arrival", "Date", "Plate No", "Plate Code",
    "Level", "Fleet Type", "Association", "Passengers",
    "Tariff (ETB)", "Service Charge (ETB)", "Distance (km)", "Employee", "Total (ETB)",
  ];

  const rows = trips.map((t) => [
    t.departure,
    t.arrival,
    t.tripDate.toISOString().replace("T", " ").slice(0, 19),
    t.plateNo,
    t.plateCode,
    t.level,
    t.fleetType,
    t.association,
    t.passengers,
    t.tariff,
    t.serviceCharge,
    t.tripDistance,
    t.employeeName,
    t.total,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  styleHeaderRow(ws, headers.length);
  return ws;
}

function buildSummarySheet(trips: TripRow[], reportDate: string) {
  const totalTrips = trips.length;
  const totalPassengers = trips.reduce((s, t) => s + t.passengers, 0);
  const totalTariff = trips.reduce((s, t) => s + t.tariff, 0);
  const totalServiceCharge = trips.reduce((s, t) => s + t.serviceCharge, 0);
  const totalDistance = trips.reduce((s, t) => s + t.tripDistance, 0);
  const totalPayout = trips.reduce((s, t) => s + t.total, 0);

  const data = [
    ["DataFlow — Daily Report Summary"],
    [`Report Date: ${reportDate}`],
    [],
    ["Metric", "Value"],
    ["Total Trips", totalTrips],
    ["Total Passengers", totalPassengers],
    ["Total Tariff (ETB)", +totalTariff.toFixed(2)],
    ["Total Service Charge (ETB)", +totalServiceCharge.toFixed(2)],
    ["Total Distance (km)", +totalDistance.toFixed(2)],
    ["Total Payout (ETB)", +totalPayout.toFixed(2)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 30 }, { wch: 20 }];
  return ws;
}

function buildAssociationSheet(trips: TripRow[]) {
  const assocMap = new Map<string, { trips: number; passengers: number; tariff: number; payout: number }>();

  for (const t of trips) {
    const existing = assocMap.get(t.association) || { trips: 0, passengers: 0, tariff: 0, payout: 0 };
    assocMap.set(t.association, {
      trips: existing.trips + 1,
      passengers: existing.passengers + t.passengers,
      tariff: existing.tariff + t.tariff,
      payout: existing.payout + t.total,
    });
  }

  const headers = ["Association", "Trip Count", "Passengers", "Total Tariff (ETB)", "Total Payout (ETB)"];
  const rows = Array.from(assocMap.entries())
    .sort((a, b) => b[1].trips - a[1].trips)
    .map(([name, s]) => [name, s.trips, s.passengers, +s.tariff.toFixed(2), +s.payout.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
  styleHeaderRow(ws, headers.length);
  return ws;
}

function styleHeaderRow(ws: XLSX.WorkSheet, colCount: number) {
  for (let c = 0; c < colCount; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center" },
      };
    }
  }
}
