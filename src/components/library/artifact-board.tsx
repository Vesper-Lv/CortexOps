"use client";

import { useTransition } from "react";
import { updateArtifactStatusAction } from "@/server/actions/artifactActions";
import type { ArtifactItem } from "@/shared/artifacts";
import { ARTIFACT_STATUSES } from "@/shared/artifacts";

export function ArtifactBoard({
  grouped,
  portfolioReady
}: {
  grouped: Record<string, ArtifactItem[]>;
  portfolioReady: ArtifactItem[];
}) {
  const [pending, startTransition] = useTransition();
  const total = Object.values(grouped).reduce((n, items) => n + items.length, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无 Artifact。在 Pools 中将已分拣条目转为 Artifact candidate。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Portfolio-ready</h3>
        {portfolioReady.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚无 portfolio_ready / published 条目。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {portfolioReady.map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                {a.proofArtifact && (
                  <p className="mt-1 text-xs text-muted-foreground">Proof: {a.proofArtifact}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">By status</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {ARTIFACT_STATUSES.map((status) => {
            const items = grouped[status] ?? [];
            return (
              <div key={status} className="w-56 shrink-0 rounded-lg border border-border bg-muted/20">
                <div className="border-b border-border px-3 py-2 text-sm font-semibold capitalize">
                  {status.replace(/_/g, " ")} ({items.length})
                </div>
                <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto p-2">
                  {items.map((a) => (
                    <li key={a.id} className="rounded border border-border bg-surface p-2 text-xs">
                      <p className="font-medium">{a.title}</p>
                      {a.interviewStoryAngle && (
                        <p className="mt-1 text-muted-foreground">{a.interviewStoryAngle}</p>
                      )}
                      <select
                        disabled={pending}
                        value={a.status}
                        onChange={(e) =>
                          startTransition(() => void updateArtifactStatusAction(a.id, e.target.value))
                        }
                        className="mt-2 w-full rounded border border-border px-1 py-0.5"
                      >
                        {ARTIFACT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
