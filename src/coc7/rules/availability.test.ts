import { describe, expect, it } from "vitest";

import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getSkillRegistry } from "../../content/skillRegistry";
import { isOccupationAvailableInEra, isSkillAvailableInEra } from "./availability";

function requireOccupation(id: string) {
  const definition = getOccupationRegistry("standard").get(id);
  if (!definition) throw new Error(`缺少测试职业：${id}`);
  return definition;
}

function requireSkill(id: string) {
  const definition = getSkillRegistry("standard").get(id);
  if (!definition) throw new Error(`缺少测试技能：${id}`);
  return definition;
}

describe("时代适用性纯规则", () => {
  it("全时代职业同时适用于古典与现代", () => {
    const accountant = requireOccupation("accountant");
    expect(isOccupationAvailableInEra(accountant, "classic-1920s")).toBe(true);
    expect(isOccupationAvailableInEra(accountant, "modern")).toBe(true);
  });

  it("specific 职业只适用于声明的时代", () => {
    const stuntPilot = requireOccupation("pilot-stunt");
    expect(isOccupationAvailableInEra(stuntPilot, "classic-1920s")).toBe(true);
    expect(isOccupationAvailableInEra(stuntPilot, "modern")).toBe(false);

    const deprogrammer = requireOccupation("deprogrammer");
    expect(isOccupationAvailableInEra(deprogrammer, "modern")).toBe(true);
    expect(isOccupationAvailableInEra(deprogrammer, "classic-1920s")).toBe(false);
  });

  it("现代技能只在现代可用，全时代技能不受影响", () => {
    for (const id of ["computer-use", "electronics"]) {
      const definition = requireSkill(id);
      expect(isSkillAvailableInEra(definition, "classic-1920s")).toBe(false);
      expect(isSkillAvailableInEra(definition, "modern")).toBe(true);
    }
    const history = requireSkill("history");
    expect(isSkillAvailableInEra(history, "classic-1920s")).toBe(true);
    expect(isSkillAvailableInEra(history, "modern")).toBe(true);
  });
});
