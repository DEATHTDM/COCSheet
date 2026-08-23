import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Character } from "../../coc7/types/character";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type { CreationSession } from "../../creation/types/creationSession";
import { createPortableLibraryPackage } from "../../portability/portableLibraryPackage";
import { COCSheetDatabase } from "../database";
import type { CharacterRecord } from "../records";
import { CharacterRepository } from "./characterRepository";
import { CreationSessionRepository } from "./creationSessionRepository";
import { CreationWorkflowRepository } from "./creationWorkflowRepository";
import { KPPresetRepository } from "./kpPresetRepository";
import {
  LibraryCollisionError,
  LibraryExportIntegrityError,
  LibraryPortabilityRepository,
  LibraryRecordValidationError,
} from "./libraryPortabilityRepository";

let database: COCSheetDatabase;
let repository: LibraryPortabilityRepository;
let characterRepository: CharacterRepository;
let sessionRepository: CreationSessionRepository;
let workflowRepository: CreationWorkflowRepository;
let presetRepository: KPPresetRepository;

const importedAt = 2_100_000_000_000;

beforeEach(async () => {
  database = new COCSheetDatabase(`COCSheet-library-portability-${crypto.randomUUID()}`);
  repository = new LibraryPortabilityRepository(database, () => importedAt);
  characterRepository = new CharacterRepository(database);
  sessionRepository = new CreationSessionRepository(database);
  workflowRepository = new CreationWorkflowRepository(database);
  presetRepository = new KPPresetRepository(database);
  await database.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});

function makeCharacter(name: string, id = crypto.randomUUID()): Character {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    eraId: "modern",
    backstory: {
      entries: [{ id: crypto.randomUUID(), category: "traits", text: "保持 UUID" }],
    },
    weapons: [{ id: crypto.randomUUID(), definitionId: "orphan-future-weapon" }],
  };
}

function makeSession(
  character: Character,
  currentStep: CreationSession["currentStep"] = "occupation",
  snapshot?: CreationPreset,
): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep,
    ...(snapshot ? { presetSnapshot: snapshot } : {}),
  };
}

function makePreset(name: string, id = crypto.randomUUID()): CreationPreset {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    attributeGeneration: { allowedMethods: ["manual"] },
    allowCustomOccupation: "keeper-approval",
  };
}

async function tableCounts(): Promise<[number, number, number]> {
  return Promise.all([
    database.characters.count(),
    database.creationSessions.count(),
    database.kpPresets.count(),
  ]);
}

describe("LibraryPortabilityRepository export", () => {
  it("在一个只读 transaction 中读取三表一致 domain snapshot 且零写入", async () => {
    const complete = makeCharacter("Complete");
    const incomplete = makeCharacter("Incomplete");
    const noSession = makeCharacter("No Session");
    const preset = makePreset("Global");
    await workflowRepository.createCharacterWithSession(complete, makeSession(complete, "review"));
    await workflowRepository.createCharacterWithSession(incomplete, makeSession(incomplete, "skills"));
    await characterRepository.create(noSession);
    await presetRepository.create(preset);
    const before = await Promise.all([
      database.characters.toArray(),
      database.creationSessions.toArray(),
      database.kpPresets.toArray(),
    ]);
    const transactionSpy = vi.spyOn(database, "transaction");

    const result = await repository.readLibraryPackageData();

    expect(result.characterEntries).toHaveLength(3);
    expect(result.characterEntries.filter((entry) => entry.creationSession)).toHaveLength(2);
    expect(result.kpPresets).toEqual([preset]);
    expect(transactionSpy).toHaveBeenCalledWith(
      "r",
      [database.characters, database.creationSessions, database.kpPresets],
      expect.any(Function),
    );
    expect(await database.characters.toArray()).toEqual(before[0]);
    expect(await database.creationSessions.toArray()).toEqual(before[1]);
    expect(await database.kpPresets.toArray()).toEqual(before[2]);
    expect(result.characterEntries[0]).not.toHaveProperty("updatedAt");
    expect(result.kpPresets[0]).not.toHaveProperty("updatedAt");
  });

  it("空库是合法 snapshot", async () => {
    expect(await repository.readLibraryPackageData()).toEqual({ characterEntries: [], kpPresets: [] });
  });

  it("orphan Session 明确拒绝导出而不删除资料", async () => {
    const missing = makeCharacter("Missing");
    await sessionRepository.create(makeSession(missing));
    await expect(repository.readLibraryPackageData()).rejects.toBeInstanceOf(LibraryExportIntegrityError);
    expect(await tableCounts()).toEqual([0, 1, 0]);
  });

  it("任一 malformed local Record 都失败而不跳过", async () => {
    const character = makeCharacter("Broken");
    const malformed: CharacterRecord = {
      id: character.id,
      version: 1,
      name: "与 data 不一致",
      settingId: character.settingId,
      createdAt: 1,
      updatedAt: 1,
      data: character,
    };
    await database.characters.add(malformed);
    await expect(repository.readLibraryPackageData()).rejects.toBeInstanceOf(LibraryRecordValidationError);
    expect(await tableCounts()).toEqual([1, 0, 0]);
  });
});

describe("LibraryPortabilityRepository import", () => {
  it("空 backup 可原子 no-op 导入", async () => {
    expect(await repository.importLibraryPackage(createPortableLibraryPackage([], [], 1))).toEqual({
      characterCount: 0,
      sessionCount: 0,
      kpPresetCount: 0,
    });
    expect(await tableCounts()).toEqual([0, 0, 0]);
  });

  it("空库完整恢复多人物、incomplete/review/no-session 与 global presets", async () => {
    const complete = makeCharacter("Complete");
    const incomplete = makeCharacter("Incomplete");
    const noSession = makeCharacter("No Session");
    const presets = [makePreset("P1"), makePreset("P2")];
    const backup = createPortableLibraryPackage([
      { character: complete, creationSession: makeSession(complete, "review") },
      { character: incomplete, creationSession: makeSession(incomplete, "possessions") },
      { character: noSession },
    ], presets, 123);

    const summary = await repository.importLibraryPackage(backup);

    expect(summary).toEqual({ characterCount: 3, sessionCount: 2, kpPresetCount: 2 });
    expect((await characterRepository.getById(noSession.id))?.data).toEqual(noSession);
    expect((await sessionRepository.getByCharacterId(complete.id))?.data.currentStep).toBe("review");
    expect(await sessionRepository.getByCharacterId(noSession.id)).toBeUndefined();
    expect((await presetRepository.list()).map((record) => record.data)).toEqual(
      expect.arrayContaining(presets),
    );
  });

  it("非空本地库可追加完全无冲突的整份 backup 且不改无关资料", async () => {
    const local = makeCharacter("Local");
    const localPreset = makePreset("Local preset");
    await characterRepository.create(local);
    await presetRepository.create(localPreset);
    const beforeCharacter = await database.characters.get(local.id);
    const beforePreset = await database.kpPresets.get(localPreset.id);
    const imported = makeCharacter("Imported");

    await repository.importLibraryPackage(createPortableLibraryPackage(
      [{ character: imported, creationSession: makeSession(imported) }],
      [makePreset("Imported preset")],
      1,
    ));

    expect(await tableCounts()).toEqual([2, 1, 2]);
    expect(await database.characters.get(local.id)).toEqual(beforeCharacter);
    expect(await database.kpPresets.get(localPreset.id)).toEqual(beforePreset);
  });

  it("Character collision 拒绝整份，其他无冲突 entities 也零写入", async () => {
    const existing = makeCharacter("Existing");
    const otherwiseValid = makeCharacter("Would import");
    await characterRepository.create(existing);
    const backup = createPortableLibraryPackage(
      [{ character: existing }, { character: otherwiseValid }],
      [makePreset("Would not import")],
      1,
    );

    await expect(repository.importLibraryPackage(backup)).rejects.toMatchObject({
      constructor: LibraryCollisionError,
      kind: "character",
    });
    expect(await tableCounts()).toEqual([1, 0, 0]);
  });

  it("local orphan Session collision 拒绝整份", async () => {
    const imported = makeCharacter("Imported");
    await sessionRepository.create(makeSession(imported));
    await expect(repository.importLibraryPackage(createPortableLibraryPackage(
      [{ character: imported }],
      [],
      1,
    ))).rejects.toMatchObject({ kind: "orphan-session" });
    expect(await tableCounts()).toEqual([0, 1, 0]);
  });

  it("global KPPreset collision 拒绝整份，但 snapshot 同 ID 不参与冲突", async () => {
    const global = makePreset("Global");
    await presetRepository.create(global);
    const collisionCharacter = makeCharacter("Collision");
    await expect(repository.importLibraryPackage(createPortableLibraryPackage(
      [{ character: collisionCharacter }],
      [global],
      1,
    ))).rejects.toMatchObject({ kind: "kp-preset" });
    expect(await tableCounts()).toEqual([0, 0, 1]);

    const legalCharacter = makeCharacter("Legal snapshot");
    const historical = { ...global, name: "Historical" };
    await repository.importLibraryPackage(createPortableLibraryPackage(
      [{ character: legalCharacter, creationSession: makeSession(legalCharacter, "skills", historical) }],
      [],
      1,
    ));
    expect((await sessionRepository.getByCharacterId(legalCharacter.id))?.data.presetSnapshot?.name)
      .toBe("Historical");
    expect((await presetRepository.getById(global.id))?.data.name).toBe("Global");
  });

  it("Character、Session 或 KPPreset insert 失败均回滚三表", async () => {
    const testRollback = async (kind: "character" | "session" | "preset"): Promise<void> => {
      const character = makeCharacter(kind);
      const preset = makePreset(kind);
      const hook = (): never => { throw new Error(`模拟 ${kind} 写入失败`); };
      const table = kind === "character"
        ? database.characters
        : kind === "session"
          ? database.creationSessions
          : database.kpPresets;
      table.hook("creating", hook);
      await expect(repository.importLibraryPackage(createPortableLibraryPackage(
        [{ character, creationSession: makeSession(character) }],
        [preset],
        1,
      ))).rejects.toThrow(`模拟 ${kind} 写入失败`);
      table.hook("creating").unsubscribe(hook);
      expect(await tableCounts()).toEqual([0, 0, 0]);
    };

    await testRollback("character");
    await testRollback("session");
    await testRollback("preset");
  });

  it("所有 imported Record metadata 使用同一 import time 而非 exportedAt", async () => {
    const character = makeCharacter("Timestamp");
    const preset = makePreset("Timestamp");
    await repository.importLibraryPackage(createPortableLibraryPackage(
      [{ character, creationSession: makeSession(character) }],
      [preset],
      123,
    ));
    const characterRecord = await database.characters.get(character.id);
    const sessionRecord = await database.creationSessions.get(character.id);
    const presetRecord = await database.kpPresets.get(preset.id);
    expect(characterRecord).toMatchObject({ createdAt: importedAt, updatedAt: importedAt });
    expect(sessionRecord?.updatedAt).toBe(importedAt);
    expect(presetRecord?.updatedAt).toBe(importedAt);
    expect(characterRecord?.createdAt).not.toBe(123);
  });

  it("export → 清空三表 → import 精确保留全部 domain data 与 snapshot 独立性", async () => {
    const global = makePreset("Current global");
    const historical = { ...global, name: "Historical snapshot" };
    const complete = makeCharacter("Complete");
    const incomplete = makeCharacter("Incomplete");
    const noSession = makeCharacter("No session");
    await workflowRepository.createCharacterWithSession(
      complete,
      makeSession(complete, "review", historical),
    );
    await workflowRepository.createCharacterWithSession(incomplete, makeSession(incomplete, "skills"));
    await characterRepository.create(noSession);
    await presetRepository.create(global);
    const before = await repository.readLibraryPackageData();
    const backup = createPortableLibraryPackage(before.characterEntries, before.kpPresets, 1);
    await database.transaction("rw", [database.characters, database.creationSessions, database.kpPresets], async () => {
      await Promise.all([
        database.characters.clear(),
        database.creationSessions.clear(),
        database.kpPresets.clear(),
      ]);
    });

    await repository.importLibraryPackage(backup);

    const restored = await repository.readLibraryPackageData();
    expect(createPortableLibraryPackage(restored.characterEntries, restored.kpPresets, 1)).toEqual(backup);
    expect((await sessionRepository.getByCharacterId(complete.id))?.data.presetSnapshot?.name)
      .toBe("Historical snapshot");
    expect((await presetRepository.getById(global.id))?.data.name).toBe("Current global");
  });
});
