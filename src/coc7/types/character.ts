import { z } from "zod";

import { characteristicValuesSchema } from "./attribute";
import { localizedSkillNameSchema, stableMachineIdSchema } from "./skill";
import { settingIdSchema } from "./setting";
import { characterSkillsSchema } from "./skill";
import { sourceReferenceSchema } from "./source";

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
