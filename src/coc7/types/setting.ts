import { z } from "zod";

export const settingIds = [
  "standard",
  "gaslight",
  "down-darker-trails",
  "dark-ages",
  "regency",
] as const;

// This schema is a compatibility boundary for persisted domain data and v1 files.
// It is intentionally broader than the product's currently supported creation scope.
export const settingIdSchema = z.enum(settingIds);

export type SettingId = z.infer<typeof settingIdSchema>;

export const supportedSettingIds = ["standard"] as const satisfies readonly SettingId[];

export type SupportedSettingId = (typeof supportedSettingIds)[number];

export function isSupportedSetting(settingId: string): settingId is SupportedSettingId {
  return supportedSettingIds.some((supportedId) => supportedId === settingId);
}
