import { NavigationList } from "@/components/layout/navigation-list";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-surface px-5 py-6 lg:block">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            CortexOps
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-surface-foreground">
            AI PM Workbench
          </h1>
        </div>
        <nav className="space-y-1">
          <NavigationList variant="sidebar" />
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Local-first Web App
              </p>
              <p className="text-base font-semibold text-foreground">
                Phase 1 skeleton
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
              Codex automations remain the runner
            </div>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <NavigationList variant="mobile" />
          </nav>
        </header>
        <main className="px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
