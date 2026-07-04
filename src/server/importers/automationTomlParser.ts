import { parse } from "smol-toml";

export type ParsedAutomationConfig = {
  id: string;
  name: string;
  kind: string;
  status: string;
  model?: string;
  rrule?: string;
  prompt: string;
  cwds?: string[];
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}

export function parseAutomationToml(content: string): ParsedAutomationConfig {
  const raw = parse(content) as Record<string, unknown>;

  const id = asString(raw.id);
  const name = asString(raw.name);
  const kind = asString(raw.kind);
  const status = asString(raw.status);
  const prompt = asString(raw.prompt);

  if (!id || !name || !kind || !status || !prompt) {
    throw new Error("automation toml missing required fields (id, name, kind, status, prompt)");
  }

  return {
    id,
    name,
    kind,
    status,
    prompt,
    model: asString(raw.model),
    rrule: asString(raw.rrule),
    cwds: asStringArray(raw.cwds)
  };
}

export function extractPromptFromToml(content: string): string {
  return parseAutomationToml(content).prompt.trim();
}
