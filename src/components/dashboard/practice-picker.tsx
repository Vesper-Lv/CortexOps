"use client";

import { useState, useTransition } from "react";
import { confirmPractice } from "@/server/actions/dailySessionActions";
import { POOL_OPTIONS } from "@/shared/poolOptions";
import type { PracticeOption } from "@/server/importers/dailyReportParser";
import type { DailySessionData } from "@/server/services/dailyReport";

const PRACTICE_POOL_OPTIONS = POOL_OPTIONS.filter((p) => p !== "archive");

type Props = {
  date: string;
  practices: PracticeOption[];
  session: DailySessionData | null;
};

function getDisposition(session: DailySessionData | null, index: number): string {
  if (!session) return "";
  if (index === 0) return session.practiceAlt0Disposition ?? "";
  if (index === 1) return session.practiceAlt1Disposition ?? "";
  return session.practiceAlt2Disposition ?? "";
}

export function PracticePicker({ date, practices, session }: Props) {
  const [pending, startTransition] = useTransition();
  const isComplete = session?.selectedPracticeIndex != null;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    session?.selectedPracticeIndex ?? null
  );
  const [dispositions, setDispositions] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    practices.forEach((p) => {
      const d = getDisposition(session, p.index);
      if (d) initial[p.index] = d;
    });
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  if (isComplete && session?.selectedPracticeIndex != null) {
    const practice = practices[session.selectedPracticeIndex];
    if (!practice) return null;
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">今日练习</p>
        <h4 className="mt-2 text-base font-semibold text-foreground">{practice.title}</h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{practice.body}</p>
      </div>
    );
  }

  const handleConfirm = () => {
    setError(null);
    if (selectedIndex == null) {
      setError("请选择一条练习");
      return;
    }
    const missing = practices
      .filter((p) => p.index !== selectedIndex)
      .filter((p) => !dispositions[p.index]);
    if (missing.length > 0) {
      setError("请为未选中的练习指定去向（池或 drop）");
      return;
    }

    const payload = practices
      .filter((p) => p.index !== selectedIndex)
      .map((p) => ({ index: p.index, disposition: dispositions[p.index] }));

    startTransition(async () => {
      try {
        await confirmPractice(date, selectedIndex, payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "确认失败");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {practices.map((practice) => {
        const isSelected = selectedIndex === practice.index;
        return (
          <label
            key={practice.index}
            className={`flex cursor-pointer flex-col gap-2 rounded-md border p-4 transition-colors ${
              isSelected ? "border-primary bg-primary/5" : "border-border bg-surface"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="practice"
                checked={isSelected}
                onChange={() => setSelectedIndex(practice.index)}
                className="mt-1"
              />
              <div className="flex-1">
                <span className="text-base font-semibold text-foreground">{practice.title}</span>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{practice.body}</p>
              </div>
            </div>
            {!isSelected && selectedIndex != null && (
              <div className="ml-7">
                <select
                  value={dispositions[practice.index] ?? ""}
                  onChange={(e) =>
                    setDispositions((prev) => ({ ...prev, [practice.index]: e.target.value }))
                  }
                  className="rounded border border-border bg-surface px-2 py-1 text-sm"
                >
                  <option value="" disabled>
                    选择去向…
                  </option>
                  {PRACTICE_POOL_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </label>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={handleConfirm}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        确认今日练习
      </button>
    </div>
  );
}
