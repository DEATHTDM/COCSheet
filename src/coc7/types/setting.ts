import { z } from "zod";

export const settingIds = [
  "standard",
  "gaslight",
  "down-darker-trails",
  "dark-ages",
  "regency",
] as const;

export const settingIdSchema = z.enum(settingIds);

export type SettingId = z.infer<typeof settingIdSchema>;
