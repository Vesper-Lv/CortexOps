export const TASK_STATUSES = [
  "inbox",
  "this_week",
  "today",
  "in_progress",
  "waiting",
  "done",
  "archived"
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isValidTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function assertValidTaskStatus(value: string): asserts value is TaskStatus {
  if (!isValidTaskStatus(value)) {
    throw new Error(`invalid task status: ${value}`);
  }
}

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  origin: string;
  linkedSignalId: string | null;
  linkedReportId: string | null;
  status: string;
  priority: string | null;
  createdAt: Date;
};

export const ACTIVE_TASK_STATUSES = ["today", "in_progress", "this_week"] as const;
