import { TaskBoard } from "@/components/dashboard/task-board";
import { listTasksGrouped } from "@/server/services/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const grouped = await listTasksGrouped();

  return (
    <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Execution board</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Tasks</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kanban 看板：从 Memo、Pools 转化或直接创建的任务。拖拽列后续增强，现用状态下拉移动。
        </p>
      </div>
      <TaskBoard grouped={grouped} />
    </section>
  );
}
