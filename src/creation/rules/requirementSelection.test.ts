import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import { getSkillRefKey } from "../../coc7/rules/skills";
import type { OccupationRequirement } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getStandardSkillCatalog } from "../../content/skillRegistry";
import {
  getDeterministicRequirementSelection,
  listConcreteSkillRefs,
  listRequirementCandidates,
} from "./requirementSelection";

const skills = getStandardSkillCatalog();
const occupations = getOccupationRegistry("standard");

function requirement(occupationId: string, requirementId: string): OccupationRequirement {
  const result = occupations.get(occupationId)?.skillRequirements
    .find((candidate) => candidate.id === requirementId);
  if (!result) throw new Error(`找不到测试职业需求：${occupationId}/${requirementId}`);
  return result;
}

function keys(refs: readonly SkillRef[]): readonly string[] {
  return refs.map(getSkillRefKey);
}

describe("catalog-backed requirement selection", () => {
  it("只枚举普通技能与已有预定义专业化，不为 required specialization 产生 parent ref", () => {
    const concrete = listConcreteSkillRefs(skills, "modern");

    expect(keys(concrete)).toContain("skill:accounting");
    expect(keys(concrete)).toContain("skill:fighting:predefined:brawl");
    expect(keys(concrete)).not.toContain("skill:fighting");
    expect(keys(concrete)).not.toContain("skill:language-other");
  });

  it("按 Character era 过滤现代限定技能，但不按 sheet 隐藏非常规技能", () => {
    const classic = keys(listConcreteSkillRefs(skills, "classic-1920s"));
    const modern = keys(listConcreteSkillRefs(skills, "modern"));

    expect(classic).not.toContain("skill:computer-use");
    expect(classic).not.toContain("skill:electronics");
    expect(modern).toContain("skill:computer-use");
    expect(modern).toContain("skill:electronics");
    expect(classic).toContain("skill:hypnosis");
  });

  it("为 Fighting 返回所有可匹配预定义专业化，而 Language Other 暂无目录候选", () => {
    const fighting = requirement("criminal-freelance-solo", "fighting-or-firearms");
    const languageOther = requirement("antiquarian", "other-language");

    expect(keys(listRequirementCandidates(fighting, skills, "modern")))
      .toEqual(expect.arrayContaining([
        "skill:fighting:predefined:brawl",
        "skill:fighting:predefined:sword",
        "skill:firearms:predefined:handgun",
        "skill:firearms:predefined:rifle-shotgun",
      ]));
    expect(listRequirementCandidates(languageOther, skills, "modern")).toEqual([]);
  });

  it("any-skill 返回时代兼容 concrete refs，并继续应用 selector exclude", () => {
    const unrestricted = requirement("white-collar-worker-clerk-executive", "personal-or-era");
    const excluded: OccupationRequirement = {
      id: "non-combat",
      selector: {
        type: "any-skill",
        exclude: [{ type: "specialization-of", definitionId: "fighting" }],
      },
      cardinality: { min: 1, max: 1 },
    };

    const unrestrictedKeys = keys(listRequirementCandidates(unrestricted, skills, "classic-1920s"));
    const excludedKeys = keys(listRequirementCandidates(excluded, skills, "modern"));
    expect(unrestrictedKeys).toContain("skill:library-use");
    expect(unrestrictedKeys).not.toContain("skill:computer-use");
    expect(excludedKeys).not.toContain("skill:fighting:predefined:brawl");
    expect(excludedKeys).toContain("skill:firearms:predefined:handgun");
  });

  it("只把 exact 1/1 识别为 deterministic selection", () => {
    const fixed = requirement("accountant", "accounting");
    const choice = requirement("accountant", "personal-or-era-specialties");

    expect(getDeterministicRequirementSelection(fixed)).toEqual({
      type: "standard",
      definitionId: "accounting",
    });
    expect(getDeterministicRequirementSelection(choice)).toBeUndefined();
  });
});

describe("production occupation requirement regressions", () => {
  it("Clerk / Executive 的 Library Use / Computer Use 候选遵守 classic / modern", () => {
    const choice = requirement("white-collar-worker-clerk-executive", "library-or-computer");

    expect(keys(listRequirementCandidates(choice, skills, "classic-1920s")))
      .toEqual(["skill:library-use"]);
    expect(keys(listRequirementCandidates(choice, skills, "modern")))
      .toEqual(["skill:computer-use", "skill:library-use"]);
  });

  it("Criminal Freelance / Solo 同时列出 Fighting / Firearms，混选由 whole validator 判非法", () => {
    const choice = requirement("criminal-freelance-solo", "fighting-or-firearms");
    const candidates = listRequirementCandidates(choice, skills, "modern");
    const brawl = candidates.find((ref) => getSkillRefKey(ref) === "skill:fighting:predefined:brawl");
    const handgun = candidates.find((ref) => getSkillRefKey(ref) === "skill:firearms:predefined:handgun");
    if (!brawl || !handgun) throw new Error("缺少 Criminal combat candidates");

    expect(validateOccupationRequirementSelection(choice, [brawl])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [brawl, handgun]).map(({ code }) => code))
      .toContain("selector-mismatch");
  });

  it("Keeper Criminal choice-pool 接受同一 Fighting branch 的多个 ref 并由 Engine 计算类别", () => {
    const choice = requirement("criminal-keeper-rulebook", "criminal-specialties");
    const candidates = listRequirementCandidates(choice, skills, "modern");
    const selectedKeys = [
      "skill:fighting:predefined:brawl",
      "skill:fighting:predefined:sword",
      "skill:appraise",
      "skill:disguise",
      "skill:locksmith",
    ];
    const selected = selectedKeys.map((key) => {
      const ref = candidates.find((candidate) => getSkillRefKey(candidate) === key);
      if (!ref) throw new Error(`缺少 Keeper Criminal candidate：${key}`);
      return ref;
    });

    expect(validateOccupationRequirementSelection(choice, selected)).toEqual([]);
  });

  it("真实 any-skill 2/2 requirement 可选择两个不同 concrete refs", () => {
    const choice = requirement("white-collar-worker-clerk-executive", "personal-or-era");
    const candidates = listRequirementCandidates(choice, skills, "classic-1920s");
    const selected = candidates.filter((ref) => ["skill:history", "skill:navigate"].includes(getSkillRefKey(ref)));

    expect(selected).toHaveLength(2);
    expect(validateOccupationRequirementSelection(choice, selected)).toEqual([]);
  });
});
