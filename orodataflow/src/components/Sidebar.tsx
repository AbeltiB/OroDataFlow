"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/pipeline", label: "Pipeline", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/history", label: "Run History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/data", label: "Data Explorer", icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { href: "/manage", label: "Manage", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const SETTINGS_NAV = [
  { href: "/settings/schedule", label: "Schedule" },
  { href: "/settings/telegram", label: "Telegram" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/connection", label: "Connection" },
];

interface PipelineStatus { running: { stage: string } | null; last: { status: string; finishedAt: string } | null }

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<PipelineStatus | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/pipeline/status");
        if (res.ok) setStatus(await res.json());
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col h-full border-r transition-all duration-200"
      style={{
        width: collapsed ? "64px" : "var(--sidebar-width)",
        background: "var(--card)",
        borderColor: "var(--border)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--brand)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        {!collapsed && <span className="font-bold text-sm" style={{ color: "var(--text)" }}>DataFlow</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded"
          style={{ color: "var(--text-muted)" }}
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm"
              style={{
                background: active ? "color-mix(in srgb, var(--brand) 10%, transparent)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-muted)",
                fontWeight: active ? "600" : "400",
              }}
              title={collapsed ? item.label : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d={item.icon} />
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {!collapsed && (
          <div className="mt-4 mb-1 px-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Settings</p>
          </div>
        )}
        {collapsed && <div className="my-2 mx-4 border-t" style={{ borderColor: "var(--border)" }} />}

        {SETTINGS_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-colors text-sm"
              style={{
                background: active ? "color-mix(in srgb, var(--brand) 10%, transparent)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-muted)",
                fontWeight: active ? "600" : "400",
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? "var(--brand)" : "var(--text-muted)" }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Status panel */}
      {!collapsed && status && (
        <div className="mx-3 mb-3 p-3 rounded-lg text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
          {status.running ? (
            <p style={{ color: "var(--warning)" }}>Running: {status.running.stage}</p>
          ) : status.last ? (
            <p style={{ color: status.last.status === "success" ? "var(--success)" : status.last.status === "failed" ? "var(--error)" : "var(--text-muted)" }}>
              Last: {status.last.status}
            </p>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No runs yet</p>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          title={collapsed ? "Logout" : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
