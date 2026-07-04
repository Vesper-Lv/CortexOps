import { describe, expect, it } from "vitest";
import {
  dbHumanFieldsToJson,
  mergeHumanFieldsIntoObject
} from "@/server/exporters/humanFields";
import {
  exportJsonlFiles,
  registerByLine,
  resolveDbRecord,
  type DbLookups
} from "@/server/exporters/jsonlExporter";
import { patchFocusPolicyMarkdown } from "@/server/exporters/focusPolicyExporter";

function emptyLookups(overrides?: Partial<DbLookups>): DbLookups {
  return {
    byLine: new Map(),
    byRecordKey: new Map(),
    byExternalId: new Map(),
    byCanonicalKey: new Map(),
    ...overrides
  };
}

describe("mergeHumanFieldsIntoObject", () => {
  it("patches human-owned fields from DB values", () => {
    const obj = { id: "x", human_status: "pending", final_pool: "knowledge_gap" };
    const { merged, changed } = mergeHumanFieldsIntoObject(obj, {
      humanStatus: "confirmed",
      finalPool: "demo_replication",
      status: "confirmed",
      readingPackStatus: "selected"
    });

    expect(changed).toBe(true);
    expect(merged).toMatchObject({
      id: "x",
      human_status: "confirmed",
      final_pool: "demo_replication",
      status: "confirmed",
      reading_pack_status: "selected"
    });
  });

  it("is unchanged when values already match", () => {
    const obj = { human_status: "confirmed", final_pool: "archive", status: "confirmed" };
    const { changed } = mergeHumanFieldsIntoObject(obj, {
      humanStatus: "confirmed",
      finalPool: "archive",
      status: "confirmed",
      readingPackStatus: null
    });
    expect(changed).toBe(false);
  });
});

describe("registerByLine", () => {
  it("prefers Signal over signal-sync Candidate on the same line", () => {
    const byLine = new Map();
    const line = "state/daily/links.jsonl#1";

    registerByLine(byLine, {
      recordKey: "signal-sync:daily:d1",
      sourceFile: "state/daily/links.jsonl",
      sourceLine: 1,
      humanStatus: "confirmed",
      finalPool: "knowledge_gap",
      status: "confirmed",
      readingPackStatus: null
    }, "candidate");

    registerByLine(byLine, {
      recordKey: "daily:d1",
      sourceFile: "state/daily/links.jsonl",
      sourceLine: 1,
      humanStatus: "confirmed",
      finalPool: "demo_replication",
      status: "confirmed",
      readingPackStatus: "selected"
    }, "signal");

    expect(byLine.get(line)?.recordKey).toBe("daily:d1");
    expect(byLine.get(line)?.readingPackStatus).toBe("selected");
  });
});

describe("resolveDbRecord", () => {
  it("uses triaged Signal by external id for pool export", () => {
    const signalRecord = {
      recordKey: "daily:2026-07-02-29",
      sourceFile: "state/daily/2026-07-02-links.jsonl",
      sourceLine: 29,
      humanStatus: "changed",
      finalPool: "paper_candidate",
      status: "confirmed",
      readingPackStatus: "selected"
    };

    const lookups = emptyLookups({
      byLine: new Map([
        [
          "pools/paper-candidates.jsonl#1",
          {
            recordKey: "paper-candidates:2026-07-02-29",
            sourceFile: "pools/paper-candidates.jsonl",
            sourceLine: 1,
            humanStatus: "pending",
            finalPool: "paper_candidate",
            status: null,
            readingPackStatus: "candidate"
          }
        ]
      ]),
      byExternalId: new Map([["2026-07-02-29", signalRecord]])
    });

    const resolved = resolveDbRecord(
      { line: 1, value: { id: "2026-07-02-29", human_status: "pending" } },
      "pools/paper-candidates.jsonl",
      "paper-candidates",
      lookups,
      "pool"
    );

    expect(resolved?.recordKey).toBe("daily:2026-07-02-29");
    expect(resolved?.humanStatus).toBe("changed");
  });
});

describe("exportJsonlFiles", () => {
  const mockRecords = emptyLookups({
    byLine: new Map([
      [
        "state/daily/2026-07-02-links.jsonl#1",
        {
          recordKey: "daily:d1",
          sourceFile: "state/daily/2026-07-02-links.jsonl",
          sourceLine: 1,
          humanStatus: "confirmed",
          finalPool: "demo_replication",
          status: "confirmed",
          readingPackStatus: "selected"
        }
      ]
    ])
  });

  it("dry-run reports line changes without writing", async () => {
    const content =
      '{"id":"d1","human_status":"pending","final_pool":"knowledge_gap"}\n' +
      '{"id":"d2","human_status":"pending"}\n';
    let written: string | null = null;

    const summary = await exportJsonlFiles(
      [{ path: "state/daily/2026-07-02-links.jsonl", scope: "daily" }],
      {
        readFile: async () => content,
        writeFile: async (_p, c) => {
          written = c;
        },
        loadRecords: async () => mockRecords
      },
      { dryRun: true }
    );

    expect(summary.linesChanged).toBe(1);
    expect(summary.files[0]?.changes[0]?.line).toBe(1);
    expect(written).toBeNull();
  });

  it("writes merged content when dryRun is false", async () => {
    const content = '{"id":"d1","human_status":"pending"}\n';
    let written: string | null = null;

    const summary = await exportJsonlFiles(
      [{ path: "state/daily/2026-07-02-links.jsonl", scope: "daily" }],
      {
        readFile: async () => content,
        writeFile: async (_p, c) => {
          written = c;
        },
        loadRecords: async () => mockRecords
      },
      { dryRun: false }
    );

    expect(summary.linesChanged).toBe(1);
    expect(written).toContain('"human_status":"confirmed"');
    expect(written).toContain('"reading_pack_status":"selected"');
  });

  it("does not strip reading_pack_status when signal-sync shadow exists", async () => {
    const lookups = emptyLookups({
      byLine: new Map([
        [
          "state/daily/2026-07-02-links.jsonl#1",
          {
            recordKey: "daily:d1",
            sourceFile: "state/daily/2026-07-02-links.jsonl",
            sourceLine: 1,
            humanStatus: "confirmed",
            finalPool: "demo_replication",
            status: "confirmed",
            readingPackStatus: "selected"
          }
        ]
      ])
    });

    const content =
      '{"id":"d1","human_status":"pending","reading_pack_status":"selected"}\n';
    let written: string | null = null;

    await exportJsonlFiles(
      [{ path: "state/daily/2026-07-02-links.jsonl", scope: "daily" }],
      {
        readFile: async () => content,
        writeFile: async (_p, c) => {
          written = c;
        },
        loadRecords: async () => lookups
      },
      { dryRun: false }
    );

    expect(written).toContain('"reading_pack_status":"selected"');
  });
});

describe("patchFocusPolicyMarkdown", () => {
  it("updates yaml block when focus_id matches", () => {
    const original = `# Doc

### Rule A

\`\`\`yaml
focus_id: focus-a
name: Old Name
description: old desc
status: active
priority_boost: low
source_types:
  - github_repo
content_tags:
  - demo
candidate_pool_boost:
  - demo_replication
applies_to:
  - daily_radar
start_date: 2026-07-01
\`\`\`

## 4.1 Notes
`;

    const updatedRule = {
      focus_id: "focus-a",
      name: "New Name",
      description: "new desc",
      status: "paused",
      priority_boost: "high",
      source_types: ["github_repo"],
      content_tags: ["demo"],
      candidate_pool_boost: ["demo_replication"],
      applies_to: ["daily_radar"],
      start_date: "2026-07-01"
    };

    const result = patchFocusPolicyMarkdown(
      original,
      new Map([["focus-a", updatedRule]])
    );

    expect(result.updated).toBe(1);
    expect(result.markdown).toContain("name: New Name");
    expect(result.markdown).toContain("status: paused");
    expect(result.markdown).not.toContain("name: Old Name");
  });

  it("preserves created_at and updated_at from the existing block", () => {
    const original = `\`\`\`yaml
focus_id: focus-a
name: Rule
description: desc
status: active
priority_boost: low
source_types:
  - github_repo
content_tags:
  - demo
candidate_pool_boost:
  - demo_replication
applies_to:
  - daily_radar
start_date: 2026-07-01
created_at: 2026-07-01
updated_at: 2026-07-02
\`\`\``;

    const result = patchFocusPolicyMarkdown(
      original,
      new Map([
        [
          "focus-a",
          {
            focus_id: "focus-a",
            name: "Rule",
            description: "desc",
            status: "paused",
            priority_boost: "low",
            source_types: ["github_repo"],
            content_tags: ["demo"],
            candidate_pool_boost: ["demo_replication"],
            applies_to: ["daily_radar"],
            start_date: "2026-07-01"
          }
        ]
      ])
    );

    expect(result.markdown).toContain("created_at: 2026-07-01");
    expect(result.markdown).toContain("updated_at: 2026-07-02");
    expect(result.markdown).toContain("status: paused");
  });
});

describe("dbHumanFieldsToJson", () => {
  it("maps camelCase DB fields to snake_case JSONL keys", () => {
    expect(
      dbHumanFieldsToJson({
        humanStatus: "changed",
        finalPool: "demo_replication",
        status: "watching",
        readingPackStatus: "selected"
      })
    ).toEqual({
      human_status: "changed",
      final_pool: "demo_replication",
      status: "watching",
      reading_pack_status: "selected"
    });
  });
});
