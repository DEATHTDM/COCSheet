// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CREATION_EXPERIENCE_MODE_STORAGE_KEY } from "../../app/preferences/creationExperiencePreference";
import { useCreationStore } from "../../creation/stores/creationStore";
import type { CreationPreset } from "../../creation/types/creationPreset";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { kpPresetRepository } from "../../db/repositories/kpPresetRepository";
import { libraryPortabilityRepository } from "../../db/repositories/libraryPortabilityRepository";
import { decodeKPPresetShareToken, encodeKPPresetShareToken } from "./presetShare";
import { usePresetStore } from "./presetStore";

const sharedPreset: CreationPreset = {
  version: 1,
  id: "b3000000-0000-4000-8000-000000000001",
  name: "Standard 共享建卡预设",
  settingId: "standard",
  attributeGeneration: {
    allowedMethods: ["assign-roll", "point-buy"],
    assignRoll: { intMin: 45, sizMin: 45 },
    pointBuy: { total: 480, min: 20, max: 85, intMin: 45, sizMin: 45 },
  },
  skillCaps: { occupation: 70, overall: 85 },
  skillLimits: { maxOccupationSkillFinalValue: 75, maxSkillFinalValue: 85 },
  occupationPolicy: { approvalRequiredOccupationIds: ["private-investigator"] },
  allowCustomOccupation: "keeper-approval",
  age: { min: 21, max: 60 },
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  window.localStorage.clear();
  setActivePinia(createPinia());
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

describe("shared KP Preset real CreationStore workflow", () => {
  it("performs zero IndexedDB writes while opening, then creates exact Character + Session snapshot explicitly", async () => {
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");
    const token = await encodeKPPresetShareToken(sharedPreset);
    const decoded = await decodeKPPresetShareToken(token);

    expect(await db.characters.count()).toBe(0);
    expect(await db.creationSessions.count()).toBe(0);
    expect(await db.kpPresets.count()).toBe(0);
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("quick");

    const characterId = await useCreationStore().start(decoded.settingId, decoded);
    const character = await characterRepository.getById(characterId);
    const session = await creationSessionRepository.getByCharacterId(characterId);

    expect(await db.characters.count()).toBe(1);
    expect(await db.creationSessions.count()).toBe(1);
    expect(await db.kpPresets.count()).toBe(0);
    expect(character?.data.settingId).toBe("standard");
    expect(session?.data.presetSnapshot).toEqual(decoded);
    expect(session?.data.presetSnapshot?.id).toBe(sharedPreset.id);
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("quick");
  });

  it("saves a fresh copy beside a same-ID local Preset while direct and later-local creation keep distinct snapshot identities", async () => {
    const localPreset: CreationPreset = {
      ...sharedPreset,
      name: "接收方本地同 ID 预设",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: false,
    };
    await kpPresetRepository.create(localPreset);
    const savedCopyId = "b3000000-0000-4000-8000-000000000002";
    const sharedCharacterId = "b3000000-0000-4000-8000-000000000003";
    const localCharacterId = "b3000000-0000-4000-8000-000000000004";
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(savedCopyId)
      .mockReturnValueOnce(sharedCharacterId)
      .mockReturnValueOnce(localCharacterId);
    const token = await encodeKPPresetShareToken(sharedPreset);
    const decoded = await decodeKPPresetShareToken(token);

    const savedCopy = await usePresetStore().createFromSharedPreset(decoded);
    expect(await db.characters.count()).toBe(0);
    expect(await db.creationSessions.count()).toBe(0);
    expect(await db.kpPresets.count()).toBe(2);

    const directCharacterId = await useCreationStore().start(decoded.settingId, decoded);
    const laterLocalCharacterId = await useCreationStore().start(
      savedCopy.data.settingId,
      savedCopy.data,
    );
    const localAfterCreation = await kpPresetRepository.getById(sharedPreset.id);
    const savedAfterCreation = await kpPresetRepository.getById(savedCopyId);
    const libraryData = await libraryPortabilityRepository.readLibraryPackageData();
    const directSession = await creationSessionRepository.getByCharacterId(directCharacterId);
    const laterLocalSession = await creationSessionRepository.getByCharacterId(laterLocalCharacterId);

    expect(directCharacterId).toBe(sharedCharacterId);
    expect(laterLocalCharacterId).toBe(localCharacterId);
    expect(await db.kpPresets.count()).toBe(2);
    expect(localAfterCreation?.data).toEqual(localPreset);
    expect(savedAfterCreation?.data).toEqual({ ...sharedPreset, id: savedCopyId });
    expect(libraryData.kpPresets).toHaveLength(2);
    expect(libraryData.kpPresets).toEqual(expect.arrayContaining([localPreset, savedCopy.data]));
    expect(directSession?.data.presetSnapshot).toEqual(sharedPreset);
    expect(directSession?.data.presetSnapshot?.id).toBe(sharedPreset.id);
    expect(laterLocalSession?.data.presetSnapshot).toEqual(savedCopy.data);
    expect(laterLocalSession?.data.presetSnapshot?.id).toBe(savedCopyId);
  });

  it("decodes a historical non-Standard v1 token but rejects creation with zero writes", async () => {
    const historicalPreset: CreationPreset = {
      ...sharedPreset,
      name: "Gaslight 历史共享预设",
      settingId: "gaslight",
    };
    const decoded = await decodeKPPresetShareToken(
      await encodeKPPresetShareToken(historicalPreset),
    );

    expect(decoded).toEqual(historicalPreset);
    await expect(useCreationStore().start(decoded.settingId, decoded))
      .rejects.toThrow("当前版本不支持该建卡环境");
    expect(await db.characters.count()).toBe(0);
    expect(await db.creationSessions.count()).toBe(0);
    expect(await db.kpPresets.count()).toBe(0);
  });
});
