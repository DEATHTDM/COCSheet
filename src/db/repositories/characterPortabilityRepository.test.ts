import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Character } from "../../coc7/types/character";
import type { CreationSession } from "../../creation/types/creationSession";
import { createPortableCharacterPackage } from "../../portability/portableCharacterPackage";
import { COCSheetDatabase } from "../database";
import { CharacterRepository } from "./characterRepository";
import {
  CharacterPortabilityRepository,
  PortableCharacterCollisionError,
} from "./characterPortabilityRepository";
import { CreationSessionRepository } from "./creationSessionRepository";
import { CreationWorkflowRepository } from "./creationWorkflowRepository";

let database: COCSheetDatabase;
let portabilityRepository: CharacterPortabilityRepository;
let characterRepository: CharacterRepository;
let creationSessionRepository: CreationSessionRepository;
let creationWorkflowRepository: CreationWorkflowRepository;

const importedAt = 2_000_000_000_000;

beforeEach(async () => {
  database = new COCSheetDatabase(`COCSheet-portability-${crypto.randomUUID()}`);
  portabilityRepository = new CharacterPortabilityRepository(database, () => importedAt);
  characterRepository = new CharacterRepository(database);
  creationSessionRepository = new CreationSessionRepository(database);
  creationWorkflowRepository = new CreationWorkflowRepository(database);
  await database.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});

function makeCharacter(id = crypto.randomUUID(), name = "便携调查员"): Character {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    eraId: "modern",
    weapons: [{
      id: crypto.randomUUID(),
      definitionId: "orphan-future-weapon",
      notes: "原样保留",
    }],
    backstory: {
      entries: [{ id: crypto.randomUUID(), category: "traits", text: "谨慎" }],
    },
  };
}

function makeSession(character: Character, currentStep: CreationSession["currentStep"] = "skills"): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep,
    draftAge: 30,
    attributes: {
      generationMethod: "manual",
      generation: { method: "manual", values: { STR: 50 } },
      ageAdjustment: { age: 30, reductionAllocation: {}, eduImprovements: [] },
    },
  };
}

describe("CharacterPortabilityRepository export", () => {
  it("在一次只读 transaction 中返回 Character-only domain data，且零写入", async () => {
    const character = makeCharacter();
    await characterRepository.create(character);
    const before = await database.characters.get(character.id);
    const transactionSpy = vi.spyOn(database, "transaction");

    const result = await portabilityRepository.readCharacterPackageData(character.id);

    expect(result).toEqual({ character });
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
    expect(transactionSpy).toHaveBeenCalledWith(
      "r",
      [database.characters, database.creationSessions],
      expect.any(Function),
    );
    expect(await database.characters.get(character.id)).toEqual(before);
  });

  it("同一 snapshot 返回完整 Character + optional Session domain data", async () => {
    const character = makeCharacter();
    const session = makeSession(character, "review");
    await creationWorkflowRepository.createCharacterWithSession(character, session);

    expect(await portabilityRepository.readCharacterPackageData(character.id)).toEqual({
      character,
      creationSession: session,
    });
  });
});

describe("CharacterPortabilityRepository import", () => {
  it("原子导入 Character-only，并用 import time 生成本地 Record metadata", async () => {
    const character = makeCharacter();
    const imported = await portabilityRepository.importCharacterPackage(
      createPortableCharacterPackage(character, undefined, 123),
    );

    expect(imported.creationSession).toBeUndefined();
    expect(imported.character.data).toEqual(character);
    expect(imported.character.createdAt).toBe(importedAt);
    expect(imported.character.updatedAt).toBe(importedAt);
    expect(imported.character.createdAt).not.toBe(123);
    expect(await creationSessionRepository.getByCharacterId(character.id)).toBeUndefined();
  });

  it("原子导入 Character + Session，并保留 incomplete/review currentStep", async () => {
    for (const step of ["possessions", "review"] as const) {
      const character = makeCharacter();
      const session = makeSession(character, step);
      const imported = await portabilityRepository.importCharacterPackage(
        createPortableCharacterPackage(character, session, 123),
      );
      expect(imported.character.data).toEqual(character);
      expect(imported.creationSession?.data).toEqual(session);
      expect(imported.creationSession?.updatedAt).toBe(importedAt);
    }
  });

  it("Character collision、orphan Session collision 与 repeated import 均拒绝且不覆盖", async () => {
    const existing = makeCharacter();
    await characterRepository.create(existing);
    await expect(portabilityRepository.importCharacterPackage(
      createPortableCharacterPackage(existing, undefined, 1),
    )).rejects.toBeInstanceOf(PortableCharacterCollisionError);
    expect((await characterRepository.getById(existing.id))?.data).toEqual(existing);

    const orphanCharacter = makeCharacter();
    await creationSessionRepository.create(makeSession(orphanCharacter));
    await expect(portabilityRepository.importCharacterPackage(
      createPortableCharacterPackage(orphanCharacter, undefined, 1),
    )).rejects.toBeInstanceOf(PortableCharacterCollisionError);
    expect(await characterRepository.getById(orphanCharacter.id)).toBeUndefined();

    const repeated = makeCharacter();
    const repeatedPackage = createPortableCharacterPackage(repeated, undefined, 1);
    await portabilityRepository.importCharacterPackage(repeatedPackage);
    await expect(portabilityRepository.importCharacterPackage(repeatedPackage))
      .rejects.toBeInstanceOf(PortableCharacterCollisionError);
    expect(await characterRepository.list()).toHaveLength(2);
  });

  it("Session insertion failure 回滚 Character，不留下 partial import", async () => {
    const character = makeCharacter();
    const session = makeSession(character);
    const failSessionInsert = (): never => {
      throw new Error("模拟 Session 写入失败");
    };
    database.creationSessions.hook("creating", failSessionInsert);

    await expect(portabilityRepository.importCharacterPackage(
      createPortableCharacterPackage(character, session, 1),
    )).rejects.toThrow("模拟 Session 写入失败");
    database.creationSessions.hook("creating").unsubscribe(failSessionInsert);

    expect(await characterRepository.getById(character.id)).toBeUndefined();
    expect(await creationSessionRepository.getByCharacterId(character.id)).toBeUndefined();
  });

  it("不修改无关本地 Character", async () => {
    const unrelated = makeCharacter(undefined, "本地既有人物");
    await characterRepository.create(unrelated);
    const before = await database.characters.get(unrelated.id);
    const imported = makeCharacter(undefined, "新导入人物");

    await portabilityRepository.importCharacterPackage(
      createPortableCharacterPackage(imported, makeSession(imported), 1),
    );

    expect(await database.characters.get(unrelated.id)).toEqual(before);
  });

  it("export → delete → import 精确保留 Character + Session domain data", async () => {
    const character = makeCharacter();
    const session = makeSession(character, "review");
    await creationWorkflowRepository.createCharacterWithSession(character, session);
    const exported = await portabilityRepository.readCharacterPackageData(character.id);
    const portablePackage = createPortableCharacterPackage(
      exported.character,
      exported.creationSession,
      1,
    );
    await characterRepository.remove(character.id);

    await portabilityRepository.importCharacterPackage(portablePackage);

    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
    expect((await creationSessionRepository.getByCharacterId(character.id))?.data).toEqual(session);
  });
});
