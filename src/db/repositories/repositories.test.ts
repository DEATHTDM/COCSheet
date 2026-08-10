import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type { CreationSession } from "../../creation/types/creationSession";
import { COCSheetDatabase } from "../database";
import { CharacterRepository } from "./characterRepository";
import { CreationSessionRepository } from "./creationSessionRepository";
import { CreationWorkflowRepository } from "./creationWorkflowRepository";
import { KPPresetRepository } from "./kpPresetRepository";

let database: COCSheetDatabase;
let characterRepository: CharacterRepository;
let creationSessionRepository: CreationSessionRepository;
let creationWorkflowRepository: CreationWorkflowRepository;
let kpPresetRepository: KPPresetRepository;

beforeEach(async () => {
  database = new COCSheetDatabase(`COCSheet-test-${crypto.randomUUID()}`);
  characterRepository = new CharacterRepository(database);
  creationSessionRepository = new CreationSessionRepository(database);
  creationWorkflowRepository = new CreationWorkflowRepository(database);
  kpPresetRepository = new KPPresetRepository(database);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

function makeCharacter(id = crypto.randomUUID()): Character {
  return {
    version: 1,
    id,
    name: "阿卡姆调查员",
    settingId: "standard",
  };
}

function makeSession(characterId: string): CreationSession {
  return {
    version: 1,
    characterId,
    settingId: "standard",
    currentStep: "basic-info",
  };
}

function makePreset(id = crypto.randomUUID()): CreationPreset {
  return {
    version: 1,
    id,
    name: "默认预设",
    settingId: "standard",
    attributeGeneration: { allowedMethods: ["manual"] },
    allowCustomOccupation: "keeper-approval",
  };
}

describe("CharacterRepository", () => {
  it("完成创建、查询、更新、列表和删除", async () => {
    const character = makeCharacter();
    await characterRepository.create(character);

    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
    expect(await characterRepository.list()).toHaveLength(1);

    const updated = await characterRepository.update({ ...character, name: "更新后的姓名" });
    expect(updated.name).toBe("更新后的姓名");

    await characterRepository.remove(character.id);
    expect(await characterRepository.getById(character.id)).toBeUndefined();
  });

  it("保存、重新载入并更新 Character resources", async () => {
    const character = makeCharacter();
    const withResources: Character = {
      ...character,
      age: 25,
      characteristics: { STR: 50, CON: 55, SIZ: 65, DEX: 60, APP: 50, INT: 60, POW: 65, EDU: 70 },
      luck: 60,
      resources: { hp: { current: 12 }, mp: { current: 13 }, san: { current: 65 } },
    };
    await characterRepository.create(withResources);
    expect((await new CharacterRepository(database).getById(character.id))?.data.resources).toEqual(
      withResources.resources,
    );

    const resources = withResources.resources;
    if (!resources) throw new Error("测试 resources 未初始化");
    await characterRepository.update({
      ...withResources,
      resources: { ...resources, hp: { current: 5 } },
    });
    expect((await new CharacterRepository(database).getById(character.id))?.data.resources?.hp.current).toBe(5);
  });
});

describe("CreationSessionRepository", () => {
  it("删除建卡会话不会删除 Character", async () => {
    const character = makeCharacter();
    const session = makeSession(character.id);
    await creationWorkflowRepository.createCharacterWithSession(character, session);

    expect((await creationSessionRepository.getByCharacterId(character.id))?.data).toEqual(session);
    await creationSessionRepository.update({ ...session, currentStep: "attributes" });
    expect((await creationSessionRepository.list())[0]?.data.currentStep).toBe("attributes");

    await creationSessionRepository.remove(character.id);
    expect(await creationSessionRepository.getByCharacterId(character.id)).toBeUndefined();
    expect(await characterRepository.getById(character.id)).toBeDefined();
  });

  it("保存并恢复未完成的 Manual 输入", async () => {
    const character = makeCharacter();
    const session: CreationSession = {
      ...makeSession(character.id),
      currentStep: "attributes",
      draftAge: 25,
      attributes: {
        generationMethod: "manual",
        generation: { method: "manual", values: { STR: 55, CON: 60, SIZ: 65 } },
        ageAdjustment: { age: 25, reductionAllocation: {}, eduImprovements: [] },
      },
    };
    await creationWorkflowRepository.createCharacterWithSession(character, session);
    expect((await creationSessionRepository.getByCharacterId(character.id))?.data).toEqual(session);
  });

  it("完成属性后可恢复 Character 最终值与 CreationSession 过程", async () => {
    const character = makeCharacter();
    const completedCharacteristics = { STR: 60, CON: 60, SIZ: 60, DEX: 60, APP: 60, INT: 60, POW: 60, EDU: 60 };
    const session: CreationSession = {
      ...makeSession(character.id),
      currentStep: "attributes",
      draftAge: 25,
      attributes: {
        generationMethod: "manual",
        generation: {
          method: "manual",
          values: completedCharacteristics,
          baseCharacteristics: completedCharacteristics,
        },
        ageAdjustment: {
          age: 25,
          reductionAllocation: {},
          eduImprovements: [{ checkRoll: 50, eduBefore: 60, success: false, eduAfter: 60 }],
        },
        luck: { source: "manual", value: 55 },
      },
    };
    await creationWorkflowRepository.createCharacterWithSession(character, session);
    await creationWorkflowRepository.updateCharacterWithSession(
      { ...character, age: 25, characteristics: completedCharacteristics, luck: 55 },
      { ...session, currentStep: "occupation" },
    );

    const refreshedCharacter = await new CharacterRepository(database).getById(character.id);
    const refreshedSession = await new CreationSessionRepository(database).getByCharacterId(character.id);
    expect(refreshedCharacter?.data.age).toBe(25);
    expect(refreshedCharacter?.data.characteristics?.STR).toBe(60);
    expect(refreshedSession?.data.attributes?.generationMethod).toBe("manual");
    expect(refreshedSession?.data.currentStep).toBe("occupation");
  });

  it("Character 与 Session 更新在同一事务中回滚", async () => {
    const character = makeCharacter();
    const session: CreationSession = { ...makeSession(character.id), currentStep: "attributes" };
    await creationWorkflowRepository.createCharacterWithSession(character, session);

    const failSessionUpdate = (): never => {
      throw new Error("模拟 Session 写入失败");
    };
    database.creationSessions.hook("updating", failSessionUpdate);
    await expect(creationWorkflowRepository.updateCharacterWithSession(
      {
        ...character,
        age: 25,
        characteristics: { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50 },
        luck: 50,
        resources: { hp: { current: 10 }, mp: { current: 10 }, san: { current: 50 } },
      },
      { ...session, currentStep: "occupation" },
    )).rejects.toThrow("模拟 Session 写入失败");
    database.creationSessions.hook("updating").unsubscribe(failSessionUpdate);

    expect((await characterRepository.getById(character.id))?.data.resources).toBeUndefined();
    expect((await creationSessionRepository.getByCharacterId(character.id))?.data.currentStep).toBe("attributes");
  });
});

describe("KPPresetRepository", () => {
  it("完成创建、查询、更新、列表和删除", async () => {
    const preset = makePreset();
    await kpPresetRepository.create(preset);

    expect((await kpPresetRepository.getById(preset.id))?.data).toEqual(preset);
    expect(await kpPresetRepository.list()).toHaveLength(1);

    const updated = await kpPresetRepository.update({ ...preset, name: "更新后的预设" });
    expect(updated.name).toBe("更新后的预设");

    await kpPresetRepository.remove(preset.id);
    expect(await kpPresetRepository.getById(preset.id)).toBeUndefined();
  });
});
