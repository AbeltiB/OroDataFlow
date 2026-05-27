interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function KPICard({ label, value, sub, color = "var(--brand)" }: KPICardProps) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}
