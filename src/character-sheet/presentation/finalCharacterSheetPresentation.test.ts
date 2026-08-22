import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import { createSkillRegistry, getSkillRegistry } from "../../content/skillRegistry";
import {
  deriveFinalSheetStandardValues,
  deriveFinalSheetStandardWealth,
  filterFinalSheetSkillRows,
  getCharacterCreationStatus,
  getFinalSheetMaximumSanity,
  presentFinalSheetBackstory,
  presentFinalSheetSkills,
  resolveFinalSheetSkillRows,
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

  it("从 same-Setting Registry 解析未持久化的 Standard sheet baseline，且纯查看不改变稀疏状态", () => {
    const before = structuredClone(character.skills);
    const skills = resolveFinalSheetSkillRows(character, getSkillRegistry("standard"));
    expect(skills.find((skill) => skill.key === "skill:library-use")).toMatchObject({
      nameZh: "图书馆使用",
      baseValue: 20,
      currentValue: 20,
      halfValue: 10,
      fifthValue: 4,
      improvementChecked: false,
      persisted: false,
      orphaned: false,
    });
    expect(character.skills).toEqual(before);
  });

  it("persisted current 覆盖实时 base，默认不展开 required specialization 目录", () => {
    const skills = resolveFinalSheetSkillRows({
      ...character,
      skills: [{
        ref: { type: "standard", definitionId: "library-use" },
        currentValue: 61,
        improvementChecked: true,
      }],
    }, getSkillRegistry("standard"));
    expect(skills.find((skill) => skill.key === "skill:library-use")).toMatchObject({
      baseValue: 20,
      currentValue: 61,
      halfValue: 30,
      fifthValue: 12,
      improvementChecked: true,
      persisted: true,
    });
    expect(skills.some((skill) => skill.ref.type === "predefined")).toBe(false);
    expect(skills.some((skill) => skill.ref.definitionId === "science")).toBe(false);
  });

  it("专业化开关只读展示 valid predefined candidate，未持久化 Science 不在默认视图", () => {
    const sparse = { ...character, skills: [] };
    const before = structuredClone(sparse.skills);
    const defaultRows = resolveFinalSheetSkillRows(sparse, getSkillRegistry("standard"));
    expect(defaultRows.some((skill) => skill.ref.definitionId === "science")).toBe(false);

    const expanded = resolveFinalSheetSkillRows(sparse, getSkillRegistry("standard"), {
      includePredefinedSpecializations: true,
    });
    expect(expanded.find((skill) => skill.key === "skill:fighting:predefined:brawl")).toMatchObject({
      nameZh: "格斗（斗殴）",
      baseValue: 25,
      currentValue: 25,
      persisted: false,
    });
    expect(expanded.filter((skill) => skill.ref.definitionId === "science")).toHaveLength(13);
    expect(sparse.skills).toEqual(before);
  });

  it("persisted predefined specialization 无论开关状态都保留稳定 ref", () => {
    const persisted = {
      ...character,
      skills: [{
        ref: { type: "predefined" as const, definitionId: "fighting", specializationId: "brawl" },
        currentValue: 47,
        improvementChecked: true,
      }],
    };
    expect(resolveFinalSheetSkillRows(persisted, getSkillRegistry("standard"))
      .find((skill) => skill.key === "skill:fighting:predefined:brawl")).toMatchObject({
        currentValue: 47,
        improvementChecked: true,
        persisted: true,
        orphaned: false,
      });
  });

  it("persisted custom 只出现一次，custom-only definition 不伪造 synthetic SkillRef", () => {
    const ownLanguageId = "40000000-0000-4000-8000-000000000004";
    const skills = resolveFinalSheetSkillRows({
      ...character,
      skills: [{
        ref: {
          type: "custom",
          definitionId: "language-own",
          specializationId: ownLanguageId,
          displayName: "中文",
        },
        currentValue: 75,
        improvementChecked: false,
      }],
    }, getSkillRegistry("standard"));
    expect(skills.filter((skill) => skill.ref.definitionId === "language-own")).toHaveLength(1);
    expect(skills.find((skill) => skill.ref.definitionId === "language-own")).toMatchObject({
      key: `skill:language-own:custom:${ownLanguageId}`,
      nameZh: "母语（中文）",
      persisted: true,
    });

    const withoutCustom = resolveFinalSheetSkillRows({ ...character, skills: [] }, getSkillRegistry("standard"));
    expect(withoutCustom.some((skill) => skill.ref.definitionId === "language-own")).toBe(false);
    expect(withoutCustom.some((skill) => skill.ref.definitionId === "language-other")).toBe(false);
  });

  it("默认保留 persisted uncommon，但只在开关打开后浏览未持久化 uncommon", () => {
    const withPersistedUncommon = {
      ...character,
      skills: [{
        ref: { type: "standard" as const, definitionId: "hypnosis" },
        currentValue: 44,
        improvementChecked: false,
      }],
    };
    expect(resolveFinalSheetSkillRows(withPersistedUncommon, getSkillRegistry("standard"))
      .find((skill) => skill.key === "skill:hypnosis")).toMatchObject({
        currentValue: 44,
        persisted: true,
        availability: { sheet: "uncommon", era: "all" },
      });

    const sparse = { ...character, skills: [] };
    expect(resolveFinalSheetSkillRows(sparse, getSkillRegistry("standard"))
      .some((skill) => skill.key === "skill:hypnosis")).toBe(false);
    expect(resolveFinalSheetSkillRows(sparse, getSkillRegistry("standard"), { includeUncommon: true })
      .find((skill) => skill.key === "skill:hypnosis")).toMatchObject({ persisted: false });
  });

  it("uncommon 与 predefined 开关正交，uncommon parent 需两个开关才出现候选", () => {
    const fighting = getSkillRegistry("standard").get("fighting");
    if (!fighting) throw new Error("测试目录缺少 Fighting");
    const registry = createSkillRegistry([{
      ...fighting,
      availability: { sheet: "uncommon", era: "all" },
    }]);
    const sparse = { ...character, skills: [] };

    expect(resolveFinalSheetSkillRows(sparse, registry)).toEqual([]);
    expect(resolveFinalSheetSkillRows(sparse, registry, { includeUncommon: true })).toEqual([]);
    expect(resolveFinalSheetSkillRows(sparse, registry, {
      includePredefinedSpecializations: true,
    })).toEqual([]);
    expect(resolveFinalSheetSkillRows(sparse, registry, {
      includeUncommon: true,
      includePredefinedSpecializations: true,
    }).some((skill) => skill.key === "skill:fighting:predefined:brawl")).toBe(true);
  });

  it("persisted uncommon predefined 不受两个浏览开关影响", () => {
    const fighting = getSkillRegistry("standard").get("fighting");
    if (!fighting) throw new Error("测试目录缺少 Fighting");
    const registry = createSkillRegistry([{
      ...fighting,
      availability: { sheet: "uncommon", era: "all" },
    }]);
    const rows = resolveFinalSheetSkillRows({
      ...character,
      skills: [{
        ref: { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
        currentValue: 39,
        improvementChecked: false,
      }],
    }, registry);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ persisted: true, currentValue: 39, orphaned: false });
  });

  it("modern-only metadata 标明兼容性，缺少 era 时不猜测", () => {
    const classic = resolveFinalSheetSkillRows(character, getSkillRegistry("standard"));
    expect(classic.find((skill) => skill.key === "skill:computer-use")).toMatchObject({
      availability: { sheet: "standard", era: "modern-only" },
      eraStatus: "incompatible",
    });
    const missingEra = resolveFinalSheetSkillRows(
      { ...character, eraId: undefined },
      getSkillRegistry("standard"),
    );
    expect(missingEra.find((skill) => skill.key === "skill:computer-use")?.eraStatus).toBe("unknown");
  });

  it("搜索覆盖中文、英文、alias 与 custom display name", () => {
    const rows = resolveFinalSheetSkillRows(character, getSkillRegistry("standard"));
    expect(filterFinalSheetSkillRows(rows, "图书馆").map((row) => row.key)).toContain("skill:library-use");
    expect(filterFinalSheetSkillRows(rows, "Library Use").map((row) => row.key)).toContain("skill:library-use");
    expect(filterFinalSheetSkillRows(rows, "外语").some((row) => row.ref.definitionId === "language-other")).toBe(true);
    expect(filterFinalSheetSkillRows(rows, "拉丁语").some((row) => row.key.includes("20000000"))).toBe(true);
  });

  it("专业化浏览视图可按 predefined 中文、英文与 alias 搜索", () => {
    const fighting = getSkillRegistry("standard").get("fighting");
    if (!fighting) throw new Error("测试目录缺少 Fighting");
    const registry = createSkillRegistry([{
      ...fighting,
      predefinedSpecializations: fighting.predefinedSpecializations.map((specialization) =>
        specialization.id === "brawl"
          ? { ...specialization, aliases: { zh: ["近战别名"], en: ["Close Combat Alias"] } }
          : specialization),
    }]);
    const rows = resolveFinalSheetSkillRows({ ...character, skills: [] }, registry, {
      includePredefinedSpecializations: true,
    });
    const brawlKey = "skill:fighting:predefined:brawl";
    expect(filterFinalSheetSkillRows(rows, "斗殴").map((row) => row.key)).toContain(brawlKey);
    expect(filterFinalSheetSkillRows(rows, "Brawl").map((row) => row.key)).toContain(brawlKey);
    expect(filterFinalSheetSkillRows(rows, "近战别名").map((row) => row.key)).toContain(brawlKey);
    expect(filterFinalSheetSkillRows(rows, "Close Combat Alias").map((row) => row.key)).toContain(brawlKey);
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

  it("缺少 characteristics 时不生成 catalog baseline，但 persisted resolved 与 orphan 仍安全显示", () => {
    const incomplete: Character = {
      version: 1,
      id: "50000000-0000-4000-8000-000000000005",
      name: "Incomplete",
      settingId: "standard",
      skills: [
        {
          ref: { type: "standard", definitionId: "library-use" },
          currentValue: 48,
          improvementChecked: true,
        },
        {
          ref: { type: "standard", definitionId: "retired-skill" },
          currentValue: 33,
          improvementChecked: false,
        },
      ],
    };
    const rows = resolveFinalSheetSkillRows(incomplete, getSkillRegistry("standard"));
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.key === "skill:library-use")).toMatchObject({
      currentValue: 48,
      halfValue: 24,
      fifthValue: 9,
      baseValue: undefined,
      persisted: true,
      orphaned: false,
    });
    expect(rows.find((row) => row.key === "skill:retired-skill")?.orphaned).toBe(true);
  });

  it("non-Standard 空 Registry 不回退 Standard，但 persisted orphan 仍显示", () => {
    const gaslight: Character = {
      version: 1,
      id: "60000000-0000-4000-8000-000000000006",
      name: "Gaslight",
      settingId: "gaslight",
      characteristics: character.characteristics,
      skills: [{
        ref: { type: "standard", definitionId: "library-use" },
        currentValue: 55,
        improvementChecked: false,
      }],
    };
    const rows = resolveFinalSheetSkillRows(gaslight, getSkillRegistry("gaslight"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "skill:library-use", orphaned: true, currentValue: 55 });
  });

  it("只用现有 currentStep 区分完成、未完成与缺失会话", () => {
    expect(getCharacterCreationStatus("review")).toBe("complete");
    expect(getCharacterCreationStatus("skills")).toBe("incomplete");
    expect(getCharacterCreationStatus(undefined)).toBe("missing-session");
  });
});
