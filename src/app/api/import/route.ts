import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { runImport } from "@/server/importers/runImport";
import { buildDefaultSources } from "@/server/importers/importSources";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";

export async function POST() {
  try {
    const sources = await buildDefaultSources();
    const summary = await runImport(
      { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
      sources
    );
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "import failed" },
      { status: 500 }
    );
  }
}
