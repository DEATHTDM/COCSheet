import { ref } from "vue";
import { defineStore } from "pinia";

import { isSupportedSetting } from "../../coc7/types/setting";
import type { CreationPreset } from "../../creation/types/creationPreset";
import { kpPresetRepository } from "../../db/repositories/kpPresetRepository";
import type { KPPresetRecord } from "../../db/records";

export const usePresetStore = defineStore("presets", () => {
  const records = ref<KPPresetRecord[]>([]);
  const current = ref<KPPresetRecord>();

  async function loadList(): Promise<void> {
    records.value = await kpPresetRepository.list();
  }

  async function loadById(id: string): Promise<KPPresetRecord | undefined> {
    const record = await kpPresetRepository.getById(id);
    current.value = record;
    return record;
  }

  async function createDefault(): Promise<KPPresetRecord> {
    const preset: CreationPreset = {
      version: 1,
      id: crypto.randomUUID(),
      name: "新建预设",
      settingId: "standard",
      attributeGeneration: {
        allowedMethods: ["standard-roll", "low-roll-boost", "assign-roll", "multi-roll", "point-buy", "manual"],
        multiRoll: { count: 3 },
        assignRoll: { intMin: 40, sizMin: 40 },
        pointBuy: { total: 460, min: 15, max: 90, intMin: 40, sizMin: 40 },
      },
      allowCustomOccupation: "keeper-approval",
    };
    const record = await kpPresetRepository.create(preset);
    records.value = [record, ...records.value];
    return record;
  }

  async function save(preset: CreationPreset): Promise<KPPresetRecord> {
    if (!isSupportedSetting(preset.settingId)) {
      throw new Error("该建卡环境当前不再支持新建，历史预设不能保存修改。");
    }
    const record = await kpPresetRepository.update(preset);
    current.value = record;
    records.value = records.value.map((item) => (item.id === record.id ? record : item));
    return record;
  }

  async function remove(id: string): Promise<void> {
    await kpPresetRepository.remove(id);
    records.value = records.value.filter((record) => record.id !== id);
    if (current.value?.id === id) {
      current.value = undefined;
    }
  }

  return {
    records,
    current,
    loadList,
    loadById,
    createDefault,
    save,
    remove,
  };
});
