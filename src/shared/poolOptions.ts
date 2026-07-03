export const POOL_OPTIONS = [
  "product_inspiration",
  "paper_candidate",
  "demo_replication",
  "knowledge_gap",
  "personal_work",
  "archive",
  "drop"
] as const;

export type PoolOption = (typeof POOL_OPTIONS)[number];
