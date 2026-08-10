import { z } from "zod";

import { characteristicValuesSchema } from "./attribute";
import { settingIdSchema } from "./setting";
import { characterSkillsSchema } from "./skill";

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
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
export type CharacterResources = z.infer<typeof characterResourcesSchema>;
