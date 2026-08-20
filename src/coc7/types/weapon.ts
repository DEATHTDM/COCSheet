import { z } from "zod";

import {
  skillDefinitionIdSchema,
  skillSpecializationIdSchema,
  stableMachineIdSchema,
} from "./skill";
import { sourceReferenceSchema } from "./source";

export const weaponCategoryIds = [
  "melee-other",
  "handgun",
  "rifle",
  "shotgun",
  "assault-rifle",
  "submachine-gun",
  "machine-gun",
  "explosive-heavy-other",
] as const;

export const weaponCategoryIdSchema = z.enum(weaponCategoryIds);
export const weaponEraAvailabilitySchema = z.enum([
  "available",
  "rare",
  "unavailable",
]);

export const weaponSkillRefSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("standard"),
      definitionId: skillDefinitionIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("predefined"),
      definitionId: skillDefinitionIdSchema,
      specializationId: skillSpecializationIdSchema,
    })
    .strict(),
]);

const nonBlankDisplayTextSchema = z.string().trim().min(1);

export const weaponDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: stableMachineIdSchema,
    name: z
      .object({
        zh: nonBlankDisplayTextSchema,
        en: nonBlankDisplayTextSchema.optional(),
      })
      .strict(),
    category: weaponCategoryIdSchema,
    skillRef: weaponSkillRefSchema,
    damage: nonBlankDisplayTextSchema,
    impales: z.boolean(),
    baseRange: nonBlankDisplayTextSchema,
    attacksPerRound: nonBlankDisplayTextSchema,
    capacity: nonBlankDisplayTextSchema.optional(),
    price: z
      .object({
        classic1920s: nonBlankDisplayTextSchema.optional(),
        modern: nonBlankDisplayTextSchema.optional(),
      })
      .strict()
      .refine((price) => price.classic1920s !== undefined || price.modern !== undefined, {
        message: "武器参考价格至少需要一个时代的显示值",
      })
      .optional(),
    malfunction: z.number().int().min(1).max(100).optional(),
    availability: z
      .object({
        classic1920s: weaponEraAvailabilitySchema,
        modern: weaponEraAvailabilitySchema,
      })
      .strict(),
    notes: z.array(nonBlankDisplayTextSchema).optional(),
    sourceRefs: z.array(sourceReferenceSchema).min(1),
  })
  .strict();

export type WeaponCategoryId = z.infer<typeof weaponCategoryIdSchema>;
export type WeaponEraAvailability = z.infer<typeof weaponEraAvailabilitySchema>;
export type WeaponSkillRef = z.infer<typeof weaponSkillRefSchema>;
export type WeaponDefinition = z.infer<typeof weaponDefinitionSchema>;
