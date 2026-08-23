import { defineStore } from "pinia";
import { ref } from "vue";

import {
  readCreationExperienceMode,
  writeCreationExperienceMode,
  type CreationExperienceMode,
} from "../preferences/creationExperiencePreference";

export const useUiPreferenceStore = defineStore("ui-preferences", () => {
  const creationExperienceMode = ref<CreationExperienceMode>(
    readCreationExperienceMode(),
  );

  function setCreationExperienceMode(mode: CreationExperienceMode): void {
    creationExperienceMode.value = mode;
    writeCreationExperienceMode(mode);
  }

  return {
    creationExperienceMode,
    setCreationExperienceMode,
  };
});
