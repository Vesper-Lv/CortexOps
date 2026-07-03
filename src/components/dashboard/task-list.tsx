import type { TaskItem } from "@/shared/tasks";

type TaskListProps = {
  tasks: TaskItem[];
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无任务。在 Inbox/Memo 中将 memo 升级为 Task 后会出现在这里。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
        >
          <span className="flex-1 text-sm text-foreground">{task.title}</span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 capitalize">{task.status}</span>
            <span className="rounded bg-muted px-2 py-0.5">{task.origin}</span>
            {task.priority ? <span className="rounded bg-muted px-2 py-0.5">{task.priority}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
