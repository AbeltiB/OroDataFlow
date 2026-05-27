"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface RunLog {
  id: string;
  triggeredBy: string;
  status: string;
  stage?: string | null;
  error?: string | null;
  csvBackupId?: string | null;
  excelFile?: string | null;
  rowCount?: number | null;
  sentToTelegram: string[];
  sentToEmail: string[];
  startedAt: string;
  finishedAt?: string | null;
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<RunLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/history/${params.id}`)
      .then((r) => r.json())
      .then(setRun)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  if (!run) return <div className="p-8 text-sm" style={{ color: "var(--error)" }}>Run not found.</div>;

  const duration = run.finishedAt
    ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/history" className="text-sm" style={{ color: "var(--text-muted)" }}>Run History</Link>
        <span style={{ color: "var(--text-muted)" }}>›</span>
        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Run Detail</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Run {run.id.slice(-8)}</h1>
        <StatusBadge status={run.status} />
      </div>

      <div className="rounded-xl p-6 border mb-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="font-semibold mb-4 text-sm" style={{ color: "var(--text)" }}>Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Triggered by", run.triggeredBy],
            ["Started", new Date(run.startedAt).toLocaleString()],
            ["Finished", run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "—"],
            ["Duration", duration !== null ? `${duration}s` : "—"],
            ["Rows imported", run.rowCount ?? "—"],
            ["Last stage", run.stage ?? "—"],
            ["Excel file", run.excelFile ?? "—"],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="mb-0.5" style={{ color: "var(--text-muted)" }}>{k}</dt>
              <dd className="font-medium" style={{ color: "var(--text)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {run.sentToTelegram?.length > 0 && (
        <div className="rounded-xl p-6 border mb-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-3 text-sm" style={{ color: "var(--text)" }}>Telegram Recipients ({run.sentToTelegram.length})</h2>
          <ul className="space-y-1">
            {run.sentToTelegram.map((id) => (
              <li key={id} className="text-sm flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{ color: "var(--text)" }}>{id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {run.error && (
        <div className="rounded-xl p-6 border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <h2 className="font-semibold mb-3 text-sm" style={{ color: "var(--error)" }}>Error</h2>
          <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--error)" }}>{run.error}</pre>
        </div>
      )}
    </div>
  );
}
