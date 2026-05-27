import { parse } from "csv-parse/sync";
import fs from "fs/promises";

export interface TripRow {
  departure: string;
  arrival: string;
  tripDate: Date;
  plateNo: string;
  plateCode: string;
  level: string;
  fleetType: string;
  association: string;
  passengers: number;
  tariff: number;
  serviceCharge: number;
  tripDistance: number;
  employeeName: string;
  total: number;
}

export async function parseCSV(csvPath: string): Promise<TripRow[]> {
  const content = await fs.readFile(csvPath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  if (!records.length) throw new Error("CSV file is empty");

  return records.map((row) => {
    const trimmedRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      trimmedRow[k.trim()] = typeof v === "string" ? v.replace(/\n/g, " ").trim() : v;
    }

    const rawDate = trimmedRow["Date"] || trimmedRow["date"] || "";
    const cleanDate = rawDate.replace(/\n/g, " ").trim();

    return {
      departure: trimmedRow["Departure"] || "",
      arrival: trimmedRow["Arrival"] || "",
      tripDate: parseFlexibleDate(cleanDate),
      plateNo: String(trimmedRow["Plate No"] || "").trim(),
      plateCode: trimmedRow["Plate Code"] || "",
      level: trimmedRow["Level"] || "",
      fleetType: trimmedRow["Fleet Type"] || "",
      association: trimmedRow["Association"] || "",
      passengers: parseInt(trimmedRow["Passengers"] || "0", 10) || 0,
      tariff: parseFloat(trimmedRow["Tariff"] || "0") || 0,
      serviceCharge: parseFloat(trimmedRow["Service Charge"] || "0") || 0,
      tripDistance: parseFloat(trimmedRow["Trip Distance"] || "0") || 0,
      employeeName: trimmedRow["Employee Name"] || "",
      total: parseFloat(trimmedRow["Total"] || "0") || 0,
    };
  });
}

function parseFlexibleDate(raw: string): Date {
  if (!raw) return new Date();
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}
