import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import { getWeaponRegistry } from "../../content/weaponRegistry";
import { presentPrintableCharacterSheet } from "./printableCharacterSheetPresentation";

const fullCharacter: Character = {
  version: 1,
  id: "12000000-0000-4000-8000-000000000012",
  name: "林默",
  settingId: "standard",
  eraId: "classic-1920s",
  age: 31,
  sex: "女性",
  residence: "上海",
  birthplace: "苏州",
  characteristics: { STR: 55, CON: 60, SIZ: 65, DEX: 70, APP: 45, INT: 80, POW: 75, EDU: 65 },
  luck: 48,
  resources: { hp: { current: 9 }, mp: { current: 17 }, san: { current: 61 } },
  occupation: {
    kind: "catalog",
    id: "private-investigator",
    displayNameSnapshot: { zh: "私人侦探（历史快照）", en: "Private Investigator Snapshot" },
  },
  skills: [
    {
      ref: { type: "standard", definitionId: "library-use" },
      currentValue: 63,
      improvementChecked: true,
    },
    {
      ref: { type: "standard", definitionId: "credit-rating" },
      currentValue: 40,
      improvementChecked: false,
    },
    {
      ref: { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      currentValue: 52,
      improvementChecked: false,
    },
    {
      ref: {
        type: "custom",
        definitionId: "language-other",
        specializationId: "12000000-0000-4000-8000-000000000013",
        displayName: "拉丁语",
      },
      currentValue: 41,
      improvementChecked: false,
    },
    {
      ref: { type: "standard", definitionId: "hypnosis" },
      currentValue: 28,
      improvementChecked: false,
    },
    {
      ref: { type: "standard", definitionId: "retired-skill" },
      currentValue: 37,
      improvementChecked: true,
    },
  ],
  backstory: {
    entries: [
      {
        id: "12000000-0000-4000-8000-000000000014",
        category: "injuries-scars",
        text: "左手留有烧伤。",
      },
      {
        id: "12000000-0000-4000-8000-000000000015",
        category: "significant-people",
        text: "失踪的导师。",
      },
      {
        id: "12000000-0000-4000-8000-000000000016",
        category: "significant-people",
        text: "旧日同僚。",
      },
    ],
    keyConnectionEntryId: "12000000-0000-4000-8000-000000000015",
  },
  wealth: {
    cashMinorUnits: 12_345,
    assetsMinorUnits: 2_500_000,
    assetEntries: [{
      id: "12000000-0000-4000-8000-000000000017",
      description: "上海公寓",
      valueMinorUnits: 2_000_000,
    }],
  },
  possessions: [
    { id: "12000000-0000-4000-8000-000000000018", name: "笔记本", notes: "红色封面" },
    { id: "12000000-0000-4000-8000-000000000019", name: "笔记本" },
  ],
  weapons: [
    { id: "12000000-0000-4000-8000-000000000020", definitionId: "bow", notes: "白蜡木弓" },
    { id: "12000000-0000-4000-8000-000000000021", definitionId: "bow" },
    { id: "12000000-0000-4000-8000-000000000022", definitionId: "retired-weapon", notes: "旧资料" },
  ],
};

function present(character: Character) {
  return presentPrintableCharacterSheet(
    character,
    getSettingPackOrThrow(character.settingId),
    getSkillRegistry(character.settingId),
    getWeaponRegistry(character.settingId),
  );
}

describe("printable character sheet presentation", () => {
  it("只把 persisted Character 塑形成打印数据，并复用现有派生、技能、财富和武器 resolver", () => {
    const before = structuredClone(fullCharacter);
    const result = present(fullCharacter);

    expect(result.identity).toEqual({
      name: "林默",
      occupation: "私人侦探（历史快照）",
      setting: "Standard COC7",
      era: "古典（1920年代）",
      age: "31",
      sex: "女性",
      residence: "上海",
      birthplace: "苏州",
    });
    expect(result.resources).toEqual({
      currentHp: "9",
      maximumHp: "12",
      currentMp: "17",
      initialMp: "15",
      currentSan: "61",
      maximumSan: "99",
      currentLuck: "48",
    });
    expect(result.characteristics).toHaveLength(8);
    expect(result.characteristics?.find((item) => item.id === "STR")).toEqual({
      id: "STR",
      currentValue: 55,
      halfValue: 27,
      fifthValue: 11,
    });
    expect(result.derived).toEqual({ movement: "8", damageBonus: "无", build: 0 });

    expect(result.skills.find((skill) => skill.key === "skill:library-use")).toMatchObject({
      currentValue: 63,
      halfValue: 31,
      fifthValue: 12,
      improvementChecked: true,
    });
    expect(result.skills.some((skill) => skill.ref.type === "predefined" && !skill.persisted)).toBe(false);
    expect(result.skills.find((skill) => skill.key === "skill:hypnosis")?.persisted).toBe(true);
    expect(result.skills.find((skill) => skill.key === "skill:retired-skill")?.orphaned).toBe(true);

    expect(result.backstory.map((group) => group.category)).toEqual([
      "significant-people",
      "injuries-scars",
    ]);
    expect(result.backstory[0]?.entries.map((entry) => [entry.text, entry.keyConnection])).toEqual([
      ["失踪的导师。", true],
      ["旧日同僚。", false],
    ]);
    expect(result.wealth).toMatchObject({
      cashLabel: "$123.45",
      assetsLabel: "$25,000",
      lifestyleLabel: "中产",
      spendingLevelLabel: "$10",
      standard: true,
    });
    expect(result.wealth?.entries[0]?.valueLabel).toBe("$20,000");
    expect(result.possessions.map((entry) => entry.name)).toEqual(["笔记本", "笔记本"]);
    expect(result.weapons.map((weapon) => [weapon.name, weapon.orphaned])).toEqual([
      ["弓箭", false],
      ["弓箭", false],
      ["未知武器（retired-weapon）", true],
    ]);
    expect(result.weapons[0]).toMatchObject({ skillLabel: "射击（弓）", instance: { notes: "白蜡木弓" } });
    expect(fullCharacter).toEqual(before);
  });

  it("legacy 缺失字段安全显示，且不会生成虚假属性、资源或财富", () => {
    const legacy: Character = {
      version: 1,
      id: "12000000-0000-4000-8000-000000000023",
      name: "",
      settingId: "standard",
    };
    const result = present(legacy);

    expect(result.titleName).toBe("未命名调查员");
    expect(result.identity).toMatchObject({ name: "—", occupation: "—", era: "—", age: "—" });
    expect(result.resources).toEqual({
      currentHp: "—",
      maximumHp: "—",
      currentMp: "—",
      initialMp: "—",
      currentSan: "—",
      maximumSan: "99",
      currentLuck: "—",
    });
    expect(result.characteristics).toBeUndefined();
    expect(result.derived).toBeUndefined();
    expect(result.wealth).toBeUndefined();
    expect(result.backstory).toEqual([]);
    expect(result.possessions).toEqual([]);
    expect(result.weapons).toEqual([]);
  });

  it("non-Standard 只使用人物自身空 Registry，保留 persisted orphan 与 raw wealth", () => {
    const gaslight: Character = {
      ...fullCharacter,
      id: "12000000-0000-4000-8000-000000000024",
      name: "Gaslight Legacy",
      settingId: "gaslight",
      eraId: "modern",
      skills: [{
        ref: { type: "standard", definitionId: "library-use" },
        currentValue: 58,
        improvementChecked: false,
      }],
      wealth: { cashMinorUnits: 123, assetsMinorUnits: 456, assetEntries: [] },
      weapons: [{
        id: "12000000-0000-4000-8000-000000000025",
        definitionId: "bow",
      }],
    };
    const result = present(gaslight);

    expect(result.identity.setting).toBe("Cthulhu by Gaslight");
    expect(result.identity.era).toBe("—");
    expect(result.derived).toBeUndefined();
    expect(result.resources.maximumHp).toBe("—");
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toMatchObject({ key: "skill:library-use", orphaned: true });
    expect(result.wealth).toMatchObject({
      cashLabel: "123 raw minor units",
      assetsLabel: "456 raw minor units",
      standard: false,
    });
    expect(result.weapons[0]).toMatchObject({ name: "未知武器（bow）", orphaned: true });
  });
});
