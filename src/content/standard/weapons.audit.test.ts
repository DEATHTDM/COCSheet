import { describe, expect, it } from "vitest";

import {
  weaponCategoryIds,
  weaponDefinitionSchema,
  type WeaponEraAvailability,
} from "../../coc7/types/weapon";
import { createSkillRegistry } from "../skillRegistry";
import { createWeaponRegistry } from "../weaponRegistry";
import { standardSkillDefinitions } from "./skills";
import { standardWeaponDefinitions } from "./weapons";
import weaponSourcesDocument from "../../../docs/STANDARD_WEAPON_SOURCES.md?raw";

interface InventoryRow {
  readonly sourceRow: string;
  readonly id: string;
  readonly name: string;
  readonly primary: string;
  readonly secondary: string;
  readonly category: string;
  readonly skillMapping: string;
  readonly era: string;
  readonly status: string;
  readonly note: string;
}

function parseInventory(): readonly InventoryRow[] {
  const start = weaponSourcesDocument.indexOf("<!-- STANDARD_WEAPON_INVENTORY_START -->");
  const end = weaponSourcesDocument.indexOf("<!-- STANDARD_WEAPON_INVENTORY_END -->");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return weaponSourcesDocument
    .slice(start, end)
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("| KR17-"))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      expect(cells).toHaveLength(10);
      if (cells.length !== 10) {
        throw new Error(`inventory row 栏位数量无效：${line}`);
      }
      const [
        sourceRow,
        id,
        name,
        primary,
        secondary,
        category,
        skillMapping,
        era,
        status,
        note,
      ] = cells as [string, string, string, string, string, string, string, string, string, string];
      return {
        sourceRow,
        id,
        name,
        primary,
        secondary,
        category,
        skillMapping,
        era,
        status,
        note,
      };
    });
}

function mapEra(value: string): WeaponEraAvailability {
  if (value === "A") return "available";
  if (value === "R") return "rare";
  if (value === "U") return "unavailable";
  throw new Error(`未知 inventory era：${value}`);
}

function formatSkillMapping(definition: (typeof standardWeaponDefinitions)[number]): string {
  const ref = definition.skillRef;
  return ref.type === "standard"
    ? `standard ${ref.definitionId}`
    : `predefined ${ref.definitionId}/${ref.specializationId}`;
}

function getPage(value: string): number {
  const match = /^p(\d+)\b/u.exec(value);
  if (!match) throw new Error(`inventory source page 格式无效：${value}`);
  return Number(match[1]);
}

function countBy(values: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [
      value,
      values.filter((candidate) => candidate === value).length,
    ]),
  );
}

describe("Standard weapon full catalog audit", () => {
  const inventory = parseInventory();
  const registry = createWeaponRegistry(
    standardWeaponDefinitions,
    createSkillRegistry(standardSkillDefinitions),
  );

  it("关闭全部 104 个 source rows 且 needs-review 为 0", () => {
    expect(inventory).toHaveLength(104);
    expect(inventory.filter((row) => row.status === "needs-review")).toEqual([]);
    expect(inventory.every((row) => row.status === "production")).toBe(true);
    expect(new Set(inventory.map((row) => row.sourceRow)).size).toBe(inventory.length);
  });

  it("source inventory 与 production definitions 双向一一映射", () => {
    const inventoryIds = inventory.map((row) => row.id);
    const definitionIds = standardWeaponDefinitions.map((definition) => definition.id);
    expect(new Set(inventoryIds).size).toBe(inventoryIds.length);
    expect(new Set(definitionIds).size).toBe(definitionIds.length);
    expect(definitionIds).toHaveLength(104);
    expect([...definitionIds].sort()).toEqual([...inventoryIds].sort());
  });

  it("每个 definition 通过 schema、WeaponRegistry 与 typed SkillRef 验证", () => {
    expect(registry.definitions).toHaveLength(104);
    for (const definition of standardWeaponDefinitions) {
      expect(weaponDefinitionSchema.parse(definition)).toEqual(definition);
      expect(registry.get(definition.id)).toEqual(definition);
      expect(["standard", "predefined"]).toContain(definition.skillRef.type);
    }
  });

  it("逐行锁定名称、category、skill、era 与双正式来源", () => {
    const byId = new Map(standardWeaponDefinitions.map((definition) => [
      definition.id,
      definition,
    ]));

    for (const row of inventory) {
      const definition = byId.get(row.id);
      expect(definition, row.id).toBeDefined();
      if (!definition) continue;

      expect(definition.name.zh, row.id).toBe(row.name);
      expect(definition.category, row.id).toBe(row.category);
      expect(formatSkillMapping(definition), row.id).toBe(row.skillMapping);
      const eraParts = row.era.split("/");
      if (eraParts.length !== 2 || !eraParts[0] || !eraParts[1]) {
        throw new Error(`inventory era 格式无效：${row.era}`);
      }
      expect(definition.availability, row.id).toEqual({
        classic1920s: mapEra(eraParts[0]),
        modern: mapEra(eraParts[1]),
      });
      expect(definition.sourceRefs, row.id).toHaveLength(2);
      expect(definition.sourceRefs.map((ref) => ref.sourceId), row.id).toEqual([
        "coc7-keeper-rulebook-40th-zh",
        "coc7-investigator-handbook-zh-1-21",
      ]);
      expect(definition.sourceRefs.map((ref) => ref.page), row.id).toEqual([
        getPage(row.primary),
        getPage(row.secondary),
      ]);
      expect(definition.sourceRefs.every((ref) => ref.note?.trim()), row.id).toBe(true);
      expect(row.note.trim(), row.id).not.toBe("");
    }
  });

  it("八个 closed categories 全量匹配 inventory 数量", () => {
    expect(new Set(inventory.map((row) => row.category))).toEqual(
      new Set(weaponCategoryIds),
    );
    expect(countBy(standardWeaponDefinitions.map((definition) => definition.category)))
      .toEqual(countBy(inventory.map((row) => row.category)));
    expect(countBy(inventory.map((row) => row.category))).toEqual({
      "assault-rifle": 9,
      "explosive-heavy-other": 16,
      handgun: 16,
      "machine-gun": 8,
      "melee-other": 28,
      rifle: 12,
      shotgun: 9,
      "submachine-gun": 6,
    });
  });
});
