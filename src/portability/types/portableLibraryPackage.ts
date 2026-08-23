import { z } from "zod";

import { characterSchema } from "../../coc7/types/character";
import { creationPresetSchema } from "../../creation/types/creationPreset";
import { creationSessionSchema } from "../../creation/types/creationSession";

export const portableCharacterEntrySchema = z
  .object({
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

export const portableLibraryPackageV1Schema = z
  .object({
    format: z.literal("cocsheet-library"),
    formatVersion: z.literal(1),
    exportedAt: z.number().int().nonnegative(),
    characterEntries: z.array(portableCharacterEntrySchema),
    kpPresets: z.array(creationPresetSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const characterIds = new Set<string>();
    for (const [index, entry] of value.characterEntries.entries()) {
      if (characterIds.has(entry.character.id)) {
        context.addIssue({
          code: "custom",
          message: "完整备份中的调查员 ID 必须唯一",
          path: ["characterEntries", index, "character", "id"],
        });
      }
      characterIds.add(entry.character.id);
    }

    const presetIds = new Set<string>();
    for (const [index, preset] of value.kpPresets.entries()) {
      if (presetIds.has(preset.id)) {
        context.addIssue({
          code: "custom",
          message: "完整备份中的 KP 预设 ID 必须唯一",
          path: ["kpPresets", index, "id"],
        });
      }
      presetIds.add(preset.id);
    }
  });

export type PortableCharacterEntry = z.infer<typeof portableCharacterEntrySchema>;
export type PortableLibraryPackageV1 = z.infer<typeof portableLibraryPackageV1Schema>;
