import { z } from "zod";

import { characterSchema } from "../../coc7/types/character";
import { creationSessionSchema } from "../../creation/types/creationSession";

export const portableCharacterPackageV1Schema = z
  .object({
    format: z.literal("cocsheet-character"),
    formatVersion: z.literal(1),
    exportedAt: z.number().int().nonnegative(),
    character: characterSchema,
    creationSession: creationSessionSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.creationSession) return;
    if (value.creationSession.characterId !== value.character.id) {
      context.addIssue({
        code: "custom",
        message: "调查员与建卡会话的人物 ID 不一致",
        path: ["creationSession", "characterId"],
      });
    }
    if (value.creationSession.settingId !== value.character.settingId) {
      context.addIssue({
        code: "custom",
        message: "调查员与建卡会话的 Setting 不一致",
        path: ["creationSession", "settingId"],
      });
    }
  });

export type PortableCharacterPackageV1 = z.infer<typeof portableCharacterPackageV1Schema>;
