import { z } from "zod";

import { characterSchema } from "../coc7/types/character";
import { settingIdSchema } from "../coc7/types/setting";
import { creationPresetSchema } from "../creation/types/creationPreset";
import { creationSessionSchema } from "../creation/types/creationSession";

export const characterRecordSchema = z
  .object({
    id: z.string().uuid(),
    version: z.literal(1),
    name: z.string(),
    settingId: settingIdSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    data: characterSchema,
  })
  .strict()
  .refine((record) => record.id === record.data.id, {
    message: "记录 ID 与人物数据 ID 不一致",
    path: ["data", "id"],
  })
  .refine((record) => record.name === record.data.name, {
    message: "记录姓名与人物数据姓名不一致",
    path: ["data", "name"],
  })
  .refine((record) => record.settingId === record.data.settingId, {
    message: "记录建卡环境与人物数据建卡环境不一致",
    path: ["data", "settingId"],
  });

export const creationSessionRecordSchema = z
  .object({
    characterId: z.string().uuid(),
    version: z.literal(1),
    updatedAt: z.number().int().nonnegative(),
    data: creationSessionSchema,
  })
  .strict()
  .refine((record) => record.characterId === record.data.characterId, {
    message: "记录人物 ID 与建卡会话人物 ID 不一致",
    path: ["data", "characterId"],
  });

export const kpPresetRecordSchema = z
  .object({
    id: z.string().uuid(),
    version: z.literal(1),
    name: z.string().min(1),
    updatedAt: z.number().int().nonnegative(),
    data: creationPresetSchema,
  })
  .strict()
  .refine((record) => record.id === record.data.id, {
    message: "记录 ID 与预设数据 ID 不一致",
    path: ["data", "id"],
  })
  .refine((record) => record.name === record.data.name, {
    message: "记录名称与预设数据名称不一致",
    path: ["data", "name"],
  });

export type CharacterRecord = z.infer<typeof characterRecordSchema>;
export type CreationSessionRecord = z.infer<typeof creationSessionRecordSchema>;
export type KPPresetRecord = z.infer<typeof kpPresetRecordSchema>;
