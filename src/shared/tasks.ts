export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  origin: string;
  linkedSignalId: string | null;
  status: string;
  priority: string | null;
  createdAt: Date;
};
