# Roadmap Phase 2 实现计划：数据模型 + JSONL 导入层

> **For agentic workers:** 使用 checkbox（`- [ ]`）逐步执行。本计划为 roadmap（`docs/cortexops-ai-system-roadmap.md`）**Phase 2「Data Model And Import Layer」**的实现，也是 nav-restructure（`docs/superpowers/plans/2026-07-03-navigation-restructure.md`）**Phase B 的前半**（数据地基）。本仓库此前无测试框架，本阶段引入 **Vitest** 并采用 TDD。

**Goal:** 让 Web App 能把当前文件系统状态（`state/daily/*-links.jsonl`、`state/memory/ai-pm-7d.jsonl`、`pools/*.jsonl`）以**容错、可审计、可重入**的方式导入 SQLite，并保留 `raw_json` 与来源文件/行号，为后续 UI 阶段提供数据。

**Architecture:** 分层遵循 roadmap 的 Flexibility Rules——UI/路由不直接读写文件；解析与映射为**纯函数**（易测、无副作用）；`runImport` 编排通过依赖注入（`readFile` + `SignalRepository`）以便用 fake 单测；Prisma 仅在 `src/server/*` 落地。导入入口先做 **CLI 脚本**（`npm run import`），并附一个薄 Route Handler 供 Phase B UI 触发。

**Tech Stack:** TypeScript、Prisma 5 + SQLite、Zod 3（已在依赖中）、Vitest（新增）、tsx（新增，运行 TS 脚本）。

**本阶段范围：** 数据模型（`ImportRun` + `ImportedSignal`）、Zod 校验、纯解析/映射、导入编排 + Prisma 落地、CLI + 薄 API、单测 + 一次真实数据集成验证。**不做**：Review/Pools 领域交互、Dashboard 读视图 UI（属 nav Phase B 后半 / Phase C）、in-app AI runner。

---

## 数据事实（决定 schema 的关键点）

- `state/daily/*-links.jsonl`：完整字段，含外部 `id`（如 `2026-07-02-01`）、`title`、`priority`、`suggested_pool`、`final_pool`、`human_status`、`reading_pack_status`、`duplicate_status`、`practice_fit`、摘要字段等。
- `pools/*.jsonl`：与 daily 基本同构，含 `id`、`final_pool`、`suggested_pool`、`human_status`。`personal-work.jsonl` **为空文件（0 行）**，`paper-candidates.jsonl` 仅 1 行——**必须容忍空文件**。
- `state/memory/ai-pm-7d.jsonl`：**字段子集，且无 `id`**（以 `canonical_key` 为标识），无 `final_pool`/`source_name`。
- 结论：schema 除 provenance 外**所有业务字段可空**；记录标识采用 `id → canonical_key → sourceFile#line` 回退；导入必须容忍空文件、坏行、缺字段，且可重入（按 `recordKey` upsert）。

---

## 受影响文件清单

### 根目录

| 文件 | 变更 |
|---|---|
| `package.json` | 新增 devDeps `vitest`、`vite-tsconfig-paths`、`tsx`；新增 scripts `test`、`test:watch`、`import`、`db:push` |
| `package-lock.json` | 随安装更新 |
| `vitest.config.ts` | **新增**：Vitest 配置 + tsconfig 路径别名 |
| `prisma/schema.prisma` | 新增 `ImportRun`、`ImportedSignal` model（保留 `Job`） |
| `.env` / `.env.example` | 不改（`DATABASE_URL="file:./dev.db"` 已足够） |

### `src/` 与 `scripts/`

| 文件 | 变更 |
|---|---|
| `src/shared/schemas/signal.ts` | **新增**：宽松 Zod `signalObjectSchema` |
| `src/server/importers/jsonlParser.ts` | **新增**：纯函数 `parseJsonlContent` |
| `src/server/importers/recordMapper.ts` | **新增**：纯函数 `mapToRecord` + `computeRecordKey` |
| `src/server/importers/runImport.ts` | **新增**：编排 + `SignalRepository` 接口 + 类型 |
| `src/server/db.ts` | **新增**：Prisma client 单例 |
| `src/server/importers/prismaSignalRepository.ts` | **新增**：Prisma 版仓储 |
| `scripts/import.ts` | **新增**：CLI 入口，解析文件列表并调用 `runImport` |
| `src/app/api/import/route.ts` | **新增**：薄 POST Route Handler（供 Phase B UI 触发） |
| `src/server/importers/__tests__/jsonlParser.test.ts` | **新增**：解析单测 |
| `src/server/importers/__tests__/recordMapper.test.ts` | **新增**：映射单测 |
| `src/server/importers/__tests__/runImport.test.ts` | **新增**：编排单测（fake fs + fake repo） |

### `docs/`

| 文件 | 变更 |
|---|---|
| `docs/cortexops-ai-system-roadmap.md` | 在 Phase 2 小节标注"已实现，见本计划"（可选，收尾时补） |

---

## Task 1: 引入 Vitest 工具链

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/server/importers/__tests__/smoke.test.ts`（验证后删除）

- [ ] **Step 1: 安装开发依赖**

Run:
```bash
npm install -D vitest vite-tsconfig-paths tsx
```
Expected: 三个包写入 `devDependencies`，`package-lock.json` 更新。

- [ ] **Step 2: 新增 scripts**

在 `package.json` 的 `scripts` 中加入：
```json
"test": "vitest run",
"test:watch": "vitest",
"import": "tsx scripts/import.ts",
"db:push": "prisma db push"
```

- [ ] **Step 3: Vitest 配置（解析 `@/` 别名）**

`vitest.config.ts`：
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"]
  }
});
```

- [ ] **Step 4: 冒烟测试**

`src/server/importers/__tests__/smoke.test.ts`：
```ts
import { describe, expect, it } from "vitest";

describe("vitest smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 运行并确认通过**

Run: `npm test`
Expected: 1 passed。随后删除冒烟文件：
```bash
git rm src/server/importers/__tests__/smoke.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest toolchain for data-import phase"
```

---

## Task 2: 扩展 Prisma schema（ImportRun + ImportedSignal）

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 追加 model（保留现有 `Job`）**

在 `prisma/schema.prisma` 末尾追加：
```prisma
model ImportRun {
  id           String           @id @default(cuid())
  startedAt    DateTime         @default(now())
  finishedAt   DateTime?
  status       String           @default("running") // running | success | partial | failed
  filesScanned Int              @default(0)
  linesTotal   Int              @default(0)
  imported     Int              @default(0)
  skipped      Int              @default(0)
  errors       Int              @default(0)
  notes        String?
  signals      ImportedSignal[]
}

model ImportedSignal {
  id                String    @id @default(cuid())
  recordKey         String    @unique
  stream            String // daily | memory | pool
  poolName          String? // pool 文件来源标识（文件名，仅 provenance）
  externalId        String?
  canonicalKey      String?
  date              String?
  title             String?
  sourceName        String?
  sourceUrl         String?
  originalUrl       String?
  priority          String?
  suggestedPool     String?
  finalPool         String?
  humanStatus       String?
  readingPackStatus String?
  duplicateStatus   String?
  practiceFit       String?
  category          String?
  publishedAt       String?
  reason            String?
  aihotSummary      String?
  codexSummary      String?
  rawJson           String // 原始行 JSON 文本，完整保留
  sourceFile        String
  sourceLine        Int
  importRunId       String
  importRun         ImportRun @relation(fields: [importRunId], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([stream])
  @@index([poolName])
  @@index([canonicalKey])
}
```

- [ ] **Step 2: 同步数据库并生成 client**

Run: `npm run db:push`
Expected: `dev.db` 新增 `ImportRun`、`ImportedSignal` 表；Prisma Client 重新生成。

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add ImportRun and ImportedSignal models"
```

---

## Task 3: 宽松 Zod signal schema

**Files:**
- Create: `src/shared/schemas/signal.ts`
- Create: `src/server/importers/__tests__/recordMapper.test.ts`（本 Task 只放 schema 断言部分，映射在 Task 5 扩展）

- [ ] **Step 1: 写 schema**

`src/shared/schemas/signal.ts`：
```ts
import { z } from "zod";

// 宽松：所有业务字段可空，未知字段透传（原始行另存 rawJson）。
export const signalObjectSchema = z
  .object({
    id: z.string().optional(),
    canonical_key: z.string().optional(),
    date: z.string().optional(),
    title: z.string().optional(),
    source_name: z.string().optional(),
    source_url: z.string().optional(),
    original_url: z.string().optional(),
    priority: z.string().optional(),
    suggested_pool: z.string().optional(),
    final_pool: z.string().optional(),
    human_status: z.string().optional(),
    reading_pack_status: z.string().optional(),
    duplicate_status: z.string().optional(),
    practice_fit: z.string().optional(),
    category: z.string().optional(),
    published_at: z.string().optional(),
    reason: z.string().optional(),
    aihot_summary: z.string().optional(),
    codex_summary: z.string().optional()
  })
  .passthrough();

export type SignalObject = z.infer<typeof signalObjectSchema>;
```

- [ ] **Step 2: 最小断言测试**

`src/server/importers/__tests__/recordMapper.test.ts`（先建文件，仅放 schema 测试；Task 5 追加映射测试）：
```ts
import { describe, expect, it } from "vitest";
import { signalObjectSchema } from "@/shared/schemas/signal";

describe("signalObjectSchema", () => {
  it("accepts a full daily record", () => {
    const r = signalObjectSchema.safeParse({ id: "2026-07-02-01", title: "x", priority: "P0" });
    expect(r.success).toBe(true);
  });

  it("accepts a memory record without id", () => {
    const r = signalObjectSchema.safeParse({ canonical_key: "k", title: "y" });
    expect(r.success).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(signalObjectSchema.safeParse(42).success).toBe(false);
  });
});
```

- [ ] **Step 3: 运行**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/shared/schemas/signal.ts src/server/importers/__tests__/recordMapper.test.ts
git commit -m "feat(schema): add lenient zod signal schema"
```

---

## Task 4: 纯函数 JSONL 解析器（容错）

**Files:**
- Create: `src/server/importers/jsonlParser.ts`
- Create: `src/server/importers/__tests__/jsonlParser.test.ts`

- [ ] **Step 1: 先写失败测试**

`src/server/importers/__tests__/jsonlParser.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { parseJsonlContent } from "@/server/importers/jsonlParser";

describe("parseJsonlContent", () => {
  it("returns nothing for empty content", () => {
    const r = parseJsonlContent("");
    expect(r.parsed).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });

  it("parses normal lines and skips blank lines", () => {
    const content = '{"id":"a"}\n\n{"id":"b"}\n';
    const r = parseJsonlContent(content);
    expect(r.parsed.map((p) => p.value.id)).toEqual(["a", "b"]);
    expect(r.errors).toHaveLength(0);
  });

  it("collects a bad line as error without aborting others", () => {
    const content = '{"id":"a"}\n{bad json}\n{"id":"c"}\n';
    const r = parseJsonlContent(content);
    expect(r.parsed.map((p) => p.value.id)).toEqual(["a", "c"]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
  });

  it("keeps the raw line text for each parsed record", () => {
    const r = parseJsonlContent('{"id":"a","title":"t"}\n');
    expect(r.parsed[0].raw).toBe('{"id":"a","title":"t"}');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- jsonlParser`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/server/importers/jsonlParser.ts`：
```ts
import { signalObjectSchema, type SignalObject } from "@/shared/schemas/signal";

export type ParsedLine = { line: number; raw: string; value: SignalObject };
export type ParseError = { line: number; raw: string; message: string };
export type ParseResult = { parsed: ParsedLine[]; errors: ParseError[] };

export function parseJsonlContent(content: string): ParseResult {
  const parsed: ParsedLine[] = [];
  const errors: ParseError[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const raw = rawLine.trim();
    if (raw === "") return; // 空行静默跳过

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      errors.push({ line, raw, message: e instanceof Error ? e.message : "invalid JSON" });
      return;
    }

    const result = signalObjectSchema.safeParse(json);
    if (!result.success) {
      errors.push({ line, raw, message: result.error.message });
      return;
    }

    parsed.push({ line, raw, value: result.data });
  });

  return { parsed, errors };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- jsonlParser`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/importers/jsonlParser.ts src/server/importers/__tests__/jsonlParser.test.ts
git commit -m "feat(import): add tolerant jsonl parser"
```

---

## Task 5: 记录映射 + recordKey

**Files:**
- Create: `src/server/importers/recordMapper.ts`
- Modify: `src/server/importers/__tests__/recordMapper.test.ts`（追加映射测试）

- [ ] **Step 1: 追加失败测试**

在 `recordMapper.test.ts` 顶部加入 import，并追加用例：
```ts
import { mapToRecord, computeRecordKey } from "@/server/importers/recordMapper";
import type { ParsedLine } from "@/server/importers/jsonlParser";

const line = (value: Record<string, unknown>, raw?: string): ParsedLine => ({
  line: 1,
  raw: raw ?? JSON.stringify(value),
  value
});

describe("mapToRecord", () => {
  it("maps snake_case fields and preserves rawJson", () => {
    const rec = mapToRecord(line({ id: "2026-07-02-01", final_pool: "knowledge_gap", title: "t" }), {
      stream: "daily",
      sourceFile: "state/daily/2026-07-02-links.jsonl"
    });
    expect(rec.externalId).toBe("2026-07-02-01");
    expect(rec.finalPool).toBe("knowledge_gap");
    expect(rec.stream).toBe("daily");
    expect(rec.rawJson).toContain('"title":"t"');
  });

  it("uses canonical_key when id is absent (memory stream)", () => {
    const rec = mapToRecord(line({ canonical_key: "enterprise_ai_cost_control" }), {
      stream: "memory",
      sourceFile: "state/memory/ai-pm-7d.jsonl"
    });
    expect(rec.externalId).toBeNull();
    expect(rec.recordKey).toBe("memory:-:enterprise_ai_cost_control");
  });

  it("sets poolName from context for pool stream", () => {
    const rec = mapToRecord(line({ id: "2026-07-02-11" }), {
      stream: "pool",
      poolName: "product-inspiration",
      sourceFile: "pools/product-inspiration.jsonl"
    });
    expect(rec.poolName).toBe("product-inspiration");
    expect(rec.recordKey).toBe("pool:product-inspiration:2026-07-02-11");
  });
});

describe("computeRecordKey", () => {
  it("falls back to sourceFile#line when no id or canonical_key", () => {
    expect(computeRecordKey({ stream: "daily", externalId: null, canonicalKey: null, sourceFile: "f", sourceLine: 3 })).toBe("daily:-:f#3");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- recordMapper`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/server/importers/recordMapper.ts`：
```ts
import type { ParsedLine } from "@/server/importers/jsonlParser";

export type MapContext = { stream: string; poolName?: string; sourceFile: string };

export type ImportedSignalInput = {
  recordKey: string;
  stream: string;
  poolName: string | null;
  externalId: string | null;
  canonicalKey: string | null;
  date: string | null;
  title: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  originalUrl: string | null;
  priority: string | null;
  suggestedPool: string | null;
  finalPool: string | null;
  humanStatus: string | null;
  readingPackStatus: string | null;
  duplicateStatus: string | null;
  practiceFit: string | null;
  category: string | null;
  publishedAt: string | null;
  reason: string | null;
  aihotSummary: string | null;
  codexSummary: string | null;
  rawJson: string;
  sourceFile: string;
  sourceLine: number;
};

export function computeRecordKey(args: {
  stream: string;
  poolName?: string | null;
  externalId: string | null;
  canonicalKey: string | null;
  sourceFile: string;
  sourceLine: number;
}): string {
  const pool = args.poolName ?? "-";
  const id = args.externalId ?? args.canonicalKey ?? `${args.sourceFile}#${args.sourceLine}`;
  return `${args.stream}:${pool}:${id}`;
}

const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function mapToRecord(parsed: ParsedLine, ctx: MapContext): ImportedSignalInput {
  const v = parsed.value;
  const externalId = s(v.id);
  const canonicalKey = s(v.canonical_key);
  return {
    recordKey: computeRecordKey({
      stream: ctx.stream,
      poolName: ctx.poolName ?? null,
      externalId,
      canonicalKey,
      sourceFile: ctx.sourceFile,
      sourceLine: parsed.line
    }),
    stream: ctx.stream,
    poolName: ctx.poolName ?? null,
    externalId,
    canonicalKey,
    date: s(v.date),
    title: s(v.title),
    sourceName: s(v.source_name),
    sourceUrl: s(v.source_url),
    originalUrl: s(v.original_url),
    priority: s(v.priority),
    suggestedPool: s(v.suggested_pool),
    finalPool: s(v.final_pool),
    humanStatus: s(v.human_status),
    readingPackStatus: s(v.reading_pack_status),
    duplicateStatus: s(v.duplicate_status),
    practiceFit: s(v.practice_fit),
    category: s(v.category),
    publishedAt: s(v.published_at),
    reason: s(v.reason),
    aihotSummary: s(v.aihot_summary),
    codexSummary: s(v.codex_summary),
    rawJson: parsed.raw,
    sourceFile: ctx.sourceFile,
    sourceLine: parsed.line
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- recordMapper`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/importers/recordMapper.ts src/server/importers/__tests__/recordMapper.test.ts
git commit -m "feat(import): add record mapper and recordKey"
```

---

## Task 6: 导入编排 runImport（依赖注入，可测）

**Files:**
- Create: `src/server/importers/runImport.ts`
- Create: `src/server/importers/__tests__/runImport.test.ts`

- [ ] **Step 1: 先写失败测试（fake fs + fake repo）**

`src/server/importers/__tests__/runImport.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { runImport, type ImportDeps, type ImportSource, type SignalRepository } from "@/server/importers/runImport";
import type { ImportedSignalInput } from "@/server/importers/recordMapper";

function makeRepo() {
  const upserts: ImportedSignalInput[] = [];
  const finished: Array<Record<string, unknown>> = [];
  const repo: SignalRepository = {
    async createImportRun() {
      return { id: "run1" };
    },
    async upsertByRecordKey(input) {
      upserts.push(input);
    },
    async finishImportRun(id, counts) {
      finished.push({ id, ...counts });
    }
  };
  return { repo, upserts, finished };
}

describe("runImport", () => {
  it("imports good lines, tolerates empty files and bad lines, records a run", async () => {
    const files: Record<string, string> = {
      "state/daily/2026-07-02-links.jsonl": '{"id":"d1"}\n{bad}\n{"id":"d2"}\n',
      "pools/personal-work.jsonl": "", // 空文件
      "pools/product-inspiration.jsonl": '{"id":"p1"}\n'
    };
    const deps: ImportDeps = {
      readFile: async (p) => {
        if (!(p in files)) throw new Error("missing " + p);
        return files[p];
      },
      repo: makeRepo().repo
    };
    const { repo, upserts, finished } = makeRepo();
    const sources: ImportSource[] = [
      { stream: "daily", files: [{ path: "state/daily/2026-07-02-links.jsonl" }] },
      { stream: "pool", files: [
        { path: "pools/personal-work.jsonl", poolName: "personal-work" },
        { path: "pools/product-inspiration.jsonl", poolName: "product-inspiration" }
      ] }
    ];

    const summary = await runImport({ ...deps, repo }, sources);

    expect(upserts.map((u) => u.externalId)).toEqual(["d1", "d2", "p1"]);
    expect(summary.imported).toBe(3);
    expect(summary.errors).toBe(1);
    expect(summary.filesScanned).toBe(3);
    expect(summary.status).toBe("partial");
    expect(finished).toHaveLength(1);
  });

  it("counts a missing file as an error and continues", async () => {
    const { repo, upserts } = makeRepo();
    const deps: ImportDeps = {
      readFile: async (p) => {
        if (p === "ok.jsonl") return '{"id":"x"}\n';
        throw new Error("missing");
      },
      repo
    };
    const summary = await runImport(deps, [
      { stream: "daily", files: [{ path: "missing.jsonl" }, { path: "ok.jsonl" }] }
    ]);
    expect(upserts.map((u) => u.externalId)).toEqual(["x"]);
    expect(summary.errors).toBe(1);
    expect(summary.imported).toBe(1);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- runImport`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/server/importers/runImport.ts`：
```ts
import { parseJsonlContent } from "@/server/importers/jsonlParser";
import { mapToRecord, type ImportedSignalInput } from "@/server/importers/recordMapper";

export type ImportRunCounts = {
  filesScanned: number;
  linesTotal: number;
  imported: number;
  skipped: number;
  errors: number;
  status: "success" | "partial" | "failed";
};

export type SignalRepository = {
  createImportRun(): Promise<{ id: string }>;
  upsertByRecordKey(input: ImportedSignalInput & { importRunId: string }): Promise<void>;
  finishImportRun(id: string, counts: ImportRunCounts): Promise<void>;
};

export type ImportDeps = {
  readFile: (path: string) => Promise<string>;
  repo: SignalRepository;
};

export type ImportSource = {
  stream: string;
  files: { path: string; poolName?: string }[];
};

export type ImportSummary = ImportRunCounts & { importRunId: string };

export async function runImport(deps: ImportDeps, sources: ImportSource[]): Promise<ImportSummary> {
  const { id: importRunId } = await deps.repo.createImportRun();

  let filesScanned = 0;
  let linesTotal = 0;
  let imported = 0;
  let errors = 0;

  for (const source of sources) {
    for (const file of source.files) {
      filesScanned += 1;
      let content: string;
      try {
        content = await deps.readFile(file.path);
      } catch {
        errors += 1; // 缺失/不可读文件计为错误，但不中断
        continue;
      }

      const { parsed, errors: parseErrors } = parseJsonlContent(content);
      linesTotal += parsed.length + parseErrors.length;
      errors += parseErrors.length;

      for (const line of parsed) {
        const record = mapToRecord(line, {
          stream: source.stream,
          poolName: file.poolName,
          sourceFile: file.path
        });
        await deps.repo.upsertByRecordKey({ ...record, importRunId });
        imported += 1;
      }
    }
  }

  const status: ImportRunCounts["status"] = errors > 0 ? "partial" : "success";
  const counts: ImportRunCounts = { filesScanned, linesTotal, imported, skipped: 0, errors, status };
  await deps.repo.finishImportRun(importRunId, counts);

  return { importRunId, ...counts };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- runImport`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/importers/runImport.ts src/server/importers/__tests__/runImport.test.ts
git commit -m "feat(import): add runImport orchestrator with DI"
```

---

## Task 7: Prisma client + 仓储实现

**Files:**
- Create: `src/server/db.ts`
- Create: `src/server/importers/prismaSignalRepository.ts`

- [ ] **Step 1: Prisma client 单例**

`src/server/db.ts`：
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Prisma 仓储**

`src/server/importers/prismaSignalRepository.ts`：
```ts
import { prisma } from "@/server/db";
import type { ImportRunCounts, SignalRepository } from "@/server/importers/runImport";
import type { ImportedSignalInput } from "@/server/importers/recordMapper";

export const prismaSignalRepository: SignalRepository = {
  async createImportRun() {
    const run = await prisma.importRun.create({ data: {} });
    return { id: run.id };
  },

  async upsertByRecordKey(input: ImportedSignalInput & { importRunId: string }) {
    const { recordKey, ...rest } = input;
    await prisma.importedSignal.upsert({
      where: { recordKey },
      create: { recordKey, ...rest },
      update: { ...rest }
    });
  },

  async finishImportRun(id: string, counts: ImportRunCounts) {
    await prisma.importRun.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        status: counts.status,
        filesScanned: counts.filesScanned,
        linesTotal: counts.linesTotal,
        imported: counts.imported,
        skipped: counts.skipped,
        errors: counts.errors
      }
    });
  }
};
```

- [ ] **Step 3: 类型校验**

Run: `npx tsc --noEmit`
Expected: PASS（确认 Prisma 生成类型与 upsert 字段匹配）。

- [ ] **Step 4: Commit**

```bash
git add src/server/db.ts src/server/importers/prismaSignalRepository.ts
git commit -m "feat(db): add prisma client and signal repository"
```

---

## Task 8: CLI 导入脚本 + 真实数据集成验证

**Files:**
- Create: `scripts/import.ts`

- [ ] **Step 1: 写脚本（解析优先导入的文件列表）**

`scripts/import.ts`：
```ts
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { runImport, type ImportSource } from "@/server/importers/runImport";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { prisma } from "@/server/db";

async function listBySuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(suffix)).map((f) => path.join(dir, f)).sort();
  } catch {
    return [];
  }
}

async function buildSources(): Promise<ImportSource[]> {
  const dailyFiles = await listBySuffix("state/daily", "-links.jsonl");
  const poolFiles = await listBySuffix("pools", ".jsonl");

  return [
    { stream: "daily", files: dailyFiles.map((p) => ({ path: p })) },
    { stream: "memory", files: [{ path: "state/memory/ai-pm-7d.jsonl" }] },
    {
      stream: "pool",
      files: poolFiles.map((p) => ({ path: p, poolName: path.basename(p, ".jsonl") }))
    }
  ];
}

async function main() {
  const sources = await buildSources();
  const summary = await runImport(
    { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
    sources
  );
  console.log("import summary:", summary);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 2: 运行真实导入**

Run: `npm run import`
Expected: 打印 summary，`imported` ≈ 30(daily) + 30(memory 有效行) + 30(pools 合计) 的实际总数；`errors: 0`；`status: "success"`。空文件 `pools/personal-work.jsonl` 不报错。

- [ ] **Step 3: 校验数据库计数（集成证据）**

Run:
```bash
npx prisma db execute --stdin <<'SQL'
SELECT stream, COUNT(*) FROM ImportedSignal GROUP BY stream;
SQL
```
或用一次性脚本：
```bash
npx tsx -e "import('@/server/db').then(async ({prisma})=>{console.log(await prisma.importedSignal.groupBy({by:['stream'],_count:true}));console.log('runs',await prisma.importRun.count());await prisma.\$disconnect();})"
```
Expected: 三个 stream 均有记录；`ImportRun` 至少 1 条。

- [ ] **Step 4: 重入验证（幂等）**

Run: `npm run import`（再跑一次）
Then: 再次统计 `ImportedSignal` 总数。
Expected: 总数**不翻倍**（按 `recordKey` upsert），仅新增一条 `ImportRun`。

- [ ] **Step 5: Commit**

```bash
git add scripts/import.ts
git commit -m "feat(import): add cli import script for state and pool jsonl"
```

---

## Task 9: 薄 Route Handler（供 Phase B UI 触发）

**Files:**
- Create: `src/app/api/import/route.ts`

- [ ] **Step 1: 实现 POST**

`src/app/api/import/route.ts`：
```ts
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { runImport, type ImportSource } from "@/server/importers/runImport";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";

async function listBySuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(suffix)).map((f) => path.join(dir, f)).sort();
  } catch {
    return [];
  }
}

export async function POST() {
  const dailyFiles = await listBySuffix("state/daily", "-links.jsonl");
  const poolFiles = await listBySuffix("pools", ".jsonl");
  const sources: ImportSource[] = [
    { stream: "daily", files: dailyFiles.map((p) => ({ path: p })) },
    { stream: "memory", files: [{ path: "state/memory/ai-pm-7d.jsonl" }] },
    { stream: "pool", files: poolFiles.map((p) => ({ path: p, poolName: path.basename(p, ".jsonl") })) }
  ];

  const summary = await runImport(
    { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
    sources
  );
  return NextResponse.json(summary);
}
```

- [ ] **Step 2: 构建校验（typedRoutes + API 路由）**

Run: `npm run build`
Expected: 路由表出现 `ƒ /api/import`（动态）。

- [ ] **Step 3: 运行时验证**

Run（另一个终端已 `npm run dev`）：`curl -X POST http://localhost:3000/api/import`
Expected: 返回 JSON summary（`imported`>0，`status`）。

- [ ] **Step 4: Commit**

```bash
git add src/app/api/import/route.ts
git commit -m "feat(api): add POST /api/import route handler"
```

---

## Task 10: 收尾——全量质量门 + 文档标注

**Files:**
- Modify: `docs/cortexops-ai-system-roadmap.md`（Phase 2 小节标注已实现）

- [ ] **Step 1: 全量校验**

Run: `npm test` ；然后 `npm run lint` ；然后 `npm run build`（build 会重新生成 typedRoutes 后再 `npx tsc --noEmit` 亦可）。
Expected: 测试全绿；lint 通过；build 通过。

> 注意顺序：`typedRoutes` 类型由 `next build`/`next dev` 生成，若单独 `npm run typecheck` 报路由类型错误，先跑一次 `npm run build` 再 typecheck。

- [ ] **Step 2: 标注 roadmap**

在 `docs/cortexops-ai-system-roadmap.md` 的 `### Phase 2` 末尾追加一行：
`> 已实现，见 docs/superpowers/plans/2026-07-03-roadmap-phase2-data-import.md。`

- [ ] **Step 3: Commit**

```bash
git add docs/cortexops-ai-system-roadmap.md
git commit -m "docs: mark roadmap phase 2 as implemented"
```

---

## 验收标准（对齐 roadmap Phase 2）

- 空 JSONL 文件（`pools/personal-work.jsonl`）不导致导入失败。
- 坏 JSONL 行不中断整体导入（计入 `errors`，其余照常导入）。
- 每条记录保留 `sourceFile` 与 `sourceLine`。
- 每条记录保留 `rawJson`（完整原始行），未来 schema 变更可恢复。
- 三个 stream（daily/memory/pool）均能导入；memory 无 `id` 时以 `canonical_key` 建键。
- 重复导入按 `recordKey` upsert，不产生重复行。
- 每次导入写入一条 `ImportRun`（含计数与状态）。
- 单测覆盖：空/正常/坏行/缺字段/缺文件；映射键回退；编排计数。

## 风险与缓解

- **Prisma 生成类型滞后**：改 schema 后必须 `npm run db:push`（会重新生成 client）再 typecheck。
- **typedRoutes 与 /api 路由**：新增 Route Handler 后以 `npm run build` 校验。
- **别名解析**：Vitest 通过 `vite-tsconfig-paths` 解析 `@/`；若测试报找不到模块，确认插件已装并在 `vitest.config.ts` 注册。
- **schema 过死板**（roadmap 风险）：业务字段全部可空 + `rawJson` 透传，避免绑定单一日报格式。
- **JSONL 与 DB 漂移**（roadmap 风险）：本阶段 DB 为导入结果快照；人工 review 状态的权威化在 Phase 3 处理，本阶段不写回文件。

## Self-Review 结论

- **Roadmap Phase 2 覆盖**：Deliverables（Prisma schema、SQLite、Zod、JSONL importer、import run 记录）与 Priority imports（daily/memory/pools）均有对应 Task；Acceptance（空文件/坏行/来源行号/raw_json）逐条对应验收标准与 Task 4/6/8 测试。
- **占位符扫描**：每个代码步骤含完整代码与可执行命令，无 TODO/TBD。
- **类型一致**：`SignalObject`（Task 3）→ `ParsedLine`（Task 4）→ `ImportedSignalInput`/`computeRecordKey`（Task 5）→ `SignalRepository`/`ImportDeps`/`ImportSource`/`ImportRunCounts`/`runImport`（Task 6）→ `prismaSignalRepository`（Task 7）→ `scripts/import.ts` 与 `route.ts`（Task 8/9）命名与签名前后一致；Prisma 字段名（camelCase）与 `ImportedSignalInput` 键一致，`upsert` 的 `create/update` 使用同一 `rest`。
