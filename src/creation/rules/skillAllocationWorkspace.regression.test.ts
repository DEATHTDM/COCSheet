import { describe, expect, it } from "vitest";

import {
  finalizeSkillAllocation,
  occupationSkillReplacementApprovalSubject,
} from "../../coc7/rules/occupationSkills";
import { getSkillRefKey } from "../../coc7/rules/skills";
import type { Character } from "../../coc7/types/character";
import type { EraId } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getStandardSkillCatalog } from "../../content/skillRegistry";
import type { OccupationSelection, SkillCreationState } from "../types/skillCreation";
import { listOccupationAllocationRefs } from "./skillAllocationPresentation";

const occupations = getOccupationRegistry("standard");
const skillDefinitions = getStandardSkillCatalog();
const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

function character(eraId: EraId): Character {
  return {
    version: 1,
    id: "00000000-0000-4000-8000-000000000101",
    name: "技能分配回归",
    settingId: "standard",
    eraId,
    characteristics: {
      STR: 60, CON: 60, SIZ: 60, DEX: 60,
      APP: 60, INT: 60, POW: 60, EDU: 60,
    },
  };
}

function occupation(id: string): OccupationSelection {
  const definition = occupations.get(id);
  if (!definition) throw new Error(`缺少 production occupation：${id}`);
  return {
    kind: "catalog",
    selectedOccupationId: definition.id,
    definitionSnapshot: definition,
  };
}

function finalize(
  occupationId: string,
  state: SkillCreationState,
  eraId: EraId = "classic-1920s",
) {
  return finalizeSkillAllocation({
    character: character(eraId),
    occupation: occupation(occupationId),
    state,
    skillDefinitions,
  });
}

function accountantState(creditRatingPoints: number): SkillCreationState {
  return {
    requirementSelections: [
      { requirementId: "accounting", refs: [standard("accounting")] },
      { requirementId: "law", refs: [standard("law")] },
      { requirementId: "library-use", refs: [standard("library-use")] },
      { requirementId: "listen", refs: [standard("listen")] },
      { requirementId: "persuade", refs: [standard("persuade")] },
      { requirementId: "spot-hidden", refs: [standard("spot-hidden")] },
      {
        requirementId: "personal-or-era-specialties",
        refs: [standard("history"), standard("navigate")],
      },
    ],
    allocations: [
      { ref: standard("accounting"), occupationPoints: 20, interestPoints: 0 },
      { ref: standard("credit-rating"), occupationPoints: creditRatingPoints, interestPoints: 0 },
    ],
    keeperApprovals: [],
  };
}

describe("skill allocation workspace production regressions", () => {
  it("Accountant 使用 Engine 的 EDU×4 budget，requirement skill 与 CR 都可分职业点", () => {
    const result = finalize("accountant", accountantState(50));

    expect(result.occupationBudget).toBe(240);
    expect(result.remainingOccupationPoints).toBe(170);
    expect(result.errors.map(({ code }) => code)).not.toContain("occupation-skill-not-eligible");
    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:accounting")?.currentValue)
      .toBe(25);
    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:credit-rating")?.currentValue)
      .toBe(50);
  });

  it("Credit Rating 范围内不要求 override，范围外仍由 Engine 产生 approval", () => {
    expect(finalize("accountant", accountantState(50)).approvals.map(({ reason }) => reason))
      .not.toContain("credit-rating-override");
    expect(finalize("accountant", accountantState(80)).approvals).toContainEqual({
      reason: "credit-rating-override",
      subjectId: "skill:credit-rating",
      message: expect.any(String),
    });
  });

  it("Clerk / Executive 的职业技能可同时投入两类点，History 保持 interest-only", () => {
    const clerk = occupation("white-collar-worker-clerk-executive");
    const languageOwn: SkillRef = {
      type: "custom",
      definitionId: "language-own",
      specializationId: "00000000-0000-4000-8000-000000000102",
      displayName: "中文",
    };
    const state: SkillCreationState = {
      requirementSelections: [
        { requirementId: "accounting", refs: [standard("accounting")] },
        { requirementId: "language", refs: [languageOwn] },
        { requirementId: "law", refs: [standard("law")] },
        { requirementId: "library-or-computer", refs: [standard("library-use")] },
        { requirementId: "listen", refs: [standard("listen")] },
        { requirementId: "social", refs: [standard("charm")] },
        { requirementId: "personal-or-era", refs: [standard("appraise"), standard("archaeology")] },
      ],
      allocations: [
        { ref: standard("accounting"), occupationPoints: 20, interestPoints: 10 },
        { ref: standard("history"), occupationPoints: 0, interestPoints: 10 },
      ],
      keeperApprovals: [],
    };
    const rosterKeys = listOccupationAllocationRefs(clerk.definitionSnapshot, state).map(getSkillRefKey);
    const result = finalize("white-collar-worker-clerk-executive", state);

    expect(rosterKeys).toContain("skill:accounting");
    expect(rosterKeys).not.toContain("skill:history");
    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:accounting")?.currentValue)
      .toBe(35);
    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:history")?.currentValue)
      .toBe(15);
    expect(result.errors.map(({ code }) => code)).not.toContain("occupation-skill-not-eligible");
  });

  it("Deprogrammer active Hypnosis replacement 进入 roster 并可投入职业点", () => {
    const deprogrammer = occupation("deprogrammer");
    const target = "history";
    const state: SkillCreationState = {
      requirementSelections: [
        { requirementId: "social-1", refs: [standard("charm")] },
        { requirementId: "social-2", refs: [standard("fast-talk")] },
        { requirementId: "drive-auto", refs: [standard("drive-auto")] },
        { requirementId: "brawl-or-firearms", refs: [predefined("fighting", "brawl")] },
        { requirementId: "occult", refs: [standard("occult")] },
        { requirementId: "psychology", refs: [standard("psychology")] },
        { requirementId: "stealth", refs: [standard("stealth")] },
      ],
      allocations: [
        { ref: standard("hypnosis"), occupationPoints: 10, interestPoints: 0 },
      ],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: target,
      },
      keeperApprovals: [{
        reason: "occupation-skill-replacement",
        subjectId: occupationSkillReplacementApprovalSubject(
          "deprogrammer",
          "keeper-approved-hypnosis",
          target,
        ),
        approved: true,
      }],
    };
    const rosterKeys = listOccupationAllocationRefs(deprogrammer.definitionSnapshot, state).map(getSkillRefKey);
    const result = finalize("deprogrammer", state, "modern");

    expect(rosterKeys).toContain("skill:hypnosis");
    expect(rosterKeys).not.toContain("skill:history");
    expect(result.errors.map(({ code }) => code)).not.toContain("occupation-skill-not-eligible");
    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:hypnosis")?.currentValue)
      .toBe(11);
  });

  it("Cthulhu Mythos interest allocation 进入预览并由 Engine 产生 approval", () => {
    const state = accountantState(50);
    state.allocations.push({
      ref: standard("cthulhu-mythos"),
      occupationPoints: 0,
      interestPoints: 1,
    });
    const result = finalize("accountant", state);

    expect(result.skills.find(({ ref }) => getSkillRefKey(ref) === "skill:cthulhu-mythos")?.currentValue)
      .toBe(1);
    expect(result.approvals).toContainEqual({
      reason: "cthulhu-mythos-allocation",
      subjectId: "skill:cthulhu-mythos",
      message: expect.any(String),
    });
  });
});
