import { ref } from "vue";
import { defineStore } from "pinia";

import {
  calculateMaxHitPoints,
  deriveStandardCharacterValues,
} from "../../coc7/rules/derived";
import { characterRepository } from "../../db/repositories/characterRepository";
import type { CharacterRecord } from "../../db/records";

export const useCharacterStore = defineStore("characters", () => {
  const records = ref<CharacterRecord[]>([]);
  const current = ref<CharacterRecord>();
  const loading = ref(false);

  function synchronize(updated: CharacterRecord): CharacterRecord {
    current.value = updated;
    records.value = records.value.map((record) => (record.id === updated.id ? updated : record));
    return updated;
  }

  async function requireCharacter(id: string): Promise<CharacterRecord> {
    const existing = current.value?.id === id ? current.value : await characterRepository.getById(id);
    if (!existing) throw new Error(`调查员不存在：${id}`);
    return existing;
  }

  function requireResourceValue(value: number, label: string, maximum: number): void {
    requireNonNegativeInteger(value, label);
    if (value > maximum) {
      throw new RangeError(`${label} 必须为 0～${maximum} 的整数`);
    }
  }

  function requireNonNegativeInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`${label} 必须为非负整数`);
    }
  }

  async function loadList(): Promise<void> {
    loading.value = true;
    try {
      records.value = await characterRepository.list();
    } finally {
      loading.value = false;
    }
  }

  async function loadById(id: string): Promise<CharacterRecord | undefined> {
    const record = await characterRepository.getById(id);
    current.value = record;
    return record;
  }

  async function updateName(id: string, name: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);

    const updated = await characterRepository.update({ ...existing.data, name });
    return synchronize(updated);
  }

  async function ensureResourcesInitialized(id: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (character.resources || character.settingId !== "standard" ||
      character.age === undefined || !character.characteristics) {
      return synchronize(existing);
    }

    const derived = deriveStandardCharacterValues(character.age, character.characteristics);
    const updated = await characterRepository.update({
      ...character,
      resources: {
        hp: { current: derived.maxHp },
        mp: { current: derived.initialMp },
        san: { current: derived.initialSan },
      },
    });
    return synchronize(updated);
  }

  async function setCurrentHp(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources || !character.characteristics) throw new Error("调查员资源尚未初始化");
    const maximum = calculateMaxHitPoints(
      character.characteristics.CON,
      character.characteristics.SIZ,
    );
    requireResourceValue(value, "当前 HP", maximum);
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, hp: { current: value } },
    }));
  }

  async function setCurrentMp(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources) throw new Error("调查员资源尚未初始化");
    requireNonNegativeInteger(value, "当前 MP");
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, mp: { current: value } },
    }));
  }

  async function setCurrentSan(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources) throw new Error("调查员资源尚未初始化");
    requireResourceValue(value, "当前 SAN", 99);
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, san: { current: value } },
    }));
  }

  async function remove(id: string): Promise<void> {
    await characterRepository.remove(id);
    records.value = records.value.filter((record) => record.id !== id);
    if (current.value?.id === id) {
      current.value = undefined;
    }
  }

  return {
    records,
    current,
    loading,
    loadList,
    loadById,
    updateName,
    ensureResourcesInitialized,
    setCurrentHp,
    setCurrentMp,
    setCurrentSan,
    remove,
  };
});
