import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useCharacterStore } from "../../app/stores/characterStore";
import type { Character } from "../../coc7/types/character";
import { useCreationStore } from "../../creation/stores/creationStore";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type { CreationSession } from "../../creation/types/creationSession";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import { kpPresetRepository } from "../../db/repositories/kpPresetRepository";
import { libraryPortabilityRepository } from "../../db/repositories/libraryPortabilityRepository";
import { usePresetStore } from "../../kp/presets/presetStore";
import {
  createPortableLibraryPackage,
  serializePortableLibraryPackage,
} from "../portableLibraryPackage";
import { useLibraryPortabilityStore } from "./libraryPortabilityStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
  vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 7, 23, 14, 20, 0));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

function makeCharacter(name: string, id = crypto.randomUUID()): Character {
  return { version: 1, id, name, settingId: "standard" };
}

function makeSession(character: Character): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep: "review",
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

describe("Library Portability Store", () => {
  it("exportLibrary 返回 counts、独立 filename 与无 Record metadata 的合法文本", async () => {
    const withSession = makeCharacter("With Session");
    const noSession = makeCharacter("No Session");
    const preset = makePreset("Preset");
    await creationWorkflowRepository.createCharacterWithSession(withSession, makeSession(withSession));
    await characterRepository.create(noSession);
    await kpPresetRepository.create(preset);

    const exported = await useLibraryPortabilityStore().exportLibrary();
    const parsed = JSON.parse(exported.text) as Record<string, unknown>;

    expect(exported).toMatchObject({
      characterCount: 2,
      sessionCount: 1,
      kpPresetCount: 1,
      filename: "COCSheet-Library-20260823-142000.cocsheet-backup.json",
      mimeType: "application/json;charset=utf-8",
    });
    expect(parsed.format).toBe("cocsheet-library");
    expect(exported.text).not.toContain('"updatedAt"');
    expect(exported.text).not.toContain('"createdAt"');
  });

  it("importLibraryText 成功后刷新 Character、Session 与 Preset 三个 Store 并显示 counts", async () => {
    const character = makeCharacter("Imported");
    const preset = makePreset("Imported preset");
    const store = useLibraryPortabilityStore();
    const characterStore = useCharacterStore();
    const creationStore = useCreationStore();
    const presetStore = usePresetStore();
    const loadCharacters = vi.spyOn(characterStore, "loadList");
    const loadSessions = vi.spyOn(creationStore, "loadSessionSteps");
    const loadPresets = vi.spyOn(presetStore, "loadList");

    const summary = await store.importLibraryText(serializePortableLibraryPackage(
      createPortableLibraryPackage(
        [{ character, creationSession: makeSession(character) }],
        [preset],
        1,
      ),
    ));

    expect(summary).toEqual({ characterCount: 1, sessionCount: 1, kpPresetCount: 1 });
    expect(store.importStatus).toBe("success");
    expect(store.importMessage).toBe("已导入 1 名调查员、1 个建卡会话和 1 个 KP 预设。");
    expect(loadCharacters).toHaveBeenCalledTimes(1);
    expect(loadSessions).toHaveBeenCalledTimes(1);
    expect(loadPresets).toHaveBeenCalledTimes(1);
    expect(characterStore.records[0]?.data).toEqual(character);
    expect(creationStore.sessionSteps[character.id]).toBe("review");
    expect(presetStore.records[0]?.data).toEqual(preset);
  });

  it("single-character file 由 Library importer 明确拒绝且 Repository 零调用", async () => {
    const importSpy = vi.spyOn(libraryPortabilityRepository, "importLibraryPackage");
    const store = useLibraryPortabilityStore();
    await expect(store.importLibraryText(JSON.stringify({
      format: "cocsheet-character",
      formatVersion: 1,
    }))).rejects.toThrow("这不是 COCSheet 完整备份文件");
    expect(store.importStatus).toBe("error");
    expect(importSpy).not.toHaveBeenCalled();
    expect(await db.characters.count()).toBe(0);
  });

  it("collision 保留整份未导入并可 reset 独立 library state", async () => {
    const character = makeCharacter("Collision");
    await characterRepository.create(character);
    const text = serializePortableLibraryPackage(createPortableLibraryPackage(
      [{ character }, { character: makeCharacter("Otherwise valid") }],
      [makePreset("Otherwise valid")],
      1,
    ));
    const store = useLibraryPortabilityStore();
    await expect(store.importLibraryText(text)).rejects.toThrow("整份完整备份未导入");
    expect(store.importMessage).toContain("相同 ID");
    expect(await db.characters.count()).toBe(1);
    expect(await db.kpPresets.count()).toBe(0);
    store.resetImportStatus();
    expect(store.importStatus).toBe("idle");
    expect(store.importMessage).toBe("");
  });

  it("orphan Session export 产生明确可读错误且不清理 Session", async () => {
    const missing = makeCharacter("Missing");
    await creationSessionRepository.create(makeSession(missing));
    await expect(useLibraryPortabilityStore().exportLibrary()).rejects.toThrow(
      "本地存在没有对应调查员的建卡会话",
    );
    expect(await db.creationSessions.count()).toBe(1);
  });

  it("Repository write failure 显示数据库失败且三表不写入", async () => {
    const character = makeCharacter("Failure");
    const text = serializePortableLibraryPackage(createPortableLibraryPackage(
      [{ character }],
      [],
      1,
    ));
    vi.spyOn(libraryPortabilityRepository, "importLibraryPackage")
      .mockRejectedValueOnce(new Error("模拟数据库中断"));
    const store = useLibraryPortabilityStore();
    await expect(store.importLibraryText(text)).rejects.toThrow("模拟数据库中断");
    expect(store.importMessage).toBe("完整备份写入本地数据库失败：模拟数据库中断");
    expect(await Promise.all([db.characters.count(), db.creationSessions.count(), db.kpPresets.count()]))
      .toEqual([0, 0, 0]);
  });
});
