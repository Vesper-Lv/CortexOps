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

export function isValidPool(pool: string): pool is PoolOption {
  return (POOL_OPTIONS as readonly string[]).includes(pool);
}

export function assertValidPool(pool: string): asserts pool is PoolOption {
  if (!isValidPool(pool)) {
    throw new Error(`invalid pool: ${pool}`);
  }
}
