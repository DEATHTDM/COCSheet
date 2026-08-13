import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch3fDeprogrammerOccupationDefinitions } from "./occupations/batch3f-deprogrammer";
import { standardSkillDefinitions } from "./skills";

const registry = createOccupationRegistry(standardSettingPack, createSkillRegistry(standardSkillDefinitions));
const definition = registry.get("deprogrammer");

const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

describe("Phase 5B-2 Batch 3F Deprogrammer", () => {
  it("锁定 canonical identity、分类、现代 era、来源与八个职业技能 slots", () => {
    expect(batch3fDeprogrammerOccupationDefinitions).toHaveLength(1);
    expect(definition?.id).toBe("deprogrammer");
    expect(definition?.name).toEqual({ zh: "除魅师", en: "Deprogrammer" });
    expect(definition?.aliases).toEqual({ zh: ["除魅师（现代）"] });
    expect(definition?.variantOf).toBeUndefined();
    expect(definition?.category).toBe("religion-occult");
    expect(definition?.era).toEqual({ type: "specific", eraIds: ["modern"] });
    expect(definition?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`))
      .toEqual(["coc7-investigator-handbook-zh-1-21:77"]);
    expect(definition?.creditRating).toEqual({ min: 20, max: 50 });
    expect(definition?.pointFormula).toEqual({ type: "attribute", attribute: "EDU", multiplier: 4 });
    expect(definition?.skillRequirements.map((requirement) => [
      requirement.id,
      requirement.selector.type,
      requirement.cardinality,
    ])).toEqual([
      ["social-1", "one-of", { min: 1, max: 1 }],
      ["social-2", "one-of", { min: 1, max: 1 }],
      ["drive-auto", "exact", { min: 1, max: 1 }],
      ["brawl-or-firearms", "one-branch", { min: 1 }],
      ["history", "exact", { min: 1, max: 1 }],
      ["occult", "exact", { min: 1, max: 1 }],
      ["psychology", "exact", { min: 1, max: 1 }],
      ["stealth", "exact", { min: 1, max: 1 }],
    ]);
  });

  it("combat one-branch 固定 Brawl 或 generic Firearms 1+，拒绝混选与重复", () => {
    const combat = definition?.skillRequirements.find((requirement) =>
      requirement.id === "brawl-or-firearms");
    if (!combat || combat.selector.type !== "one-branch") throw new Error("缺少 combat one-branch");
    expect(combat.selector.branches).toEqual([
      {
        selector: { type: "exact", ref: predefined("fighting", "brawl") },
        cardinality: { min: 1, max: 1 },
      },
      {
        selector: { type: "specialization-of", definitionId: "firearms" },
        cardinality: { min: 1 },
      },
    ]);
    const brawl = predefined("fighting", "brawl");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");
    expect(validateOccupationRequirementSelection(combat, [brawl])).toEqual([]);
    expect(validateOccupationRequirementSelection(combat, [handgun])).toEqual([]);
    expect(validateOccupationRequirementSelection(combat, [handgun, rifle])).toEqual([]);
    expect(validateOccupationRequirementSelection(combat, [brawl, handgun]).map(({ code }) => code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(combat, [handgun, handgun]).map(({ code }) => code))
      .toContain("duplicate-skill-selection");
  });

  it("锁定 exact Hypnosis replacement policy、全部八个 eligible targets 与 Keeper approval", () => {
    expect(definition?.skillReplacement).toEqual({
      id: "keeper-approved-hypnosis",
      replacement: { type: "exact", ref: { type: "standard", definitionId: "hypnosis" } },
      targetRequirementIds: [
        "social-1",
        "social-2",
        "drive-auto",
        "brawl-or-firearms",
        "history",
        "occult",
        "psychology",
        "stealth",
      ],
      approval: "keeper-required",
    });
    expect(definition?.skillReplacement?.targetRequirementIds).not.toContain("credit-rating");
  });
});
