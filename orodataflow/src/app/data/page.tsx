"use client";
import { useEffect, useState, useCallback } from "react";
import KPICard from "@/components/KPICard";

interface Trip {
  id: string;
  departure: string;
  arrival: string;
  tripDate: string;
  plateNo: string;
  fleetType: string;
  level: string;
  association: string;
  passengers: number;
  tariff: number;
  employeeName: string;
  total: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  departure: string;
  arrival: string;
  fleetType: string;
  level: string;
  association: string;
  search: string;
}

const EMPTY: Filters = { dateFrom: "", dateTo: "", departure: "", arrival: "", fleetType: "", level: "", association: "", search: "" };

export default function DataPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);

  const load = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/data?${params}`);
    const data = await res.json();
    setTrips(data.trips || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(applied, page); }, [applied, page, load]);

  function applyFilters() { setPage(1); setApplied({ ...filters }); }
  function clearFilters() { const e = EMPTY; setFilters(e); setPage(1); setApplied(e); }

  const totalPages = Math.ceil(total / 50);
  const totalTariff = trips.reduce((s, t) => s + t.tariff, 0);
  const totalPassengers = trips.reduce((s, t) => s + t.passengers, 0);

  function exportCSV() {
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.open(`/api/data/export?${params}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Data Explorer</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{total.toLocaleString()} records</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {trips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KPICard label="Showing Trips" value={trips.length} />
          <KPICard label="Passengers" value={totalPassengers.toLocaleString()} color="var(--success)" />
          <KPICard label="Tariff" value={`${totalTariff.toLocaleString("en-US", { maximumFractionDigits: 0 })} ETB`} color="var(--warning)" />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-5 border mb-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {([
            ["dateFrom", "date", "From"],
            ["dateTo", "date", "To"],
            ["departure", "text", "Departure"],
            ["arrival", "text", "Arrival"],
            ["fleetType", "text", "Fleet Type"],
            ["level", "text", "Level"],
            ["association", "text", "Association"],
            ["search", "text", "Employee / Plate"],
          ] as [keyof Filters, string, string][]).map(([key, type, label]) => (
            <div key={key}>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input
                type={type}
                value={filters[key]}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border text-sm outline-none"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={applyFilters} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: "var(--brand)" }}>Apply</button>
          <button onClick={clearFilters} className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : trips.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No records found.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Date", "Route", "Plate", "Fleet", "Level", "Assoc.", "Pass.", "Tariff", "Employee", "Total"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-2.5" style={{ color: "var(--text)" }}>{new Date(t.tripDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 font-medium" style={{ color: "var(--text)" }}>{t.departure} → {t.arrival}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-muted)" }}>{t.plateNo}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text)" }}>{t.fleetType}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text)" }}>{t.level}</td>
                  <td className="px-3 py-2.5 max-w-24 truncate" style={{ color: "var(--text)" }} title={t.association}>{t.association}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: "var(--text)" }}>{t.passengers}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: "var(--text)" }}>{t.tariff.toFixed(2)}</td>
                  <td className="px-3 py-2.5 max-w-24 truncate" style={{ color: "var(--text-muted)" }} title={t.employeeName}>{t.employeeName}</td>
                  <td className="px-3 py-2.5 text-right font-medium" style={{ color: "var(--text)" }}>{t.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded disabled:opacity-40" style={{ color: "var(--text)" }}>Previous</button>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages} ({total.toLocaleString()} records)</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded disabled:opacity-40" style={{ color: "var(--text)" }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
