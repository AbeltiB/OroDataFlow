import { parse } from "csv-parse/sync";
import fs from "fs/promises";

export interface TripRow {
  departure: string;
  arrival: string;
  tripDate: Date;
  // Enhanced
  plate: string;          // "OR-3-61253"
  associationName: string; // "Yenyaa"
  associationLevel: string;// "1"
  serviceChargeSum: number;// serviceCharge × passengers
  // Original
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
    // Normalise all keys (trim whitespace) and values (collapse embedded newlines)
    const r: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      r[k.trim()] = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v;
    }

    const plateCode = r["Plate Code"] ?? "";
    const plateNo   = r["Plate No"]   ?? "";
    const plate     = plateCode && plateNo ? `${plateCode}${plateNo}` : plateNo;

    const rawAssoc  = r["Association"] ?? "";
    const { name: associationName, level: associationLevel } = splitAssociation(rawAssoc);

    const passengers    = parseInt(r["Passengers"] ?? "0", 10) || 0;
    const serviceCharge = Math.round((parseFloat(r["Service Charge"] ?? "0") || 0) * 100) / 100;
    const serviceChargeSum = Math.round(serviceCharge * passengers * 100) / 100;

    const rawDate  = r["Date"] ?? "";
    const tripDate = parseFlexibleDate(rawDate);

    return {
      departure:        r["Departure"]     ?? "",
      arrival:          r["Arrival"]       ?? "",
      tripDate,
      plate,
      associationName,
      associationLevel,
      serviceChargeSum,
      plateNo,
      plateCode,
      level:            r["Level"]         ?? "",
      fleetType:        r["Fleet Type"]    ?? "",
      association:      rawAssoc,
      passengers,
      tariff:           parseFloat(r["Tariff"] ?? "0") || 0,
      serviceCharge,
      tripDistance:     parseFloat(r["Trip Distance"] ?? "0") || 0,
      employeeName:     r["Employee Name"] ?? "",
      total:            parseFloat(r["Total"] ?? "0") || 0,
    };
  });
}

/** Split "Yenyaa-1" → { name: "Yenyaa", level: "1" }. Works for multi-word names. */
function splitAssociation(raw: string): { name: string; level: string } {
  const match = raw.match(/^(.+?)-(\d+)$/);
  if (match) return { name: match[1].trim(), level: match[2] };
  return { name: raw.trim(), level: "" };
}

function parseFlexibleDate(raw: string): Date {
  if (!raw) return new Date(0);
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return new Date(0);
}
