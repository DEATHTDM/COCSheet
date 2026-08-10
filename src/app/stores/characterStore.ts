import { ref } from "vue";
import { defineStore } from "pinia";

import { characterRepository } from "../../db/repositories/characterRepository";
import type { CharacterRecord } from "../../db/records";

export const useCharacterStore = defineStore("characters", () => {
  const records = ref<CharacterRecord[]>([]);
  const current = ref<CharacterRecord>();
  const loading = ref(false);

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
    const existing = current.value?.id === id ? current.value : await characterRepository.getById(id);
    if (!existing) {
      throw new Error(`调查员不存在：${id}`);
    }

    const updated = await characterRepository.update({ ...existing.data, name });
    current.value = updated;
    records.value = records.value.map((record) => (record.id === id ? updated : record));
    return updated;
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
    remove,
  };
});
