import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAutomationToml } from "@/server/importers/automationTomlParser";
import { AUTOMATION_REGISTRY } from "@/shared/automationRegistry";

describe("parseAutomationToml", () => {
  it("parses all automation TOML files in the registry", async () => {
    for (const entry of AUTOMATION_REGISTRY) {
      const content = await readFile(entry.tomlPath, "utf8");
      const parsed = parseAutomationToml(content);
      expect(parsed.id).toBeTruthy();
      expect(parsed.name).toBeTruthy();
      expect(parsed.prompt.length).toBeGreaterThan(20);
    }
  });

  it("throws when required fields are missing", () => {
    expect(() => parseAutomationToml('id = "x"\n')).toThrow(/missing required fields/);
  });

  it("maps ai-pm daily automation id", async () => {
    const content = await readFile("automations/ai-pm.toml", "utf8");
    expect(parseAutomationToml(content).id).toBe("ai-pm");
  });
});
