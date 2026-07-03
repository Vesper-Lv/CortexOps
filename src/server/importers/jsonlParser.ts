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
