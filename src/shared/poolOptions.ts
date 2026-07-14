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

/** Board / list column order. `drop` stays a valid PoolOption but is not seeded or shown as a column. */
export const POOL_DISPLAY_ORDER = [
  "product_inspiration",
  "paper_candidate",
  "demo_replication",
  "knowledge_gap",
  "personal_work",
  "archive"
] as const;

function poolRankKey(poolName: string): string {
  return poolName.replace(/-/g, "_");
}

export function sortPools<T extends { poolName: string }>(groups: T[]): T[] {
  const rank = new Map<string, number>(POOL_DISPLAY_ORDER.map((p, i) => [p, i]));
  return [...groups].sort(
    (a, b) =>
      (rank.get(poolRankKey(a.poolName)) ?? 99) - (rank.get(poolRankKey(b.poolName)) ?? 99)
  );
}

export function poolOptionFromName(poolName: string): PoolOption | null {
  const normalized = poolRankKey(poolName);
  return isValidPool(normalized) ? normalized : null;
}

export function poolNameFromOption(option: PoolOption): string {
  return option.replace(/_/g, "-");
}
