import { SectionNav } from "@/components/layout/section-nav";
import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                CortexOps
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-foreground">
                AI PM Workbench
              </h1>
            </div>
            <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
              Codex automations remain the runner
            </div>
          </div>
          <nav>
            <TopNav />
          </nav>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl px-5 py-6">
        <SectionNav />
        <main className="min-w-0 flex-1 pl-6">{children}</main>
      </div>
    </div>
  );
}
