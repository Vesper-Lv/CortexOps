import { ListTodo } from "lucide-react";
import { MemoList } from "@/components/inbox/memo-list";
import { countMemos, listMemos } from "@/server/services/memos";

export const dynamic = "force-dynamic";

export default async function MemoPage() {
  const memos = await listMemos();
  const counts = countMemos(memos);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Quick capture</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Memo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Jot down questions to confirm later while reading reports or building demos.
        </p>
      </div>

      {memos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListTodo className="h-5 w-5" />
            <span className="text-sm">No memos yet — use the form below to add your first one.</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Open {counts.open} · Done {counts.done} · Total {counts.total}
        </p>
      )}

      <MemoList memos={memos} />
    </section>
  );
}
