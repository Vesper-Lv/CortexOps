"use client";

import { useState, useTransition } from "react";
import {
  activateFocusRuleAction,
  archiveFocusRuleAction,
  extendFocusRuleAction,
  exportFocusPolicyAction,
  pauseFocusRuleAction
} from "@/server/actions/focusRuleActions";
import { buildImpactPreview } from "@/shared/focusRules";
import type { FocusRuleItem } from "@/shared/focusRules";

export function FocusRuleList({ rules }: { rules: FocusRuleItem[] }) {
  const [pending, startTransition] = useTransition();
  const [exportText, setExportText] = useState<string | null>(null);

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无 Focus Rules。运行 <code className="text-xs">npm run import</code> 从 docs/focus-policy.md 导入。
      </p>
    );
  }

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  const downloadExport = (md: string) => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "focus-policy-export.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const md = await exportFocusPolicyAction();
              setExportText(md);
            })
          }
          className="rounded border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          导出 Markdown 预览
        </button>
        {exportText && (
          <button
            type="button"
            disabled={pending}
            onClick={() => downloadExport(exportText)}
            className="rounded border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            下载 .md
          </button>
        )}
      </div>

      {exportText && (
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
          {exportText}
        </pre>
      )}

      <ul className="flex flex-col gap-4">
        {rules.map((rule) => {
          const impact = buildImpactPreview(rule);
          return (
            <li key={rule.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{rule.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 capitalize ${
                      rule.isEffective ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rule.status}
                    {rule.isEffective ? " · effective" : ""}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">{rule.priorityBoost} boost</span>
                </div>
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">Source types</dt>
                  <dd>{rule.sourceTypes.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Pool boost</dt>
                  <dd>{rule.candidatePoolBoost.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Applies to</dt>
                  <dd>{rule.appliesTo.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Window</dt>
                  <dd>
                    {rule.startDate} → {rule.endDate ?? "open"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Impact preview</p>
                <ul className="mt-1 list-disc pl-4">
                  {impact.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {rule.status === "active" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => pauseFocusRuleAction(rule.focusId))}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    暂停
                  </button>
                ) : rule.status === "paused" || rule.status === "expired" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => activateFocusRuleAction(rule.focusId))}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    激活
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => archiveFocusRuleAction(rule.focusId))}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  归档
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const next = prompt("新的 end_date (YYYY-MM-DD):", rule.endDate ?? "");
                    if (next) run(() => extendFocusRuleAction(rule.focusId, next));
                  }}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  延期
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
