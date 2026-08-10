import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  it("人物属性或年龄不完整时不初始化", async () => {
    const incomplete = makeLegacyCharacter({ age: undefined, characteristics: undefined });
    await characterRepository.create(incomplete);
    expect((await useCharacterStore().ensureResourcesInitialized(incomplete.id))?.data.resources).toBeUndefined();
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
