import { TaskList } from "@/components/dashboard/task-list";
import { listTasks } from "@/server/services/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await listTasks();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Execution board</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Tasks</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tasks promoted from memos and future signal conversions appear here.
        </p>
      </div>
      <TaskList tasks={tasks} />
    </section>
  );
}
