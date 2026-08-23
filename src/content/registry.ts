import type { SettingPack } from "../coc7/types/settingPack";
import { settingPackSchema } from "../coc7/types/settingPack";
import { settingIdSchema, type SettingId } from "../coc7/types/setting";
import { standardSettingPack } from "./standard";

const supportedSettingPacks = [standardSettingPack]
  .map((pack) => settingPackSchema.parse(pack));

const settingRegistry = new Map<SettingId, SettingPack>(
  supportedSettingPacks.map((pack) => [pack.id, pack]),
);

export function getSettingPack(settingId: string): SettingPack | undefined {
  const result = settingIdSchema.safeParse(settingId);
  return result.success ? settingRegistry.get(result.data) : undefined;
}

export function getAvailableSettings(): readonly SettingPack[] {
  return supportedSettingPacks;
}

export function hasSupportedSettingPack(settingId: string): boolean {
  return getSettingPack(settingId) !== undefined;
}

export function getSettingPackOrThrow(settingId: string): SettingPack {
  const pack = getSettingPack(settingId);
  if (!pack) {
    throw new Error(`当前版本不支持该建卡环境：${settingId}`);
  }

  return pack;
}
