import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import type { Character } from "../../coc7/types/character";
import type { CreationSession } from "../../creation/types/creationSession";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { characterPortabilityRepository } from "../../db/repositories/characterPortabilityRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import {
  createPortableCharacterPackage,
  serializePortableCharacterPackage,
} from "../portableCharacterPackage";
import { usePortabilityStore } from "./portabilityStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
  vi.spyOn(Date, "now").mockReturnValue(1_234_567_890_000);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

function makeCharacter(id = "a0000000-0000-4000-8000-00000000000a"): Character {
  return {
    version: 1,
    id,
    name: "Store / Export",
    settingId: "standard",
    weapons: [{ id: crypto.randomUUID(), definitionId: "orphan-weapon" }],
  };
}

function makeSession(character: Character): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep: "background",
    presetSnapshot: {
      version: 1,
      id: "a1000000-0000-4000-8000-00000000000a",
      name: "Session 内快照",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: "keeper-approval",
    },
  };
}

describe("Portability Store", () => {
  it("exportCharacter 读取最新持久化 Character-only 数据并返回安全下载 metadata", async () => {
    const character = makeCharacter();
    await characterRepository.create(character);
    await characterRepository.update({ ...character, name: "最新姓名" });

    const exported = await usePortabilityStore().exportCharacter(character.id);
    const parsed = JSON.parse(exported.text) as Record<string, unknown>;

    expect(exported.characterName).toBe("最新姓名");
    expect(exported.hasCreationSession).toBe(false);
    expect(exported.mimeType).toBe("application/json;charset=utf-8");
    expect(exported.filename).toBe("COCSheet-最新姓名-a0000000.cocsheet.json");
    expect(parsed).not.toHaveProperty("createdAt");
    expect(parsed).not.toHaveProperty("updatedAt");
    expect(parsed.character).not.toHaveProperty("createdAt");
    expect(parsed.exportedAt).toBe(1_234_567_890_000);
  });

  it("exportCharacter 携带完整 Session，但 presetSnapshot 不写入 kpPresets", async () => {
    const character = makeCharacter();
    const session = makeSession(character);
    await creationWorkflowRepository.createCharacterWithSession(character, session);

    const exported = await usePortabilityStore().exportCharacter(character.id);
    const parsed = JSON.parse(exported.text) as { creationSession?: CreationSession };

    expect(exported.hasCreationSession).toBe(true);
    expect(parsed.creationSession).toEqual(session);
    expect(await db.kpPresets.count()).toBe(0);
  });

  it("importCharacterText 返回 identity、设置 success，并保持 no-session", async () => {
    const character = makeCharacter();
    const text = serializePortableCharacterPackage(
      createPortableCharacterPackage(character, undefined, 1),
    );
    const store = usePortabilityStore();

    const result = await store.importCharacterText(text);

    expect(result).toEqual({
      characterId: character.id,
      characterName: character.name,
      hasCreationSession: false,
    });
    expect(store.importStatus).toBe("success");
    expect(store.importMessage).toContain("该文件不含建卡进度");
    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
    expect(await creationSessionRepository.getByCharacterId(character.id)).toBeUndefined();
  });

  it("Character + Session import 保留 currentStep 与 presetSnapshot，不创建 global KP Preset", async () => {
    const character = makeCharacter();
    const session = makeSession(character);
    const store = usePortabilityStore();
    const snapshot = session.presetSnapshot;
    if (!snapshot) throw new Error("测试 Session 缺少 presetSnapshot");
    await db.kpPresets.add({
      id: snapshot.id,
      version: 1,
      name: "本地同 ID 预设",
      updatedAt: 10,
      data: { ...snapshot, name: "本地同 ID 预设" },
    });

    await store.importCharacterText(serializePortableCharacterPackage(
      createPortableCharacterPackage(character, session, 1),
    ));

    expect((await creationSessionRepository.getByCharacterId(character.id))?.data).toEqual(session);
    expect(await db.kpPresets.count()).toBe(1);
    expect((await db.kpPresets.get(snapshot.id))?.name).toBe("本地同 ID 预设");
  });

  it("invalid package 在进入 Repository 前失败并产生零写入", async () => {
    const importSpy = vi.spyOn(characterPortabilityRepository, "importCharacterPackage");
    const store = usePortabilityStore();

    await expect(store.importCharacterText("not-json")).rejects.toThrow("文件不是合法 JSON");

    expect(store.importStatus).toBe("error");
    expect(store.importMessage).toBe("文件不是合法 JSON。");
    expect(importSpy).not.toHaveBeenCalled();
    expect(await db.characters.count()).toBe(0);
    expect(await db.creationSessions.count()).toBe(0);
  });

  it("collision 与 repository write failure 提供可读错误并允许 reset", async () => {
    const character = makeCharacter();
    const text = serializePortableCharacterPackage(
      createPortableCharacterPackage(character, undefined, 1),
    );
    const store = usePortabilityStore();
    await store.importCharacterText(text);
    await expect(store.importCharacterText(text)).rejects.toThrow("为保护现有资料，本次没有导入");
    expect(store.importMessage).toContain("本地已经有这张调查员人物卡");

    await characterRepository.remove(character.id);
    vi.spyOn(characterPortabilityRepository, "importCharacterPackage")
      .mockRejectedValueOnce(new Error("磁盘写入中断"));
    await expect(store.importCharacterText(text)).rejects.toThrow("磁盘写入中断");
    expect(store.importMessage).toBe("人物文件写入本地数据库失败：磁盘写入中断");

    store.resetImportStatus();
    expect(store.importStatus).toBe("idle");
    expect(store.importMessage).toBe("");
  });
});
