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
    attributeMethods: ["manual"],
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
