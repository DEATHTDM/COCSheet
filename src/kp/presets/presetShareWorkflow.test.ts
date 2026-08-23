// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CREATION_EXPERIENCE_MODE_STORAGE_KEY } from "../../app/preferences/creationExperiencePreference";
import { useCreationStore } from "../../creation/stores/creationStore";
import type { CreationPreset } from "../../creation/types/creationPreset";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { kpPresetRepository } from "../../db/repositories/kpPresetRepository";
import { decodeKPPresetShareToken, encodeKPPresetShareToken } from "./presetShare";

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

  it("treats a different local global Preset with the same ID as independent data", async () => {
    const localPreset: CreationPreset = {
      ...sharedPreset,
      name: "接收方本地同 ID 预设",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: false,
    };
    await kpPresetRepository.create(localPreset);
    const token = await encodeKPPresetShareToken(sharedPreset);
    const decoded = await decodeKPPresetShareToken(token);

    const characterId = await useCreationStore().start(decoded.settingId, decoded);
    const localAfterCreation = await kpPresetRepository.getById(sharedPreset.id);
    const session = await creationSessionRepository.getByCharacterId(characterId);

    expect(await db.kpPresets.count()).toBe(1);
    expect(localAfterCreation?.data).toEqual(localPreset);
    expect(session?.data.presetSnapshot).toEqual(sharedPreset);
    expect(session?.data.presetSnapshot).not.toEqual(localPreset);
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
