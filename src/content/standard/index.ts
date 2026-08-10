import type { SettingPack } from "../../coc7/types/settingPack";
import { standardSkillDefinitions } from "./skills";

export const standardSettingPack: SettingPack = {
  version: 1,
  id: "standard",
  name: "Standard COC7",
  occupations: [],
  skills: [...standardSkillDefinitions],
};
