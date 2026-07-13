export const PRIORITY_OPTIONS = ["P0", "P1", "P2", "archive"] as const;

export type PriorityOption = (typeof PRIORITY_OPTIONS)[number];
