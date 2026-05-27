export default function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    success:  { bg: "#dcfce7", text: "#16a34a", label: "Success" },
    failed:   { bg: "#fee2e2", text: "#dc2626", label: "Failed" },
    running:  { bg: "#fef9c3", text: "#d97706", label: "Running" },
    partial:  { bg: "#fff7ed", text: "#d97706", label: "Partial" },
  };
  const s = config[status] || { bg: "#f1f5f9", text: "#64748b", label: status };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}
