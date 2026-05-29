"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Arrival { id: string; name: string; stationId: string; _count?: { tripRecords: number } }
interface Station { id: string; name: string; arrivals: Arrival[]; _count?: { tripRecords: number } }
interface Employee { id: string; name: string; _count?: { tripRecords: number } }

type Tab = "stations" | "employees";

// ── Sub-components ────────────────────────────────────────────────────────────

function Input({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${className}`}
    />
  );
}

function Badge({ n }: { n: number }) {
  return <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{n}</span>;
}

// ── Stations tab ──────────────────────────────────────────────────────────────

function StationsTab() {
  const [stations, setStations] = useState<Station[]>([]);
  const [newStation, setNewStation] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newArrival, setNewArrival] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await fetch("/api/stations").then(r => r.json());
    setStations(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addStation() {
    if (!newStation.trim()) return;
    setSaving(true);
    const res = await fetch("/api/stations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStation.trim() }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); setError(e.error); return; }
    setNewStation(""); setError(""); await load();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/stations/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (!res.ok) { const e = await res.json(); setError(e.error); return; }
    setEditId(null); setError(""); await load();
  }

  async function deleteStation(id: string, name: string) {
    if (!confirm(`Delete station "${name}"? This will also remove its arrivals.`)) return;
    await fetch(`/api/stations/${id}`, { method: "DELETE" });
    await load();
  }

  async function addArrival(stationId: string) {
    const name = (newArrival[stationId] ?? "").trim();
    if (!name) return;
    const res = await fetch(`/api/stations/${stationId}/arrivals`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { const e = await res.json(); setError(e.error); return; }
    setNewArrival(prev => ({ ...prev, [stationId]: "" }));
    setError(""); await load();
  }

  async function deleteArrival(stationId: string, arrivalId: string) {
    await fetch(`/api/stations/${stationId}/arrivals?arrivalId=${arrivalId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Add station */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Add New Station</h3>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-2">
          <Input
            value={newStation}
            onChange={setNewStation}
            placeholder="Station name (e.g. Asallaa)"
            className="flex-1"
          />
          <button
            onClick={addStation}
            disabled={saving}
            className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Station list */}
      {stations.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-10">
          No stations yet. Run the pipeline first or add manually above.
        </p>
      )}
      {stations.map(s => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Station header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            {editId === s.id ? (
              <>
                <Input value={editName} onChange={setEditName} className="flex-1" />
                <button onClick={() => saveEdit(s.id)} className="px-3 py-1 bg-green-700 text-white text-xs rounded-lg">Save</button>
                <button onClick={() => setEditId(null)} className="px-3 py-1 border text-xs rounded-lg text-gray-500">Cancel</button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  className="flex-1 text-left font-semibold text-green-800 flex items-center gap-1"
                >
                  {expandedId === s.id ? "▼" : "▶"} {s.name}
                  <Badge n={s.arrivals.length} />
                  {s._count && <span className="ml-2 text-xs text-gray-400">{s._count.tripRecords} trips</span>}
                </button>
                <button onClick={() => { setEditId(s.id); setEditName(s.name); }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-green-700 border rounded">
                  Edit
                </button>
                <button onClick={() => deleteStation(s.id, s.name)}
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded">
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Arrivals (expanded) */}
          {expandedId === s.id && (
            <div className="p-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Arrivals from {s.name}</p>

              {s.arrivals.length === 0 && (
                <p className="text-sm text-gray-400 mb-3">No arrivals mapped yet.</p>
              )}
              <div className="space-y-1 mb-3">
                {s.arrivals.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                    <span className="flex-1 text-sm">{a.name}</span>
                    <button onClick={() => deleteArrival(s.id, a.id)}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>

              {/* Add arrival */}
              <div className="flex gap-2">
                <Input
                  value={newArrival[s.id] ?? ""}
                  onChange={v => setNewArrival(prev => ({ ...prev, [s.id]: v }))}
                  placeholder="Arrival name (e.g. Kaliti)"
                  className="flex-1"
                />
                <button
                  onClick={() => addArrival(s.id)}
                  className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800"
                >
                  Add Arrival
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Employees tab ─────────────────────────────────────────────────────────────

function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const data = await fetch("/api/employees").then(r => r.json());
    setEmployees(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!newName.trim()) return;
    const res = await fetch("/api/employees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) { const e = await res.json(); setError(e.error); return; }
    setNewName(""); setError(""); await load();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/employees/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (!res.ok) { const e = await res.json(); setError(e.error); return; }
    setEditId(null); setError(""); await load();
  }

  async function del(id: string, name: string) {
    if (!confirm(`Remove employee "${name}"?`)) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Add + search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Add New Employee</h3>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-2 mb-3">
          <Input value={newName} onChange={setNewName} placeholder="Employee full name" className="flex-1" />
          <button onClick={add} className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
            Add
          </button>
        </div>
        <Input value={search} onChange={setSearch} placeholder="Search employees…" className="w-full" />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">
            Employees <Badge n={employees.length} />
          </h3>
          <span className="text-xs text-gray-400">
            {filtered.length !== employees.length && `${filtered.length} shown`}
          </span>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">
            {employees.length === 0 ? "No employees yet. Run the pipeline to auto-import." : "No matches."}
          </p>
        )}
        <div className="divide-y divide-gray-50">
          {filtered.map(e => (
            <div key={e.id} className="flex items-center gap-2 px-4 py-2">
              {editId === e.id ? (
                <>
                  <Input value={editName} onChange={setEditName} className="flex-1" />
                  <button onClick={() => saveEdit(e.id)} className="px-2 py-1 bg-green-700 text-white text-xs rounded">Save</button>
                  <button onClick={() => setEditId(null)} className="px-2 py-1 border text-xs rounded text-gray-500">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{e.name}</span>
                  {e._count && <span className="text-xs text-gray-400">{e._count.tripRecords} trips</span>}
                  <button onClick={() => { setEditId(e.id); setEditName(e.name); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-green-700 border rounded">Edit</button>
                  <button onClick={() => del(e.id, e.name)}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded">Remove</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>("stations");

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-green-800">Manage</h1>
        <p className="text-sm text-gray-500">
          Stations auto-populate on pipeline run. You can rename, add new ones, or map arrivals here.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: "stations", label: "Stations & Routes" },
          { key: "employees", label: "Employees" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-green-700 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stations"  && <StationsTab />}
      {tab === "employees" && <EmployeesTab />}
    </div>
  );
}
