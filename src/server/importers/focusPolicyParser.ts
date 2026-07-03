/** Minimal YAML block parser for focus-policy.md rule blocks. */

export type ParsedFocusRule = {
  focus_id: string;
  name: string;
  description: string;
  status: string;
  priority_boost: string;
  source_types: string[];
  content_tags: string[];
  candidate_pool_boost: string[];
  applies_to: string[];
  start_date: string;
  end_date?: string;
  review_cadence?: string;
  notes?: string;
};

const FOLDED_SCALAR_KEYS = new Set(["description", "notes"]);

function parseScalarValue(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

function parseListBlock(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
  const items: string[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("  - ") && !line.startsWith("- ")) break;
    items.push(parseScalarValue(line.replace(/^\s*-\s*/, "")));
    i += 1;
  }
  return { items, nextIndex: i };
}

function collectFoldedScalar(lines: string[], startIndex: number, firstLine: string): {
  value: string;
  nextIndex: number;
} {
  const parts = firstLine ? [firstLine.trim()] : [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[a-z_]+:\s/.test(line) && !line.startsWith("  ")) break;
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("  ")) {
      parts.push(line.trim());
      i += 1;
      continue;
    }
    break;
  }
  return { value: parts.join(" "), nextIndex: i };
}

export function parseFocusRuleYaml(yaml: string): ParsedFocusRule | null {
  const lines = yaml.split("\n");
  const result: Record<string, string | string[]> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("  - ") || line.startsWith("- ")) {
      i += 1;
      continue;
    }

    const keyMatch = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!keyMatch) {
      i += 1;
      continue;
    }

    const key = keyMatch[1];
    const inlineValue = keyMatch[2];

    if (FOLDED_SCALAR_KEYS.has(key)) {
      const folded = collectFoldedScalar(lines, i + 1, inlineValue);
      result[key] = folded.value;
      i = folded.nextIndex;
      continue;
    }

    if (inlineValue === "" || inlineValue === "|") {
      const { items, nextIndex } = parseListBlock(lines, i + 1);
      if (items.length > 0) {
        result[key] = items;
        i = nextIndex;
        continue;
      }
    }

    if (inlineValue !== "") {
      const folded = collectFoldedScalar(lines, i + 1, inlineValue);
      result[key] = folded.value;
      i = folded.nextIndex;
      continue;
    }

    i += 1;
  }

  const focusId = result.focus_id;
  const name = result.name;
  const description = result.description;
  const status = result.status;
  const priorityBoost = result.priority_boost;
  const startDate = result.start_date;

  if (
    typeof focusId !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof status !== "string" ||
    typeof priorityBoost !== "string" ||
    typeof startDate !== "string"
  ) {
    return null;
  }

  return {
    focus_id: focusId,
    name,
    description,
    status,
    priority_boost: priorityBoost,
    source_types: Array.isArray(result.source_types) ? result.source_types : [],
    content_tags: Array.isArray(result.content_tags) ? result.content_tags : [],
    candidate_pool_boost: Array.isArray(result.candidate_pool_boost) ? result.candidate_pool_boost : [],
    applies_to: Array.isArray(result.applies_to) ? result.applies_to : [],
    start_date: startDate,
    end_date: typeof result.end_date === "string" ? result.end_date : undefined,
    review_cadence: typeof result.review_cadence === "string" ? result.review_cadence : undefined,
    notes: typeof result.notes === "string" ? result.notes : undefined
  };
}

export function extractFocusRulesFromMarkdown(markdown: string): ParsedFocusRule[] {
  const rules: ParsedFocusRule[] = [];
  const blocks = markdown.match(/```yaml\n([\s\S]*?)```/g) ?? [];

  for (const block of blocks) {
    const inner = block.replace(/^```yaml\n/, "").replace(/```$/, "");
    if (!inner.includes("focus_id:")) continue;
    const parsed = parseFocusRuleYaml(inner);
    if (parsed) rules.push(parsed);
  }

  return rules;
}

export function serializeFocusRuleToYaml(rule: ParsedFocusRule): string {
  const lines = [
    `focus_id: ${rule.focus_id}`,
    `name: ${rule.name}`,
    "description: >",
    ...rule.description.split(/\s+/).reduce<string[]>((acc, word) => {
      const last = acc[acc.length - 1];
      if (!last || last.length + word.length > 72) acc.push(word);
      else acc[acc.length - 1] = `${last} ${word}`;
      return acc;
    }, []).map((l) => `  ${l}`),
    `status: ${rule.status}`,
    `priority_boost: ${rule.priority_boost}`,
    "source_types:",
    ...rule.source_types.map((s) => `  - ${s}`),
    "content_tags:",
    ...rule.content_tags.map((s) => `  - ${s}`),
    "candidate_pool_boost:",
    ...rule.candidate_pool_boost.map((s) => `  - ${s}`),
    "applies_to:",
    ...rule.applies_to.map((s) => `  - ${s}`),
    `start_date: ${rule.start_date}`,
    ...(rule.end_date ? [`end_date: ${rule.end_date}`] : []),
    ...(rule.review_cadence ? [`review_cadence: ${rule.review_cadence}`] : []),
    ...(rule.notes ? [`notes: ${rule.notes}`] : [])
  ];
  return lines.join("\n");
}
