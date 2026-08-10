import { defineStore } from "pinia";

import { getAvailableSettings, getSettingPack } from "../../content/registry";

export const useSettingStore = defineStore("settings", () => {
  const settings = getAvailableSettings();

  return {
    settings,
    getById: getSettingPack,
  };
});
