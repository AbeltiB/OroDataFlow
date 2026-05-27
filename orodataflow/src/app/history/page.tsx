"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface RunLog {
  id: string;
  triggeredBy: string;
  status: string;
  stage?: string | null;
  rowCount?: number | null;
  startedAt: string;
  finishedAt?: string | null;
  sentToTelegram: string[];
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setRuns(d.runs); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Run History</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{total} total runs</p>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No runs yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Started", "Trigger", "Status", "Rows", "Recipients", "Duration"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const duration = run.finishedAt
                  ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                  : null;
                return (
                  <tr key={run.id} className="border-b transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/history/${run.id}`} className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
                        {new Date(run.startedAt).toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: "var(--text)" }}>{run.triggeredBy}</td>
                    <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-4 py-3" style={{ color: "var(--text)" }}>{run.rowCount ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text)" }}>{run.sentToTelegram?.length ?? 0}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{duration !== null ? `${duration}s` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded disabled:opacity-40" style={{ color: "var(--text)" }}>Previous</button>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded disabled:opacity-40" style={{ color: "var(--text)" }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
