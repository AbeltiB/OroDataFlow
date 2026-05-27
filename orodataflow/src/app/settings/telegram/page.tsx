"use client";
import { useEffect, useState } from "react";

interface Recipient { id: string; name: string; chatId: string; active: boolean; createdAt: string }

export default function TelegramPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState("");
  const [chatId, setChatId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [testId, setTestId] = useState("");
  const [testMsg, setTestMsg] = useState("");

  async function load() {
    const r = await fetch("/api/recipients/telegram");
    setRecipients(await r.json());
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const res = await fetch("/api/recipients/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, chatId }),
    });
    if (res.ok) { setName(""); setChatId(""); load(); }
    else { const d = await res.json(); setError(d.error); }
    setAdding(false);
  }

  async function remove(id: string) {
    await fetch(`/api/recipients/telegram/${id}`, { method: "DELETE" });
    load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/recipients/telegram/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  async function test() {
    setTestMsg("");
    const res = await fetch("/api/recipients/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: testId }),
    });
    const d = await res.json();
    setTestMsg(res.ok ? "Test message sent!" : `Failed: ${d.error}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Telegram Recipients</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Manage who receives the daily Excel report via Telegram</p>

      {/* Add form */}
      <form onSubmit={add} className="rounded-xl p-5 border mb-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Add Recipient</h2>
        {error && <p className="text-sm mb-3" style={{ color: "var(--error)" }}>{error}</p>}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Chat ID</label>
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} required placeholder="123456789"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
        </div>
        <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--brand)" }}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {/* Recipients list */}
      <div className="rounded-xl border mb-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        {recipients.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: "var(--text-muted)" }}>No recipients yet.</p>
        ) : recipients.map((r, i) => (
          <div key={r.id} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{r.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.chatId}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: r.active ? "#dcfce7" : "#f1f5f9", color: r.active ? "#16a34a" : "#64748b" }}>
                {r.active ? "Active" : "Inactive"}
              </span>
              <button onClick={() => toggle(r.id, r.active)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                {r.active ? "Disable" : "Enable"}
              </button>
              <button onClick={() => remove(r.id)} className="text-xs px-2 py-1 rounded" style={{ color: "var(--error)" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Test */}
      <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Test Message</h2>
        <div className="flex gap-2">
          <input value={testId} onChange={(e) => setTestId(e.target.value)} placeholder="Enter chat ID to test"
            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button onClick={test} disabled={!testId} className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>Test</button>
        </div>
        {testMsg && <p className="text-sm mt-2" style={{ color: testMsg.startsWith("Test") ? "var(--success)" : "var(--error)" }}>{testMsg}</p>}
      </div>
    </div>
  );
}
