import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreationPreset } from "../../creation/types/creationPreset";
import { db } from "../../db/database";
import { kpPresetRepository } from "../../db/repositories/kpPresetRepository";
import { usePresetStore } from "./presetStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

const sharedPreset: CreationPreset = {
  version: 1,
  id: "b4000000-0000-4000-8000-000000000010",
  name: "朋友的完整预设",
  settingId: "standard",
  attributeGeneration: {
    allowedMethods: ["assign-roll", "point-buy"],
    assignRoll: { intMin: 45, sizMin: 50 },
    pointBuy: { total: 480, min: 20, max: 85, intMin: 45, sizMin: 50 },
  },
  skillCaps: { occupation: 70 },
  skillLimits: { maxOccupationSkillFinalValue: 75, maxSkillFinalValue: 85 },
  occupationPolicy: {
    bannedOccupationIds: ["criminal-keeper-rulebook"],
    approvalRequiredOccupationIds: ["private-investigator"],
  },
  allowCustomOccupation: "keeper-approval",
  age: { min: 21, max: 60 },
};

describe("KP Preset supported Setting boundary", () => {
  it("creates new presets as Standard only", async () => {
    const record = await usePresetStore().createDefault();

    expect(record.data.settingId).toBe("standard");
    expect((await kpPresetRepository.getById(record.id))?.data.settingId).toBe("standard");
  });

  it("keeps historical presets readable and deletable but refuses save conversion or edits", async () => {
    const historical: CreationPreset = {
      version: 1,
      id: "b4000000-0000-4000-8000-000000000001",
      name: "Gaslight 历史预设",
      settingId: "gaslight",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: false,
    };
    await kpPresetRepository.create(historical);
    const store = usePresetStore();

    expect((await store.loadById(historical.id))?.data).toEqual(historical);
    await expect(store.save({ ...historical, name: "不应写入" }))
      .rejects.toThrow("历史预设不能保存修改");
    expect((await kpPresetRepository.getById(historical.id))?.data).toEqual(historical);

    await store.remove(historical.id);
    expect(await kpPresetRepository.getById(historical.id)).toBeUndefined();
  });
});

describe("KP Preset shared local copy", () => {
  it("creates a fresh-ID ordinary local record while preserving every other field without mutating input", async () => {
    const localId = "b4000000-0000-4000-8000-000000000011";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(localId);
    const inputBefore = structuredClone(sharedPreset);

    const record = await usePresetStore().createFromSharedPreset(sharedPreset);

    expect(record.data).toEqual({ ...inputBefore, id: localId });
    expect(record.id).toBe(localId);
    expect(record.id).not.toBe(sharedPreset.id);
    expect(sharedPreset).toEqual(inputBefore);
    expect(record.data).not.toBe(sharedPreset);
    expect((await kpPresetRepository.getById(localId))?.data).toEqual(record.data);
    expect(usePresetStore().records).toEqual([record]);
  });

  it("rejects an unsupported historical shared preset before any repository write", async () => {
    const create = vi.spyOn(kpPresetRepository, "create");
    const historical = { ...sharedPreset, settingId: "gaslight" as const };

    await expect(usePresetStore().createFromSharedPreset(historical))
      .rejects.toThrow("当前不支持保存为新的本地预设");

    expect(create).not.toHaveBeenCalled();
    expect(await db.kpPresets.count()).toBe(0);
  });

  it("ignores a same-ID local collision and permits later explicit fresh copies without deduplication", async () => {
    const localCopyId = "b4000000-0000-4000-8000-000000000012";
    const reopenedCopyId = "b4000000-0000-4000-8000-000000000013";
    const localSameId: CreationPreset = {
      ...sharedPreset,
      name: "接收方原有同 ID 预设",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: false,
    };
    await kpPresetRepository.create(localSameId);
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(localCopyId)
      .mockReturnValueOnce(reopenedCopyId);
    const store = usePresetStore();
    await store.loadList();

    const firstCopy = await store.createFromSharedPreset(sharedPreset);
    const secondCopy = await store.createFromSharedPreset(sharedPreset);

    expect((await kpPresetRepository.getById(sharedPreset.id))?.data).toEqual(localSameId);
    expect(firstCopy.data).toEqual({ ...sharedPreset, id: localCopyId });
    expect(secondCopy.data).toEqual({ ...sharedPreset, id: reopenedCopyId });
    expect(firstCopy.id).not.toBe(secondCopy.id);
    expect(await db.kpPresets.count()).toBe(3);
  });
});
