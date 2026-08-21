import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  deriveFinalSheetStandardValues,
  deriveFinalSheetStandardWealth,
  getCharacterCreationStatus,
  getFinalSheetMaximumSanity,
  presentFinalSheetBackstory,
  presentFinalSheetSkills,
} from "./finalCharacterSheetPresentation";

const character: Character = {
  version: 1,
  id: "10000000-0000-4000-8000-000000000001",
  name: "林默",
  settingId: "standard",
  eraId: "classic-1920s",
  age: 30,
  characteristics: { STR: 50, CON: 60, SIZ: 70, DEX: 55, APP: 45, INT: 80, POW: 65, EDU: 75 },
  skills: [
    {
      ref: { type: "standard", definitionId: "credit-rating" },
      currentValue: 40,
      improvementChecked: false,
    },
    {
      ref: { type: "custom", definitionId: "language-other", specializationId: "20000000-0000-4000-8000-000000000002", displayName: "拉丁语" },
      currentValue: 61,
      improvementChecked: true,
    },
    {
      ref: { type: "standard", definitionId: "cthulhu-mythos" },
      currentValue: 12,
      improvementChecked: false,
    },
  ],
};

describe("final character sheet presentation", () => {
  it("从 Character 派生属性、SAN 与财富，不依赖 CreationSession", () => {
    expect(deriveFinalSheetStandardValues(character)).toMatchObject({
      maxHp: 13,
      initialMp: 13,
      initialSan: 65,
      build: 0,
    });
    expect(getFinalSheetMaximumSanity(character)).toBe(87);
    expect(deriveFinalSheetStandardWealth(character)).toMatchObject({
      lifestyle: "average",
      spendingLevelMinorUnits: 1_000,
    });
  });

  it("稳定显示 custom specialization、Half/Fifth 与成长标记", () => {
    const skills = presentFinalSheetSkills(character, getSkillRegistry("standard"));
    const latin = skills.find((skill) => skill.key.includes("20000000"));
    expect(latin).toMatchObject({
      label: "其他语言（拉丁语）",
      currentValue: 61,
      halfValue: 30,
      fifthValue: 12,
      improvementChecked: true,
      orphaned: false,
    });
  });

  it("未来无法解析的 SkillRef 使用安全 fallback", () => {
    const skills = presentFinalSheetSkills({
      skills: [{
        ref: { type: "standard", definitionId: "retired-skill" },
        currentValue: 44,
        improvementChecked: false,
      }],
    }, getSkillRegistry("standard"));
    expect(skills[0]).toMatchObject({
      label: "未知技能（skill:retired-skill）",
      currentValue: 44,
      halfValue: 22,
      fifthValue: 8,
      orphaned: true,
    });
  });

  it("legacy 缺失字段与 non-Standard content 保持只读空状态", () => {
    const legacy: Character = {
      version: 1,
      id: "30000000-0000-4000-8000-000000000003",
      name: "Legacy",
      settingId: "gaslight",
    };
    expect(deriveFinalSheetStandardValues(legacy)).toBeUndefined();
    expect(deriveFinalSheetStandardWealth({ ...legacy, eraId: "classic-1920s" })).toBeUndefined();
    expect(presentFinalSheetBackstory(legacy)).toEqual([]);
    expect(presentFinalSheetSkills(legacy, getSkillRegistry("gaslight"))).toEqual([]);
  });

  it("只用现有 currentStep 区分完成、未完成与缺失会话", () => {
    expect(getCharacterCreationStatus("review")).toBe("complete");
    expect(getCharacterCreationStatus("skills")).toBe("incomplete");
    expect(getCharacterCreationStatus(undefined)).toBe("missing-session");
  });
});
