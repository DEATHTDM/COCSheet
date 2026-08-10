import { ref } from "vue";
import { defineStore } from "pinia";

import type { Character } from "../../coc7/types/character";
import type { SettingId } from "../../coc7/types/setting";
import { getSettingPackOrThrow } from "../../content/registry";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import type { CreationSession } from "../types/creationSession";

export const useCreationStore = defineStore("creation", () => {
  const creating = ref(false);

  async function start(settingId: SettingId): Promise<string> {
    getSettingPackOrThrow(settingId);
    creating.value = true;

    try {
      const characterId = crypto.randomUUID();
      const character: Character = {
        version: 1,
        id: characterId,
        name: "未命名调查员",
        settingId,
      };
      const session: CreationSession = {
        version: 1,
        characterId,
        settingId,
        currentStep: "basic-info",
      };

      await creationWorkflowRepository.createCharacterWithSession(character, session);
      return characterId;
    } finally {
      creating.value = false;
    }
  }

  return { creating, start };
});
