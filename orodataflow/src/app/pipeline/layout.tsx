import Sidebar from "@/components/Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6" style={{ background: "var(--surface)" }}>
        {children}
      </main>
    </div>
  );
}
