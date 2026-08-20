import { z } from "zod";

import { characteristicValuesSchema } from "./attribute";
import { localizedSkillNameSchema, stableMachineIdSchema } from "./skill";
import { settingIdSchema } from "./setting";
import { characterSkillsSchema } from "./skill";
import { sourceReferenceSchema } from "./source";
import { eraIdSchema } from "./occupation";

export const backstoryCategoryIds = [
  "personal-description",
  "ideology-beliefs",
  "significant-people",
  "meaningful-locations",
  "treasured-possessions",
  "traits",
  "injuries-scars",
  "phobias-manias",
  "arcane-tomes-spells-artifacts",
  "encounters",
] as const;

export const backstoryCategoryIdSchema = z.enum(backstoryCategoryIds);

export const backstoryEntrySchema = z
  .object({
    id: z.string().uuid(),
    category: backstoryCategoryIdSchema,
    text: z.string().trim().min(1, "背景条目不能为空"),
  })
  .strict();

export const characterBackstorySchema = z
  .object({
    entries: z.array(backstoryEntrySchema),
    keyConnectionEntryId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((backstory, context) => {
    const entryIds = new Set<string>();
    backstory.entries.forEach((entry, index) => {
      if (entryIds.has(entry.id)) {
        context.addIssue({
          code: "custom",
          message: "背景条目 ID 必须唯一",
          path: ["entries", index, "id"],
        });
      }
      entryIds.add(entry.id);
    });
    if (backstory.keyConnectionEntryId && !entryIds.has(backstory.keyConnectionEntryId)) {
      context.addIssue({
        code: "custom",
        message: "关键连接必须引用当前存在的背景条目",
        path: ["keyConnectionEntryId"],
      });
    }
  });

const identityDetailSchema = z.string().trim().min(1, "人物信息不能为空");

export const characterOccupationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog"),
    id: stableMachineIdSchema,
    displayNameSnapshot: localizedSkillNameSchema,
    variantOf: stableMachineIdSchema.optional(),
    sourceRefs: z.array(sourceReferenceSchema).optional(),
  }).strict(),
  z.object({
    kind: z.literal("custom"),
    id: z.string().uuid(),
    displayNameSnapshot: localizedSkillNameSchema,
    sourceRefs: z.array(sourceReferenceSchema).optional(),
  }).strict(),
]);

const currentResourceSchema = z
  .object({
    current: z.number().int().nonnegative(),
  })
  .strict();

const currentSanityResourceSchema = z
  .object({
    current: z.number().int().min(0).max(99),
  })
  .strict();

export const characterResourcesSchema = z
  .object({
    hp: currentResourceSchema,
    mp: currentResourceSchema,
    san: currentSanityResourceSchema,
  })
  .strict();

export const characterSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    name: z.string(),
    settingId: settingIdSchema,
    eraId: eraIdSchema.optional(),
    sex: identityDetailSchema.optional(),
    residence: identityDetailSchema.optional(),
    birthplace: identityDetailSchema.optional(),
    backstory: characterBackstorySchema.optional(),
    age: z.number().int().nonnegative().optional(),
    characteristics: characteristicValuesSchema.optional(),
    luck: z.number().int().min(0).max(99).optional(),
    resources: characterResourcesSchema.optional(),
    skills: characterSkillsSchema.optional(),
    occupation: characterOccupationSchema.optional(),
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
export type CharacterResources = z.infer<typeof characterResourcesSchema>;
export type CharacterOccupation = z.infer<typeof characterOccupationSchema>;
export type BackstoryCategoryId = z.infer<typeof backstoryCategoryIdSchema>;
export type BackstoryEntry = z.infer<typeof backstoryEntrySchema>;
export type CharacterBackstory = z.infer<typeof characterBackstorySchema>;
