"use client";
import { useEffect, useState } from "react";
import KPICard from "@/components/KPICard";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface StatsData {
  daily: { date: string; trips: number; passengers: number }[];
  topRoutes: { route: string; count: number }[];
  fleetSplit: { name: string; value: number }[];
  revenueByAssoc: { name: string; revenue: number }[];
  totalTrips: number;
  totalPassengers: number;
  totalRevenue: number;
}

const COLORS = ["#2563EB", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/stats?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Fleet operations overview</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(+e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-sm"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : !stats || stats.totalTrips === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <KPICard label="Total Trips" value={stats.totalTrips.toLocaleString()} color="var(--brand)" />
            <KPICard label="Total Passengers" value={stats.totalPassengers.toLocaleString()} color="var(--success)" />
            <KPICard label="Total Revenue" value={`${stats.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} ETB`} color="var(--warning)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Daily Trips">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.daily}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="trips" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Passengers per Day">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.daily}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="passengers" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Top 10 Routes">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.topRoutes} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="route" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Fleet Type Split">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.fleetSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name ?? ""} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}>
                    {stats.fleetSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Revenue by Association">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.revenueByAssoc}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => [`${Number(v).toLocaleString()} ETB`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#0891b2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "color-mix(in srgb, var(--brand) 10%, transparent)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>No data yet</h2>
      <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
        Run the pipeline to import your first dataset and see analytics here.
      </p>
    </div>
  );
}
