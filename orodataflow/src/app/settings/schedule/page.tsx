"use client";
import { useEffect, useState } from "react";

interface Config {
  cronEnabled: boolean;
  cronTime: string;
  timezone: string;
  weeklyEnabled: boolean;
  weeklyDay: number;
  weeklyTime: string;
}

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function SchedulePage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const updated = await res.json();
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (!config) return <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Schedule</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Configure when the pipeline runs automatically</p>

      <form onSubmit={handleSave} className="space-y-6">
        <Section title="Daily Pipeline">
          <Toggle
            label="Enable automatic daily pipeline"
            checked={config.cronEnabled}
            onChange={(v) => setConfig((c) => c ? { ...c, cronEnabled: v } : c)}
          />
          <Field label="Run time (HH:MM, local timezone)">
            <input
              type="time"
              value={config.cronTime}
              onChange={(e) => setConfig((c) => c ? { ...c, cronTime: e.target.value } : c)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </Field>
          <Field label="Timezone">
            <input
              type="text"
              value={config.timezone}
              onChange={(e) => setConfig((c) => c ? { ...c, timezone: e.target.value } : c)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
              placeholder="Africa/Addis_Ababa"
            />
          </Field>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Note: The actual cron schedule on cron-job.org must be updated manually when you change the time.
          </p>
        </Section>

        <Section title="Weekly Email Summary">
          <Toggle
            label="Enable weekly email summary"
            checked={config.weeklyEnabled}
            onChange={(v) => setConfig((c) => c ? { ...c, weeklyEnabled: v } : c)}
          />
          <Field label="Day of week">
            <select
              value={config.weeklyDay}
              onChange={(e) => setConfig((c) => c ? { ...c, weeklyDay: +e.target.value } : c)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Send time (HH:MM)">
            <input
              type="time"
              value={config.weeklyTime}
              onChange={(e) => setConfig((c) => c ? { ...c, weeklyTime: e.target.value } : c)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </Field>
        </Section>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--brand)" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm" style={{ color: "var(--success)" }}>Saved!</span>}
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 border space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-10 h-6 rounded-full transition-colors"
        style={{ background: checked ? "var(--brand)" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
        />
      </div>
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
    </label>
  );
}
