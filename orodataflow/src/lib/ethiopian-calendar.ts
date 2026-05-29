// Ethiopian (Ge'ez) Calendar utilities
// Ethiopian calendar has 13 months: 12 × 30 days + Pagume (5 or 6 days)
// Ethiopian year is ~7y8m behind Gregorian; New Year = Sept 11 (or 12 after Gregorian leap year)
// Dates stored in DB from the OTA CSV are Ethiopian dates treated as-if Gregorian values.

export const ET_MONTHS = [
  "Meskerem", // 1
  "Tikimt",   // 2
  "Hidar",    // 3
  "Tahsas",   // 4
  "Tir",      // 5
  "Yekatit",  // 6
  "Megabit",  // 7
  "Miazia",   // 8
  "Ginbot",   // 9
  "Sene",     // 10
  "Hamle",    // 11
  "Nehase",   // 12
  "Pagume",   // 13
];

export interface EthiopianDate {
  year: number;
  month: number; // 1–13
  day: number;   // 1–30 (1–5/6 for Pagume)
}

// ── JDN helpers ──────────────────────────────────────────────────────────────

const ETHIOPIAN_EPOCH_JDN = 1724221; // JDN of Meskerem 1, Year 1 ET (Aug 27, 8 CE Gregorian)

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

function ethiopianToJDN(year: number, month: number, day: number): number {
  return (
    ETHIOPIAN_EPOCH_JDN +
    (year - 1) * 365 +
    Math.floor((year - 1) / 4) +
    (month - 1) * 30 +
    (day - 1)
  );
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = (jdn - ETHIOPIAN_EPOCH_JDN) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - ETHIOPIAN_EPOCH_JDN) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460) +
    1;
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Convert a Gregorian Date to Ethiopian date components */
export function toEthiopian(date: Date): EthiopianDate {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return jdnToEthiopian(gregorianToJDN(y, m, d));
}

/** Convert Ethiopian date components to a Gregorian Date (start of that ET day) */
export function fromEthiopian(et: EthiopianDate): Date {
  const jdn = ethiopianToJDN(et.year, et.month, et.day);
  const { year, month, day } = jdnToGregorian(jdn);
  return new Date(year, month - 1, day);
}

/** Format Ethiopian date as "Ginbot 20, 2018 EC" */
export function formatEthiopian(et: EthiopianDate): string {
  const monthName = ET_MONTHS[et.month - 1] ?? `Month${et.month}`;
  return `${monthName} ${et.day}, ${et.year} EC`;
}

/** Format an Ethiopian date as "YYYY-MM-DD" (using ET year/month/day as numeric) */
export function formatEthiopianISO(et: EthiopianDate): string {
  return `${et.year}-${String(et.month).padStart(2, "0")}-${String(et.day).padStart(2, "0")}`;
}

/**
 * The OTA CSV stores Ethiopian dates AS-IF they were Gregorian values.
 * e.g. Ethiopian "2018-08-21" is stored as the Date 2018-08-21 in the DB.
 * This function reads a JS Date value that was parsed from such a string
 * and returns the Ethiopian date it actually represents (identity mapping).
 * Uses UTC to avoid timezone-shift bugs (dates are stored as UTC midnight).
 */
export function dbDateToEthiopian(dbDate: Date): EthiopianDate {
  return {
    year: dbDate.getUTCFullYear(),
    month: dbDate.getUTCMonth() + 1,
    day: dbDate.getUTCDate(),
  };
}

/**
 * Today's Ethiopian date (converts Gregorian now → Ethiopian).
 */
export function todayEthiopian(): EthiopianDate {
  return toEthiopian(new Date());
}

/**
 * Build a Prisma date-range filter for a given Ethiopian date
 * (matches rows where the stored "fake-Gregorian" date equals that ET date).
 * Uses UTC to avoid local-timezone shifts that would move the midnight boundary.
 */
export function ethiopianDayRange(et: EthiopianDate): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(et.year, et.month - 1, et.day)),
    lt:  new Date(Date.UTC(et.year, et.month - 1, et.day + 1)),
  };
}

/**
 * Build a Prisma date-range filter for a range of Ethiopian dates (inclusive).
 */
export function ethiopianRangeFilter(from: EthiopianDate, to: EthiopianDate): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(from.year, from.month - 1, from.day)),
    lt:  new Date(Date.UTC(to.year,   to.month - 1,   to.day + 1)),
  };
}

/**
 * Parse "YYYY-MM-DD" or "YYYY-M-D" ET ISO string to EthiopianDate.
 */
export function parseEthiopianISO(iso: string): EthiopianDate | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/** Month name for a 1-based month number */
export function monthName(month: number): string {
  return ET_MONTHS[month - 1] ?? `Month${month}`;
}
