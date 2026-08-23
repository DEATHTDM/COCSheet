import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
  await db.delete();
});

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
