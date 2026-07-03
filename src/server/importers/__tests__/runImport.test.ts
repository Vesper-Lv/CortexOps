import { describe, expect, it } from "vitest";
import { runImport, type ImportDeps, type ImportSource, type SignalRepository } from "@/server/importers/runImport";
import type { CandidateInput, SignalInput } from "@/server/importers/recordMapper";

function makeRepo() {
  const signalUpserts: SignalInput[] = [];
  const candidateUpserts: CandidateInput[] = [];
  const finished: Array<Record<string, unknown>> = [];
  const repo: SignalRepository = {
    async createImportRun() {
      return { id: "run1" };
    },
    async upsertSignal(input) {
      signalUpserts.push(input);
    },
    async upsertCandidate(input) {
      candidateUpserts.push(input);
    },
    async finishImportRun(id, counts) {
      finished.push({ id, ...counts });
    }
  };
  return { repo, signalUpserts, candidateUpserts, finished };
}

describe("runImport", () => {
  it("routes by stream, tolerates empty files and bad lines, records a run", async () => {
    const files: Record<string, string> = {
      "state/daily/2026-07-02-links.jsonl": '{"id":"d1"}\n{bad}\n{"id":"d2"}\n',
      "pools/personal-work.jsonl": "", // 空文件
      "pools/product-inspiration.jsonl": '{"id":"p1"}\n'
    };
    const { repo, signalUpserts, candidateUpserts, finished } = makeRepo();
    const deps: ImportDeps = {
      readFile: async (p) => {
        if (!(p in files)) throw new Error("missing " + p);
        return files[p];
      },
      repo
    };
    const sources: ImportSource[] = [
      { stream: "daily", files: [{ path: "state/daily/2026-07-02-links.jsonl" }] },
      {
        stream: "pool",
        files: [
          { path: "pools/personal-work.jsonl", poolName: "personal-work" },
          { path: "pools/product-inspiration.jsonl", poolName: "product-inspiration" }
        ]
      }
    ];

    const summary = await runImport(deps, sources);

    expect(signalUpserts.map((u) => u.externalId)).toEqual(["d1", "d2"]);
    expect(candidateUpserts.map((u) => u.externalId)).toEqual(["p1"]);
    expect(summary.importedSignals).toBe(2);
    expect(summary.importedCandidates).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.filesScanned).toBe(3);
    expect(summary.status).toBe("partial");
    expect(finished).toHaveLength(1);
  });

  it("counts a missing file as an error and continues", async () => {
    const { repo, signalUpserts } = makeRepo();
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
    expect(signalUpserts.map((u) => u.externalId)).toEqual(["x"]);
    expect(summary.errors).toBe(1);
    expect(summary.importedSignals).toBe(1);
  });
});
