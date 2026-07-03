import { describe, expect, it } from "vitest";
import {
  dbHumanFieldsToJson,
  mergeHumanFieldsIntoObject
} from "@/server/exporters/humanFields";
import { exportJsonlFiles } from "@/server/exporters/jsonlExporter";
import { patchFocusPolicyMarkdown } from "@/server/exporters/focusPolicyExporter";

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

describe("exportJsonlFiles", () => {
  const mockRecords = {
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
    ]),
    byRecordKey: new Map<string, never>()
  };

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
