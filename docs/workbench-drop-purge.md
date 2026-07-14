# Dropped pool purge (90 days)

Candidates moved to `drop` (Trash icon in Pools / Signal cards) stay soft-deleted in the database. A scheduled hard purge removes stale drop rows.

## Script

```bash
# Dry-run (lists matches older than 90 days by updatedAt)
npx tsx scripts/purge-dropped-pools.ts

# Apply deletes
npx tsx scripts/purge-dropped-pools.ts --apply
```

Match rule: `poolName` / `finalPool` is `drop` **or** `status` is `dropped`, and `updatedAt` is older than 90 days.

## Suggested schedule

Weekly via launchd or cron (not installed by this batch):

```cron
0 3 * * 0 cd ~/CortexOps-web-workbench && npx tsx scripts/purge-dropped-pools.ts --apply >> /tmp/purge-dropped-pools.log 2>&1
```

The `drop` pool remains a valid `PoolOption` for writes; the Pools board does not show a drop column.
