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
    occupationName: z.string().min(1).optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    data: characterSchema,
  })
  .strict()
  .refine((record) => record.id === record.data.id, {
    message: "记录 ID 与人物数据 ID 不一致",
    path: ["data", "id"],
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
  });

export type CharacterRecord = z.infer<typeof characterRecordSchema>;
export type CreationSessionRecord = z.infer<typeof creationSessionRecordSchema>;
export type KPPresetRecord = z.infer<typeof kpPresetRecordSchema>;
