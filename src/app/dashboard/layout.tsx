import { SectionNav } from "@/components/layout/section-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <SectionNav />
      {children}
    </div>
  );
}
