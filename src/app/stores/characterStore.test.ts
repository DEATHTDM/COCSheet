import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import type { Character } from "../../coc7/types/character";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { useCharacterStore } from "./characterStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

function makeLegacyCharacter(overrides: Partial<Character> = {}): Character {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: "Phase 2 调查员",
    settingId: "standard",
    age: 25,
    characteristics: { STR: 50, CON: 55, SIZ: 65, DEX: 60, APP: 50, INT: 60, POW: 65, EDU: 70 },
    luck: 60,
    ...overrides,
  };
}

describe("legacy Character resources 补齐", () => {
  it("读取没有 resources 的 Phase 2 Character 时不隐式写回", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();

    expect((await store.loadById(character.id))?.data.resources).toBeUndefined();
    expect((await characterRepository.getById(character.id))?.data.resources).toBeUndefined();
  });

  it("显式补齐完整 Standard Character，已有 resources 时不重新初始化", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();

    expect((await store.ensureResourcesInitialized(character.id))?.data.resources).toEqual({
      hp: { current: 12 },
      mp: { current: 13 },
      san: { current: 65 },
    });
    await store.setCurrentHp(character.id, 4);
    expect((await store.ensureResourcesInitialized(character.id))?.data.resources?.hp.current).toBe(4);
  });

  it("显式补齐已有 Mythos 的 legacy Character 时一次写入受限 SAN", async () => {
    const character = makeLegacyCharacter({
      characteristics: {
        STR: 50,
        CON: 55,
        SIZ: 65,
        DEX: 60,
        APP: 50,
        INT: 60,
        POW: 80,
        EDU: 70,
      },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 30,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    const updateSpy = vi.spyOn(characterRepository, "update");

    const initialized = await store.ensureResourcesInitialized(character.id);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(initialized.data.resources).toEqual({
      hp: { current: 12 },
      mp: { current: 16 },
      san: { current: 69 },
    });
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.resources?.san.current).toBe(69);
  });

  it("人物属性或年龄不完整时不初始化", async () => {
    const incomplete = makeLegacyCharacter({ age: undefined, characteristics: undefined });
    await characterRepository.create(incomplete);
    expect((await useCharacterStore().ensureResourcesInitialized(incomplete.id))?.data.resources).toBeUndefined();
  });
});

describe("Character 建卡时代", () => {
  it("显式设置时代后持久化，并保留人物与建卡结果字段", async () => {
    const character = makeLegacyCharacter({
      occupation: {
        kind: "catalog",
        id: "accountant",
        displayNameSnapshot: { zh: "会计师", en: "Accountant" },
      },
      skills: [{
        ref: { type: "standard", definitionId: "history" },
        currentValue: 45,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();

    const updated = await store.setEra(character.id, "classic-1920s");
    expect(updated.data).toEqual({ ...character, eraId: "classic-1920s" });

    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data).toEqual(updated.data);
  });

  it("拒绝当前 SettingPack 未声明的时代", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    await expect(useCharacterStore().setEra(character.id, "future"))
      .rejects.toThrow("当前设定不存在时代");
    expect((await characterRepository.getById(character.id))?.data.eraId).toBeUndefined();
  });
});

describe("游戏中资源更新", () => {
  it("HP、MP、SAN 更新后可刷新恢复，SAN 可以高于 POW", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.ensureResourcesInitialized(character.id);
    await store.setCurrentHp(character.id, 5);
    await store.setCurrentMp(character.id, 20);
    await store.setCurrentSan(character.id, 90);

    setActivePinia(createPinia());
    const restored = await useCharacterStore().loadById(character.id);
    expect(restored?.data.resources).toEqual({
      hp: { current: 5 },
      mp: { current: 20 },
      san: { current: 90 },
    });
  });

  it("限制 HP 与 SAN，并只要求 current MP 为非负整数", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.ensureResourcesInitialized(character.id);

    await expect(store.setCurrentHp(character.id, 13)).rejects.toThrow("当前 HP");
    await expect(store.setCurrentMp(character.id, -1)).rejects.toThrow("当前 MP");
    await expect(store.setCurrentMp(character.id, 1.5)).rejects.toThrow("当前 MP");
    await expect(store.setCurrentMp(character.id, 20)).resolves.toBeDefined();
    await expect(store.setCurrentSan(character.id, 100)).rejects.toThrow("当前 SAN");
    await expect(store.setCurrentSan(character.id, 90)).resolves.toBeDefined();
  });
});

describe("游戏期技能编辑", () => {
  it("编辑普通技能、100+ 数值与成长标记后可刷新恢复，且资源不变", async () => {
    const resources = { hp: { current: 8 }, mp: { current: 7 }, san: { current: 61 } };
    const character = makeLegacyCharacter({ resources });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);
    const libraryUse = { type: "standard", definitionId: "library-use" } as const;

    await store.setSkillValue(character.id, libraryUse, 135);
    await store.setImprovementChecked(character.id, libraryUse, true);

    setActivePinia(createPinia());
    const restored = await useCharacterStore().loadById(character.id);
    expect(restored?.data.skills).toEqual([{
      ref: libraryUse,
      currentValue: 135,
      improvementChecked: true,
    }]);
    expect(restored?.data.resources).toEqual(resources);
    expect(restored?.data.characteristics).toEqual(character.characteristics);
    expect(restored?.data.age).toBe(character.age);
    expect(restored?.data.luck).toBe(character.luck);
    expect(restored?.data.name).toBe(character.name);
  });

  it("拒绝为 Cthulhu Mythos 与 Credit Rating 设置成长标记", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await expect(store.setImprovementChecked(
      character.id,
      { type: "standard", definitionId: "cthulhu-mythos" },
      true,
    )).rejects.toThrow("不允许成长标记");
    await expect(store.setImprovementChecked(
      character.id,
      { type: "standard", definitionId: "credit-rating" },
      true,
    )).rejects.toThrow("不允许成长标记");
  });

  it("Mythos 未超过当前 SAN 上限时只更新技能且 HP / MP 不变", async () => {
    const resources = { hp: { current: 8 }, mp: { current: 7 }, san: { current: 70 } };
    const character = makeLegacyCharacter({ resources });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const updated = await store.setSkillValue(
      character.id,
      { type: "standard", definitionId: "cthulhu-mythos" },
      10,
    );
    expect(updated.data.resources).toEqual(resources);
    expect(updated.data.skills?.[0]?.currentValue).toBe(10);
  });

  it("提高 Mythos 时在一次 Character update 中原子降低 current SAN", async () => {
    const character = makeLegacyCharacter({
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 70 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 10,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);
    const updateSpy = vi.spyOn(characterRepository, "update");

    const updated = await store.setSkillValue(
      character.id,
      { type: "standard", definitionId: "cthulhu-mythos" },
      40,
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updated.data.skills?.[0]?.currentValue).toBe(40);
    expect(updated.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 7 },
      san: { current: 59 },
    });

    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.resources?.san.current).toBe(59);
  });

  it("降低 Mythos 会提高 Maximum SAN，但不会自动恢复 current SAN", async () => {
    const character = makeLegacyCharacter({
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 50 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const updated = await store.setSkillValue(
      character.id,
      { type: "standard", definitionId: "cthulhu-mythos" },
      20,
    );
    expect(updated.data.resources?.san.current).toBe(50);
    expect(updated.data.skills?.[0]?.currentValue).toBe(20);
  });

  it("手动设置 current SAN 时遵守当前 Mythos 派生上限", async () => {
    const character = makeLegacyCharacter({
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 50 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await expect(store.setCurrentSan(character.id, 60)).rejects.toThrow("0～59");
    await expect(store.setCurrentSan(character.id, 59)).resolves.toBeDefined();
  });

  it("读取超出 Maximum SAN 的 Phase 4A 记录不写回，并仅在显式 reconciliation 后修复 SAN", async () => {
    const character = makeLegacyCharacter({
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 70 } },
      skills: [
        {
          ref: { type: "standard", definitionId: "cthulhu-mythos" },
          currentValue: 40,
          improvementChecked: false,
        },
        {
          ref: { type: "standard", definitionId: "library-use" },
          currentValue: 55,
          improvementChecked: true,
        },
      ],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    const updateSpy = vi.spyOn(characterRepository, "update");

    const loaded = await store.loadById(character.id);
    expect(loaded?.data.resources?.san.current).toBe(70);
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(character.id))?.data.resources?.san.current).toBe(70);

    const reconciled = await store.reconcileSanityToMaximum(character.id);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(reconciled.data).toEqual({
      ...character,
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 59 } },
    });

    setActivePinia(createPinia());
    const restored = await useCharacterStore().loadById(character.id);
    expect(restored?.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 7 },
      san: { current: 59 },
    });
    expect(restored?.data.skills).toEqual(character.skills);
    expect(restored?.data.characteristics).toEqual(character.characteristics);
    expect(restored?.data.luck).toBe(character.luck);
  });

  it("SAN 已在上限内时 reconciliation 不产生写入", async () => {
    const character = makeLegacyCharacter({
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 50 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect((await store.reconcileSanityToMaximum(character.id)).data.resources?.san.current).toBe(50);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("创建、重命名并删除 custom Science 专业化，UUID 始终不变", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const created = await store.createCustomSpecialization(character.id, "science", "天文学");
    const custom = created.data.skills?.find((skill) => skill.ref.type === "custom");
    if (!custom || custom.ref.type !== "custom") throw new Error("自定义专业化创建失败");
    const specializationId = custom.ref.specializationId;
    expect(custom.currentValue).toBe(1);
    expect(custom.improvementChecked).toBe(false);

    const renamed = await store.renameCustomSpecialization(character.id, specializationId, "宇宙学");
    const renamedCustom = renamed.data.skills?.find((skill) => skill.ref.type === "custom");
    expect(renamedCustom?.ref).toMatchObject({
      type: "custom",
      specializationId,
      displayName: "宇宙学",
    });

    const removed = await store.removeCustomSpecialization(character.id, specializationId);
    expect(removed.data.skills).toEqual([]);
  });

  it("保存具体母语身份、刷新恢复并在改名后保持 UUID，拒绝第二母语", async () => {
    const character = makeLegacyCharacter({
      characteristics: {
        STR: 50,
        CON: 55,
        SIZ: 65,
        DEX: 60,
        APP: 50,
        INT: 60,
        POW: 65,
        EDU: 80,
      },
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const created = await store.createCustomSpecialization(character.id, "language-own", "中文");
    const motherTongue = created.data.skills?.find(
      (skill) => skill.ref.type === "custom" && skill.ref.definitionId === "language-own",
    );
    if (!motherTongue || motherTongue.ref.type !== "custom") throw new Error("母语创建失败");
    const specializationId = motherTongue.ref.specializationId;
    expect(motherTongue).toEqual({
      ref: {
        type: "custom",
        definitionId: "language-own",
        specializationId,
        displayName: "中文",
      },
      currentValue: 80,
      improvementChecked: false,
    });

    setActivePinia(createPinia());
    const restoredStore = useCharacterStore();
    const restored = await restoredStore.loadById(character.id);
    expect(restored?.data.skills?.[0]).toEqual(motherTongue);

    const renamed = await restoredStore.renameCustomSpecialization(
      character.id,
      specializationId,
      "普通话",
    );
    expect(renamed.data.skills?.[0]?.ref).toEqual({
      type: "custom",
      definitionId: "language-own",
      specializationId,
      displayName: "普通话",
    });
    await expect(restoredStore.createCustomSpecialization(
      character.id,
      "language-own",
      "English",
    )).rejects.toThrow("只允许一个专业化实例");
  });

  it("Language Other 仍允许创建多个不同语言实例", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await store.createCustomSpecialization(character.id, "language-other", "English");
    const created = await store.createCustomSpecialization(character.id, "language-other", "Français");
    const languages = created.data.skills?.filter(
      (skill) => skill.ref.type === "custom" && skill.ref.definitionId === "language-other",
    );
    expect(languages).toHaveLength(2);
    expect(new Set(languages?.map((skill) =>
      skill.ref.type === "custom" ? skill.ref.specializationId : "",
    )).size).toBe(2);
  });
});
