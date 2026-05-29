"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  ET_MONTHS,
  formatEthiopian,
  todayEthiopian,
  dbDateToEthiopian,
  monthName,
  type EthiopianDate,
} from "@/lib/ethiopian-calendar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Station { id: string; name: string; arrivals: { id: string; name: string }[] }
interface Employee { id: string; name: string }

interface Stats {
  totals: { trips: number; passengers: number; serviceChargeSum: number; tariff: number; total: number; distance: number };
  today:  { trips: number; passengers: number; serviceChargeSum: number; tariff: number; total: number; distance: number };
  routes: { route: string; departure: string; arrival: string; trips: number; passengers: number; serviceChargeSum: number; tariff: number; distance: number }[];
}

interface TripRow {
  id: string; departure: string; arrival: string; tripDate: string;
  plate: string | null; level: string; fleetType: string;
  associationName: string | null; associationLevel: string | null;
  passengers: number; tariff: number; serviceCharge: number;
  serviceChargeSum: number | null; tripDistance: number;
  employeeName: string; total: number; plateNo: string; plateCode: string;
}

interface TripsResponse { total: number; page: number; limit: number; rows: TripRow[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function etISO(et: EthiopianDate) {
  return `${et.year}-${String(et.month).padStart(2, "0")}-${String(et.day).padStart(2, "0")}`;
}

function daysInEtMonth(year: number, month: number) {
  return month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
}

function fmt(n: number, dec = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(dec);
}

/** ET date label: "Ginbot 20, 2018" */
function etDateLabel(tripDate: string): string {
  const dt = new Date(tripDate);
  const et = dbDateToEthiopian(dt);
  return `${monthName(et.month)} ${et.day}, ${et.year} EC`;
}

/** SCS with fallback for old rows that have null serviceChargeSum */
function scs(row: TripRow): number {
  if (row.serviceChargeSum != null) return row.serviceChargeSum;
  return Math.round(row.serviceCharge * row.passengers * 100) / 100;
}

function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition ${highlight ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-green-700" : "text-green-800"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = todayEthiopian();

  const [stationId,  setStationId]  = useState("");
  const [arrivalId,  setArrivalId]  = useState("");
  const [fleetType,  setFleetType]  = useState("");
  const [assocName,  setAssocName]  = useState("");
  const [levelFleet, setLevelFleet] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [dateMode,   setDateMode]   = useState<"today" | "range" | "all">("all");
  const [dateFrom,   setDateFrom]   = useState(etISO(today));
  const [dateTo,     setDateTo]     = useState(etISO(today));

  const [stations,  setStations]  = useState<Station[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [trips,     setTrips]     = useState<TripsResponse | null>(null);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [assocNames,  setAssocNames]  = useState<string[]>([]);
  const [levelFleets, setLevelFleets] = useState<string[]>([]);

  // ET date pickers (separate state for from/to)
  const [fromYear,  setFromYear]  = useState(today.year);
  const [fromMonth, setFromMonth] = useState(today.month);
  const [fromDay,   setFromDay]   = useState(today.day);
  const [toYear,    setToYear]    = useState(today.year);
  const [toMonth,   setToMonth]   = useState(today.month);
  const [toDay,     setToDay]     = useState(today.day);

  useEffect(() => {
    fetch("/api/stations").then(r => r.json()).then(setStations).catch(() => {});
    fetch("/api/employees").then(r => r.json()).then(setEmployees).catch(() => {});
  }, []);

  // Populate assoc/level-fleet options from ALL data (not just current page)
  useEffect(() => {
    fetch("/api/trips?date=all&limit=200")
      .then(r => r.json())
      .then((data: TripsResponse) => {
        const rows = data.rows ?? [];
        setAssocNames([...new Set(rows.map((r) => r.associationName).filter(Boolean) as string[])].sort());
        setLevelFleets([...new Set(rows.map((r) => r.level && r.fleetType ? `${r.level} - ${r.fleetType}` : "").filter(Boolean))].sort());
      })
      .catch(() => {});
  }, []);

  const filterQS = useCallback(() => {
    const p = new URLSearchParams();
    if (stationId)  p.set("stationId",  stationId);
    if (arrivalId)  p.set("arrivalId",  arrivalId);
    if (fleetType)  p.set("fleetType",  fleetType);
    if (assocName)  p.set("assocName",  assocName);
    if (levelFleet) p.set("levelFleet", levelFleet);
    if (employeeId) p.set("employeeId", employeeId);
    if (dateMode === "range") {
      p.set("dateFrom", dateFrom);
      p.set("dateTo",   dateTo);
    } else {
      p.set("date", dateMode);
    }
    return p.toString();
  }, [stationId, arrivalId, fleetType, assocName, levelFleet, employeeId, dateMode, dateFrom, dateTo]);

  const loadData = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const qs = filterQS();
      const [s, t] = await Promise.all([
        fetch(`/api/dashboard/stats?${qs}`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
        fetch(`/api/trips?${qs}&page=${pg}&limit=100`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
      ]);
      setStats(s);
      setTrips(t);
      setPage(pg);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [filterQS]);

  useEffect(() => { loadData(1); }, [loadData]);

  const availableArrivals = stationId
    ? (stations.find(s => s.id === stationId)?.arrivals ?? [])
    : [];

  function applyEtDate(field: "from" | "to") {
    if (field === "from") {
      setDateFrom(`${fromYear}-${String(fromMonth).padStart(2, "0")}-${String(fromDay).padStart(2, "0")}`);
    } else {
      setDateTo(`${toYear}-${String(toMonth).padStart(2, "0")}-${String(toDay).padStart(2, "0")}`);
    }
  }

  // Sort routes by trips descending and take top 20
  const topRoutes = (stats?.routes ?? [])
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 20);

  const filterLabel = dateMode === "today" ? `Today (${formatEthiopian(today)})` : dateMode === "all" ? "All Time" : `${dateFrom} → ${dateTo}`;

  return (
    <div className="p-4 space-y-5 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Today (ET): <span className="font-semibold text-green-700">{formatEthiopian(today)}</span>
            {" · "}Showing: <span className="font-medium">{filterLabel}</span>
          </p>
        </div>
        <button
          onClick={() => loadData(1)}
          className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">

          <div className="xl:col-span-1">
            <label className="text-xs text-gray-500 block mb-1">Station (Departure)</label>
            <select value={stationId} onChange={e => { setStationId(e.target.value); setArrivalId(""); }}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All Stations</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="xl:col-span-1">
            <label className="text-xs text-gray-500 block mb-1">Arrival</label>
            <select value={arrivalId} onChange={e => setArrivalId(e.target.value)}
              disabled={!stationId}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white disabled:opacity-40">
              <option value="">All</option>
              {availableArrivals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Fleet Type</label>
            <select value={fleetType} onChange={e => setFleetType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All</option>
              <option value="Midbus">Midbus</option>
              <option value="Minibus">Minibus</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Level – Fleet</label>
            <select value={levelFleet} onChange={e => setLevelFleet(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {levelFleets.map(lf => <option key={lf} value={lf}>{lf}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Association</label>
            <select value={assocName} onChange={e => setAssocName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {assocNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Employee</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Date (ET)</label>
            <select value={dateMode} onChange={e => setDateMode(e.target.value as "today"|"range"|"all")}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="all">All Time</option>
              <option value="today">Today ({formatEthiopian(today)})</option>
              <option value="range">Custom Range</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={() => { setStationId(""); setArrivalId(""); setFleetType(""); setAssocName(""); setLevelFleet(""); setEmployeeId(""); setDateMode("all"); }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              Clear
            </button>
          </div>
        </div>

        {/* ET date range picker */}
        {dateMode === "range" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["from","to"] as const).map(field => {
              const yr = field === "from" ? fromYear  : toYear;
              const mo = field === "from" ? fromMonth : toMonth;
              const dy = field === "from" ? fromDay   : toDay;
              const setYr = field === "from" ? setFromYear  : setToYear;
              const setMo = field === "from" ? setFromMonth : setToMonth;
              const setDy = field === "from" ? setFromDay   : setToDay;
              return (
                <div key={field} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2 capitalize">{field === "from" ? "From" : "To"} (Ethiopian Calendar)</p>
                  <div className="flex gap-1 flex-wrap">
                    <select value={yr} onChange={e => setYr(+e.target.value)}
                      className="border rounded px-1 py-1 text-sm w-20">
                      {Array.from({ length: 20 }, (_, i) => today.year - 10 + i).map(y =>
                        <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={mo} onChange={e => setMo(+e.target.value)}
                      className="border rounded px-1 py-1 text-sm flex-1 min-w-[90px]">
                      {ET_MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <select value={dy} onChange={e => setDy(+e.target.value)}
                      className="border rounded px-1 py-1 text-sm w-14">
                      {Array.from({ length: daysInEtMonth(yr, mo) }, (_, i) => i+1).map(d =>
                        <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={() => applyEtDate(field)}
                      className="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800">
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {field === "from" ? dateFrom : dateTo}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stat Boxes */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox
            label={dateMode === "today" ? "Trips Today" : "Total Trips"}
            value={fmt(stats.totals.trips)}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.trips)}` : undefined}
          />
          <StatBox
            label={dateMode === "today" ? "Passengers Today" : "Total Passengers"}
            value={fmt(stats.totals.passengers)}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.passengers)}` : undefined}
          />
          <StatBox
            label="Service Charge Sum (SCS)"
            value={`${fmt(stats.totals.serviceChargeSum, 2)} ETB`}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.serviceChargeSum, 2)} ETB` : undefined}
            highlight
          />
          <StatBox
            label="Total Tariff"
            value={`${fmt(stats.totals.tariff, 2)} ETB`}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.tariff, 2)} ETB` : undefined}
          />
          <StatBox
            label="Total Revenue"
            value={`${fmt(stats.totals.total, 2)} ETB`}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.total, 2)} ETB` : undefined}
          />
          <StatBox
            label="Total Distance"
            value={`${fmt(stats.totals.distance)} km`}
            sub={dateMode !== "today" ? `Today: ${fmt(stats.today.distance)} km` : undefined}
          />
        </div>
      )}

      {/* Route Performance Chart */}
      {stats && topRoutes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-green-800">Route Performance</h2>
          <p className="text-xs text-gray-400 mb-4">
            Top {topRoutes.length} routes by trip count (departure → arrival)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRoutes} margin={{ bottom: 80, left: 10, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="route"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [Number(v).toLocaleString(), "trips"]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(l: any) => `Route: ${l}`}
              />
              <Bar dataKey="trips" name="Trips" radius={[3,3,0,0]}>
                {topRoutes.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#15803d" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trips table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-green-800">Trip Records</h2>
            <p className="text-xs text-gray-400">
              {loading ? "Loading…" : `${(trips?.total ?? 0).toLocaleString()} total rows · ${filterLabel}`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-green-700 text-white sticky top-0">
              <tr>
                {["Date (ET)","Departure","Arrival","Plate","Level","Fleet","Association","Lvl",
                  "Pax","Tariff","Svc Chg","SCS","Dist (km)","Total","Employee"].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(trips?.rows ?? []).map((row, i) => {
                const et = dbDateToEthiopian(new Date(row.tripDate));
                const etStr = `${monthName(et.month)} ${et.day}, ${et.year}`;
                const scsFallback = scs(row);
                return (
                  <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-2 py-1.5 font-mono">
                      <span className="text-green-700 font-semibold">{etStr}</span>
                    </td>
                    <td className="px-2 py-1.5 font-semibold text-green-800">{row.departure}</td>
                    <td className="px-2 py-1.5">{row.arrival}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-600">{row.plate ?? `${row.plateCode}${row.plateNo}`}</td>
                    <td className="px-2 py-1.5 text-gray-600">{row.level}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row.fleetType === "Midbus" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      }`}>{row.fleetType}</span>
                    </td>
                    <td className="px-2 py-1.5">{row.associationName ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center">{row.associationLevel ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{row.passengers}</td>
                    <td className="px-2 py-1.5 text-right">{row.tariff.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right">{row.serviceCharge.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-green-700">
                      {scsFallback.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right">{row.tripDistance.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{row.total.toFixed(2)}</td>
                    <td className="px-2 py-1.5">{row.employeeName}</td>
                  </tr>
                );
              })}
              {!loading && (trips?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-gray-400">
                    No records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {trips && trips.total > trips.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Showing {((page-1)*trips.limit+1).toLocaleString()}–{Math.min(page*trips.limit, trips.total).toLocaleString()} of {trips.total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button disabled={page<=1} onClick={() => loadData(page-1)}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <button disabled={page*trips.limit>=trips.total} onClick={() => loadData(page+1)}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
