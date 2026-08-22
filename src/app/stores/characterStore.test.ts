import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import type { Character } from "../../coc7/types/character";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
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

describe("Character identity 与 backstory persistence", () => {
  it("name 可通过 Store 长期更新并刷新恢复", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);

    await useCharacterStore().updateName(character.id, "新的长期姓名");
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.name).toBe("新的长期姓名");
  });

  it("identity details trim 后持久化并可刷新恢复", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();

    const updated = await store.setIdentityDetails(character.id, {
      sex: "  女性 ",
      residence: " 上海 ",
      birthplace: " 杭州 ",
    });
    expect(updated.data).toMatchObject({ sex: "女性", residence: "上海", birthplace: "杭州" });

    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data).toMatchObject({
      sex: "女性",
      residence: "上海",
      birthplace: "杭州",
    });
  });

  it("add/edit/remove 与 key connection 全程刷新持久化，edit 保持 UUID", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const firstAdd = await store.addBackstoryEntry(character.id, "traits", "  谨慎  ");
    const first = firstAdd.data.backstory?.entries[0];
    if (!first) throw new Error("背景条目未创建");
    const secondAdd = await store.addBackstoryEntry(character.id, "traits", "守时");
    const second = secondAdd.data.backstory?.entries[1];
    if (!second) throw new Error("第二条背景未创建");
    expect(first.id).not.toBe(second.id);
    expect(first.text).toBe("谨慎");

    setActivePinia(createPinia());
    const restoredStore = useCharacterStore();
    expect((await restoredStore.loadById(character.id))?.data.backstory?.entries).toHaveLength(2);

    const edited = await restoredStore.updateBackstoryEntry(character.id, first.id, "  非常谨慎 ");
    expect(edited.data.backstory?.entries[0]).toMatchObject({ id: first.id, text: "非常谨慎" });
    await restoredStore.setKeyConnection(character.id, first.id);

    setActivePinia(createPinia());
    const keyedStore = useCharacterStore();
    const keyed = await keyedStore.loadById(character.id);
    expect(keyed?.data.backstory?.keyConnectionEntryId).toBe(first.id);
    expect(keyed?.data.backstory?.entries[0]?.id).toBe(first.id);

    const removed = await keyedStore.removeBackstoryEntry(character.id, first.id);
    expect(removed.data.backstory).toEqual({ entries: [second] });

    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.backstory)
      .toEqual({ entries: [second] });
  });

  it("拒绝空文本、缺失条目与游戏期类别 key connection", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await expect(store.addBackstoryEntry(character.id, "traits", "   "))
      .rejects.toThrow("背景条目不能为空");
    await expect(store.updateBackstoryEntry(character.id, crypto.randomUUID(), "有效文本"))
      .rejects.toThrow("找不到背景条目");
    const updated = await store.addBackstoryEntry(character.id, "encounters", "一次诡异遭遇");
    const encounter = updated.data.backstory?.entries[0];
    if (!encounter) throw new Error("游戏期背景未创建");
    await expect(store.setKeyConnection(character.id, encounter.id))
      .rejects.toThrow("只有六个创建背景类别");
  });

  it("长期背景不受创建期 3～6 条限制，且无 CreationSession 时十类均可 mutation", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    const categories = [
      "personal-description",
      "ideology-beliefs",
      "significant-people",
      "meaningful-locations",
      "treasured-possessions",
      "traits",
      "injuries-scars",
      "phobias-manias",
      "arcane-tomes-spells-artifacts",
      "encounters",
      "traits",
    ] as const;

    for (const [index, category] of categories.entries()) {
      await store.addBackstoryEntry(character.id, category, `长期背景 ${index + 1}`);
    }

    const persisted = await characterRepository.getById(character.id);
    expect(persisted?.data.backstory?.entries).toHaveLength(11);
    expect(new Set(persisted?.data.backstory?.entries.map((entry) => entry.id)).size).toBe(11);
    expect(await creationSessionRepository.getByCharacterId(character.id)).toBeUndefined();
  });

  it("identity/backstory mutation 不改变既有 CreationSession.currentStep", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    await creationSessionRepository.create({
      version: 1,
      characterId: character.id,
      settingId: character.settingId,
      currentStep: "background",
    });
    const store = useCharacterStore();

    await store.updateName(character.id, "长期姓名");
    await store.setIdentityDetails(character.id, {
      sex: "女性",
      residence: "上海",
      birthplace: "杭州",
    });
    const updated = await store.addBackstoryEntry(character.id, "traits", "谨慎");
    const entryId = updated.data.backstory?.entries[0]?.id;
    if (!entryId) throw new Error("背景条目未创建");
    await store.setKeyConnection(character.id, entryId);
    await store.setKeyConnection(character.id, undefined);

    expect((await creationSessionRepository.getByCharacterId(character.id))?.data.currentStep)
      .toBe("background");
  });
});

describe("Character wealth persistence", () => {
  it("cash/assets 与 asset CRUD 刷新持久化，编辑保持 Store-owned UUID", async () => {
    const character = makeLegacyCharacter({
      wealth: { cashMinorUnits: 5_000, assetsMinorUnits: 100_000, assetEntries: [] },
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await store.setCurrentCash(character.id, 4_250);
    await store.setCurrentAssets(character.id, 125_000);
    const added = await store.addAssetEntry(character.id, {
      description: "  波士顿公寓  ",
      valueMinorUnits: 100_000,
    });
    const entry = added.data.wealth?.assetEntries[0];
    if (!entry) throw new Error("资产条目未创建");
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(entry.description).toBe("波士顿公寓");

    setActivePinia(createPinia());
    const restoredStore = useCharacterStore();
    const restored = await restoredStore.loadById(character.id);
    expect(restored?.data.wealth).toMatchObject({
      cashMinorUnits: 4_250,
      assetsMinorUnits: 125_000,
    });
    expect(restored?.data.wealth?.assetEntries[0]?.id).toBe(entry.id);

    const edited = await restoredStore.updateAssetEntry(character.id, entry.id, {
      description: "  纽伯里街公寓  ",
    });
    expect(edited.data.wealth?.assetEntries[0]).toEqual({
      id: entry.id,
      description: "纽伯里街公寓",
    });

    await restoredStore.removeAssetEntry(character.id, entry.id);
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.wealth).toEqual({
      cashMinorUnits: 4_250,
      assetsMinorUnits: 125_000,
      assetEntries: [],
    });
  });

  it("拒绝未初始化、非法金额、空描述与缺失资产条目", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    await expect(store.setCurrentCash(character.id, 100)).rejects.toThrow("财富尚未初始化");
    const initialized = await characterRepository.update({
      ...character,
      wealth: { cashMinorUnits: 0, assetsMinorUnits: 0, assetEntries: [] },
    });
    await store.loadById(initialized.id);
    await expect(store.setCurrentAssets(character.id, -1)).rejects.toThrow("当前资产总额");
    await expect(store.addAssetEntry(character.id, { description: "   " }))
      .rejects.toThrow("资产描述不能为空");
    await expect(store.updateAssetEntry(character.id, crypto.randomUUID(), { description: "汽车" }))
      .rejects.toThrow("找不到资产条目");
    await expect(store.removeAssetEntry(character.id, crypto.randomUUID()))
      .rejects.toThrow("找不到资产条目");
  });
});

describe("Character possessions persistence", () => {
  it("无需初始化 wealth 即可 add/edit/remove，并在刷新后保留 Store-owned UUID", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const firstAdd = await store.addPossessionEntry(character.id, {
      name: "  莱卡相机  ",
      notes: "  随身携带，另有两卷胶卷  ",
    });
    const first = firstAdd.data.possessions?.[0];
    if (!first) throw new Error("随身物品未创建");
    const secondAdd = await store.addPossessionEntry(character.id, { name: "莱卡相机" });
    const second = secondAdd.data.possessions?.[1];
    if (!second) throw new Error("第二条随身物品未创建");

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(first.id).not.toBe(second.id);
    expect(first).toEqual({
      id: first.id,
      name: "莱卡相机",
      notes: "随身携带，另有两卷胶卷",
    });

    setActivePinia(createPinia());
    const restoredStore = useCharacterStore();
    expect((await restoredStore.loadById(character.id))?.data.possessions).toEqual([first, second]);

    const edited = await restoredStore.updatePossessionEntry(character.id, first.id, {
      name: "  相机  ",
      notes: "   ",
    });
    expect(edited.data.possessions?.[0]).toEqual({ id: first.id, name: "相机" });

    const removed = await restoredStore.removePossessionEntry(character.id, first.id);
    expect(removed.data.possessions).toEqual([second]);
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.possessions).toEqual([second]);
  });

  it("拒绝空名称与缺失条目，并精确保留其他同名物品", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();

    await expect(store.addPossessionEntry(character.id, { name: "   " }))
      .rejects.toThrow("随身物品名称不能为空");
    await expect(store.updatePossessionEntry(
      character.id,
      crypto.randomUUID(),
      { name: "相机" },
    )).rejects.toThrow("找不到随身物品");
    await expect(store.removePossessionEntry(character.id, crypto.randomUUID()))
      .rejects.toThrow("找不到随身物品");

    const firstAdd = await store.addPossessionEntry(character.id, { name: "绳索" });
    const firstId = firstAdd.data.possessions?.[0]?.id;
    const secondAdd = await store.addPossessionEntry(character.id, { name: "绳索" });
    const secondId = secondAdd.data.possessions?.[1]?.id;
    if (!firstId || !secondId) throw new Error("同名随身物品未创建");
    const removed = await store.removePossessionEntry(character.id, firstId);
    expect(removed.data.possessions).toEqual([{ id: secondId, name: "绳索" }]);
  });
});

describe("Character weapons persistence", () => {
  it("允许重复添加同一 definition，并按实例 UUID 编辑 notes、删除与刷新恢复", async () => {
    const character = makeLegacyCharacter({ eraId: "classic-1920s" });
    await characterRepository.create(character);
    const store = useCharacterStore();

    const firstAdd = await store.addWeapon(character.id, "bow", "  家传弓  ");
    const first = firstAdd.data.weapons?.[0];
    if (!first) throw new Error("第一件武器未创建");
    const secondAdd = await store.addWeapon(character.id, "bow");
    const second = secondAdd.data.weapons?.[1];
    if (!second) throw new Error("第二件武器未创建");

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(first.id).not.toBe(second.id);
    expect(first).toEqual({ id: first.id, definitionId: "bow", notes: "家传弓" });
    expect(second).toEqual({ id: second.id, definitionId: "bow" });

    const edited = await store.updateWeaponNotes(character.id, second.id, "  备用弓  ");
    expect(edited.data.weapons?.[1]).toEqual({
      id: second.id,
      definitionId: "bow",
      notes: "备用弓",
    });
    await store.updateWeaponNotes(character.id, first.id, "   ");
    const removed = await store.removeWeapon(character.id, first.id);
    expect(removed.data.weapons).toEqual([{
      id: second.id,
      definitionId: "bow",
      notes: "备用弓",
    }]);

    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.weapons).toEqual(removed.data.weapons);
  });

  it("新增只接受人物自身 Setting registry，且不会回退 Standard", async () => {
    const standard = makeLegacyCharacter();
    const gaslight = makeLegacyCharacter({ id: crypto.randomUUID(), settingId: "gaslight" });
    await characterRepository.create(standard);
    await characterRepository.create(gaslight);
    const store = useCharacterStore();

    await expect(store.addWeapon(standard.id, "missing-weapon"))
      .rejects.toThrow("当前设定不存在武器");
    await expect(store.addWeapon(gaslight.id, "bow"))
      .rejects.toThrow("当前设定不存在武器：bow");
  });

  it("availability 只作展示：明确时代三态与缺失时代都可新增，时代变化不改写实例", async () => {
    const classic = makeLegacyCharacter({ eraId: "classic-1920s" });
    const modern = makeLegacyCharacter({ id: crypto.randomUUID(), eraId: "modern" });
    const legacy = makeLegacyCharacter({ id: crypto.randomUUID() });
    await characterRepository.create(classic);
    await characterRepository.create(modern);
    await characterRepository.create(legacy);
    const store = useCharacterStore();

    await expect(store.addWeapon(classic.id, "bow")).resolves.toBeDefined();
    await expect(store.addWeapon(classic.id, "flintlock-pistol")).resolves.toBeDefined();
    const classicUnavailable = await store.addWeapon(classic.id, "fn-fal");
    await expect(store.addWeapon(modern.id, "bullwhip")).resolves.toBeDefined();
    await expect(store.addWeapon(legacy.id, "fn-fal")).resolves.toBeDefined();

    const beforeEraChange = classicUnavailable.data.weapons;
    const changedEra = await store.setEra(classic.id, "modern");
    expect(changedEra.data.weapons).toEqual(beforeEraChange);
  });

  it("orphan definition 可读取、可编辑备注并可删除，不触发 read-time writeback", async () => {
    const orphanId = crypto.randomUUID();
    const character = makeLegacyCharacter({
      weapons: [{ id: orphanId, definitionId: "retired-weapon", notes: "旧目录记录" }],
    });
    await characterRepository.create(character);
    const store = useCharacterStore();
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect((await store.loadById(character.id))?.data.weapons).toEqual(character.weapons);
    expect(updateSpy).not.toHaveBeenCalled();
    const edited = await store.updateWeaponNotes(character.id, orphanId, "  待 Keeper 确认  ");
    expect(edited.data.weapons?.[0]?.notes).toBe("待 Keeper 确认");
    expect((await store.removeWeapon(character.id, orphanId)).data.weapons).toEqual([]);
  });

  it("拒绝缺失的武器实例", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    const missingId = crypto.randomUUID();

    await expect(store.updateWeaponNotes(character.id, missingId, "备注"))
      .rejects.toThrow("找不到武器实例");
    await expect(store.removeWeapon(character.id, missingId))
      .rejects.toThrow("找不到武器实例");
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
  it("首次勾选未持久化的基础技能时只以 resolved base 实例化目标行", async () => {
    const character = makeLegacyCharacter();
    await characterRepository.create(character);
    const store = useCharacterStore();
    await store.loadById(character.id);

    const updated = await store.setImprovementChecked(
      character.id,
      { type: "standard", definitionId: "dodge" },
      true,
    );

    expect(updated.data.skills).toEqual([{
      ref: { type: "standard", definitionId: "dodge" },
      currentValue: 30,
      improvementChecked: true,
    }]);
    expect((await characterRepository.getById(character.id))?.data.skills).toEqual(updated.data.skills);
  });

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
