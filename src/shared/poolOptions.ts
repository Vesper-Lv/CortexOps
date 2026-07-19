export const POOL_OPTIONS = ["product", "paper", "engineering", "archive", "drop"] as const;

export type PoolOption = (typeof POOL_OPTIONS)[number];

function normalizePoolKey(pool: string): string {
  return pool.trim().toLowerCase().replace(/-/g, "_");
}

export const POOL_MIGRATION_MAP: Record<string, PoolOption> = {
  product: "product",
  product_inspiration: "product",
  paper: "paper",
  paper_candidate: "paper",
  paper_candidates: "paper",
  engineering: "engineering",
  demo_replication: "engineering",
  engineering_learning: "engineering",
  knowledge_gap: "engineering",
  personal_work: "engineering",
  archive: "archive",
  drop: "drop"
};

export function isValidPool(pool: string): pool is PoolOption {
  return (POOL_OPTIONS as readonly string[]).includes(pool);
}

export function assertValidPool(pool: string): asserts pool is PoolOption {
  if (!isValidPool(pool)) {
    throw new Error(`invalid pool: ${pool}`);
  }
}

/** Board / list column order. Only 3 action pools are shown as columns. */
export const POOL_DISPLAY_ORDER = [
  "product",
  "paper",
  "engineering"
] as const;

/** Old pool names collapse into the current active pools. */
export function normalizePoolName(pool: string | null | undefined): PoolOption | null {
  if (pool === null || pool === undefined) return null;
  const trimmed = pool.trim();
  if (!trimmed) return null;
  return POOL_MIGRATION_MAP[normalizePoolKey(trimmed)] ?? null;
}

export function migratePoolName(oldName: string): string {
  return normalizePoolName(oldName) ?? oldName;
}

function poolRankKey(poolName: string): string {
  return normalizePoolName(poolName) ?? poolName;
}

export function sortPools<T extends { poolName: string }>(groups: T[]): T[] {
  const rank = new Map<string, number>(POOL_DISPLAY_ORDER.map((p, i) => [p, i]));
  return [...groups].sort(
    (a, b) =>
      (rank.get(poolRankKey(a.poolName)) ?? 99) - (rank.get(poolRankKey(b.poolName)) ?? 99)
  );
}

export function poolOptionFromName(poolName: string): PoolOption | null {
  return normalizePoolName(poolName);
}

export function poolNameFromOption(option: PoolOption): string {
  return option;
}

export function getPoolAliases(poolName: string | null | undefined): string[] {
  const normalized = normalizePoolName(poolName);
  if (!normalized) return [];

  const aliases = new Set<string>([normalized]);
  for (const [alias, canonical] of Object.entries(POOL_MIGRATION_MAP)) {
    if (canonical === normalized) aliases.add(alias);
  }

  return [...aliases];
}
