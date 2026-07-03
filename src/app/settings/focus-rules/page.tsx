import { FocusRuleList } from "@/components/settings/focus-rule-list";
import { listFocusRules, refreshExpiredFocusRules } from "@/server/services/focusRules";

export const dynamic = "force-dynamic";

export default async function FocusRulesPage() {
  await refreshExpiredFocusRules();
  const rules = await listFocusRules();

  const active = rules.filter((r) => r.status === "active").length;
  const paused = rules.filter((r) => r.status === "paused").length;
  const expired = rules.filter((r) => r.status === "expired").length;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Attention layer</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Focus Rules</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          管理 source boosts、pool boosts 与 automation 作用域。过期规则不影响后续运行。
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Active {active} · Paused {paused} · Expired {expired}
        </p>
      </div>
      <FocusRuleList rules={rules} />
    </section>
  );
}
