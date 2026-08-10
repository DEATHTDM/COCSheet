import type { SettingPack } from "../coc7/types/settingPack";
import { settingPackSchema } from "../coc7/types/settingPack";
import { settingIdSchema, type SettingId } from "../coc7/types/setting";
import { darkAgesSettingPack } from "./dark-ages";
import { downDarkerTrailsSettingPack } from "./down-darker-trails";
import { gaslightSettingPack } from "./gaslight";
import { regencySettingPack } from "./regency";
import { standardSettingPack } from "./standard";

const settingPacks = [
  standardSettingPack,
  gaslightSettingPack,
  downDarkerTrailsSettingPack,
  darkAgesSettingPack,
  regencySettingPack,
].map((pack) => settingPackSchema.parse(pack));

const settingRegistry = new Map<SettingId, SettingPack>(
  settingPacks.map((pack) => [pack.id, pack]),
);

export function getSettingPack(settingId: string): SettingPack | undefined {
  const result = settingIdSchema.safeParse(settingId);
  return result.success ? settingRegistry.get(result.data) : undefined;
}

export function getAvailableSettings(): readonly SettingPack[] {
  return settingPacks;
}

export function hasSetting(settingId: string): boolean {
  return getSettingPack(settingId) !== undefined;
}

export function getSettingPackOrThrow(settingId: string): SettingPack {
  const pack = getSettingPack(settingId);
  if (!pack) {
    throw new Error(`未知建卡环境：${settingId}`);
  }

  return pack;
}
