"use client";
import { useState } from "react";

export default function ConnectionPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function test() {
    setResult(null);
    setTesting(true);
    try {
      const res = await fetch("/api/config/test-connection", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    }
    setTesting(false);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Connection Test</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Verify your dashboard login credentials without running the full pipeline</p>

      <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--text)" }}>
          This will launch a headless browser, navigate to your configured dashboard URL, and attempt login with the configured credentials.
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Credentials are read from environment variables: <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--surface)" }}>DASHBOARD_URL</code>, <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--surface)" }}>DASHBOARD_EMAIL</code>, <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--surface)" }}>DASHBOARD_PASSWORD</code>
        </p>

        <button
          onClick={test}
          disabled={testing}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: testing ? "var(--text-muted)" : "var(--brand)" }}
        >
          {testing ? "Testing connection…" : "Test Connection"}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg`} style={{ background: result.success ? "#dcfce7" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}` }}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
              <span className="font-semibold text-sm" style={{ color: result.success ? "#16a34a" : "#dc2626" }}>
                {result.success ? "Connection successful" : "Connection failed"}
              </span>
            </div>
            {result.error && (
              <pre className="mt-2 text-xs whitespace-pre-wrap" style={{ color: "#dc2626" }}>{result.error}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
