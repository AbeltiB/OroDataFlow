"use client";
import { useEffect, useState, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";

const STAGES = ["login", "download", "parse", "backup", "excel", "telegram", "done"];

interface RunLog {
  id: string;
  triggeredBy: string;
  status: string;
  stage?: string | null;
  error?: string | null;
  rowCount?: number | null;
  startedAt: string;
  finishedAt?: string | null;
  sentToTelegram: string[];
}

export default function PipelinePage() {
  const [running, setRunning] = useState<RunLog | null>(null);
  const [last, setLast] = useState<RunLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    const res = await fetch("/api/pipeline/status");
    if (res.ok) {
      const data = await res.json();
      setRunning(data.running);
      setLast(data.last);
      if (!data.running && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }

  useEffect(() => {
    fetchStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleRun() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start pipeline");
        return;
      }
      await fetchStatus();
      pollRef.current = setInterval(fetchStatus, 2000);
    } finally {
      setLoading(false);
    }
  }

  const isRunning = !!running;
  const currentStage = running?.stage;
  const currentStageIdx = currentStage ? STAGES.indexOf(currentStage) : -1;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Pipeline</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Trigger the daily data collection pipeline</p>

      {error && (
        <div className="mb-4 p-4 rounded-lg text-sm" style={{ background: "#fef2f2", color: "var(--error)", border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {/* Run button */}
      <div className="rounded-xl p-6 border mb-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold" style={{ color: "var(--text)" }}>Manual Trigger</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Downloads CSV, backs up to DB, generates Excel, sends via Telegram</p>
          </div>
          <button
            onClick={handleRun}
            disabled={isRunning || loading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: isRunning || loading ? "var(--text-muted)" : "var(--brand)" }}
          >
            {isRunning ? "Running…" : loading ? "Starting…" : "Run Now"}
          </button>
        </div>

        {/* Stage progress */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {STAGES.filter(s => s !== "done").map((stage, idx) => {
                const done = idx < currentStageIdx;
                const active = idx === currentStageIdx;
                return (
                  <div key={stage} className="flex items-center gap-1">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: done ? "#dcfce7" : active ? "#fef9c3" : "var(--surface)",
                        color: done ? "#16a34a" : active ? "#d97706" : "var(--text-muted)",
                        border: `1px solid ${done ? "#bbf7d0" : active ? "#fde68a" : "var(--border)"}`,
                      }}
                    >
                      {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                      {active && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#d97706" }} />}
                      {stage}
                    </div>
                    {idx < STAGES.length - 2 && <span style={{ color: "var(--text-muted)" }}>›</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Last run */}
      {last && (
        <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Last Run</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p style={{ color: "var(--text-muted)" }}>Status</p>
              <div className="mt-1"><StatusBadge status={last.status} /></div>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Triggered by</p>
              <p className="mt-1 font-medium capitalize" style={{ color: "var(--text)" }}>{last.triggeredBy}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Started</p>
              <p className="mt-1 font-medium" style={{ color: "var(--text)" }}>{new Date(last.startedAt).toLocaleString()}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Rows imported</p>
              <p className="mt-1 font-medium" style={{ color: "var(--text)" }}>{last.rowCount ?? "—"}</p>
            </div>
            {last.sentToTelegram?.length > 0 && (
              <div className="col-span-2">
                <p style={{ color: "var(--text-muted)" }}>Sent to Telegram</p>
                <p className="mt-1 font-medium" style={{ color: "var(--text)" }}>{last.sentToTelegram.length} recipient(s)</p>
              </div>
            )}
            {last.error && (
              <div className="col-span-2">
                <p style={{ color: "var(--text-muted)" }}>Error</p>
                <p className="mt-1 text-xs font-mono p-2 rounded" style={{ color: "var(--error)", background: "#fef2f2" }}>{last.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
