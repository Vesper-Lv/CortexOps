import { describe, expect, it } from "vitest";
import {
  POOL_OPTIONS,
  getPoolAliases,
  isValidPool,
  migratePoolName,
  normalizePoolName,
  poolNameFromOption,
  poolOptionFromName
} from "@/shared/poolOptions";

describe("poolOptions", () => {
  it("exposes the canonical active pools plus archive/drop", () => {
    expect(POOL_OPTIONS).toEqual(["product", "paper", "engineering", "archive", "drop"]);
  });

  it("normalizes legacy pool names into the active pools", () => {
    expect(normalizePoolName("product_inspiration")).toBe("product");
    expect(normalizePoolName("paper-candidates")).toBe("paper");
    expect(normalizePoolName("demo_replication")).toBe("engineering");
    expect(normalizePoolName("knowledge_gap")).toBe("engineering");
    expect(normalizePoolName("personal_work")).toBe("engineering");
    expect(normalizePoolName("archive")).toBe("archive");
    expect(normalizePoolName("drop")).toBe("drop");
  });

  it("keeps unknown pools null and migration conservative", () => {
    expect(normalizePoolName(null)).toBeNull();
    expect(normalizePoolName(undefined)).toBeNull();
    expect(normalizePoolName("")).toBeNull();
    expect(normalizePoolName("not_a_pool")).toBeNull();
    expect(migratePoolName("not_a_pool")).toBe("not_a_pool");
  });

  it("uses canonical names for helpers", () => {
    expect(poolOptionFromName("engineering-learning")).toBe("engineering");
    expect(poolNameFromOption("product")).toBe("product");
    expect(getPoolAliases("engineering")).toEqual(
      expect.arrayContaining(["engineering", "demo_replication", "knowledge_gap"])
    );
  });

  it("treats legacy names as invalid storage values", () => {
    expect(isValidPool("product")).toBe(true);
    expect(isValidPool("demo_replication")).toBe(false);
  });
});
