/** JSONL fields owned by human triage in the workbench (import must not overwrite on update). */
export const HUMAN_OWNED_JSONL_FIELDS = [
  "human_status",
  "final_pool",
  "status",
  "reading_pack_status",
  "priority"
] as const;

export type HumanOwnedJsonlField = (typeof HUMAN_OWNED_JSONL_FIELDS)[number];

export type DbHumanFields = {
  humanStatus: string | null;
  finalPool: string | null;
  status: string | null;
  readingPackStatus: string | null;
  priority: string | null;
};

export type JsonHumanFields = Partial<Record<HumanOwnedJsonlField, string | null>>;

export function dbHumanFieldsToJson(fields: DbHumanFields): JsonHumanFields {
  return {
    human_status: fields.humanStatus,
    final_pool: fields.finalPool,
    status: fields.status,
    reading_pack_status: fields.readingPackStatus,
    priority: fields.priority
  };
}

export function mergeHumanFieldsIntoObject(
  obj: Record<string, unknown>,
  dbFields: DbHumanFields
): { merged: Record<string, unknown>; changed: boolean } {
  const patch = dbHumanFieldsToJson(dbFields);
  let changed = false;

  for (const key of HUMAN_OWNED_JSONL_FIELDS) {
    const next = patch[key];
    if (next === undefined) continue;
    const prev = obj[key];

    if (next === null) {
      if (prev === undefined) continue;
      changed = true;
      delete obj[key];
      continue;
    }

    if (prev !== next) {
      changed = true;
      obj[key] = next;
    }
  }

  return { merged: obj, changed };
}
