import { z } from "zod";

import { attributeIdSchema } from "./attribute";
import { sourceReferenceSchema } from "./source";

export const occupationCategoryIds = [
  "academic",
  "media-art",
  "medical",
  "business-professional",
  "technical-labor",
  "investigation-security",
  "outdoor-adventure",
  "military-government-law",
  "religion-occult",
  "criminal-underworld",
  "social-special",
] as const;

export const occupationCategoryIdSchema = z.enum(occupationCategoryIds);
export const occupationTagIdSchema = z.string().min(1);
export const eraIdSchema = z.string().min(1);

export const attributeFormulaSchema = z
  .object({
    type: z.literal("attribute"),
    attribute: attributeIdSchema,
    multiplier: z.number().finite().positive(),
  })
  .strict();

export const bestOfFormulaSchema = z
  .object({
    type: z.literal("best-of"),
    attributes: z.array(attributeIdSchema).min(2),
    multiplier: z.number().finite().positive(),
  })
  .strict();

export interface SumFormula {
  readonly type: "sum";
  readonly terms: readonly OccupationPointFormula[];
}

export type AttributeFormula = z.infer<typeof attributeFormulaSchema>;
export type BestOfFormula = z.infer<typeof bestOfFormulaSchema>;
export type OccupationPointFormula = AttributeFormula | BestOfFormula | SumFormula;

export const occupationPointFormulaSchema: z.ZodType<OccupationPointFormula> = z.lazy(() =>
  z.discriminatedUnion("type", [
    attributeFormulaSchema,
    bestOfFormulaSchema,
    z
      .object({
        type: z.literal("sum"),
        terms: z.array(occupationPointFormulaSchema).min(2),
      })
      .strict(),
  ]),
);

const fixedSkillRequirementSchema = z
  .object({
    type: z.literal("fixed"),
    skillId: z.string().min(1),
  })
  .strict();

const choiceRequirementSchema = z
  .object({
    type: z.literal("choice"),
    skillIds: z.array(z.string().min(1)).min(2),
    choose: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.choose <= value.skillIds.length, {
    message: "choose 不能超过候选技能数",
    path: ["choose"],
  });

const groupChoiceRequirementSchema = z
  .object({
    type: z.literal("group-choice"),
    groupId: z.string().min(1),
    choose: z.number().int().positive(),
  })
  .strict();

const anySkillRequirementSchema = z
  .object({
    type: z.literal("any"),
    count: z.number().int().positive(),
    excludeSkillIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

const specializationRequirementSchema = z
  .object({
    type: z.literal("specialization"),
    skillId: z.string().min(1),
    specialization: z.string().min(1).optional(),
    allowPlayerChoice: z.boolean(),
  })
  .strict();

export const occupationSkillRequirementSchema = z.discriminatedUnion("type", [
  fixedSkillRequirementSchema,
  choiceRequirementSchema,
  groupChoiceRequirementSchema,
  anySkillRequirementSchema,
  specializationRequirementSchema,
]);

export type FixedSkillRequirement = z.infer<typeof fixedSkillRequirementSchema>;
export type ChoiceRequirement = z.infer<typeof choiceRequirementSchema>;
export type GroupChoiceRequirement = z.infer<typeof groupChoiceRequirementSchema>;
export type AnySkillRequirement = z.infer<typeof anySkillRequirementSchema>;
export type SpecializationRequirement = z.infer<typeof specializationRequirementSchema>;
export type OccupationSkillRequirement = z.infer<typeof occupationSkillRequirementSchema>;

export const attributePrerequisiteSchema = z
  .object({
    type: z.literal("attribute"),
    attribute: attributeIdSchema,
    operator: z.enum([">", ">=", "<", "<=", "=="]),
    value: z.number().finite(),
  })
  .strict();

export const occupationPrerequisiteSchema = z.discriminatedUnion("type", [
  attributePrerequisiteSchema,
]);

export type AttributePrerequisite = z.infer<typeof attributePrerequisiteSchema>;
export type OccupationPrerequisite = z.infer<typeof occupationPrerequisiteSchema>;

export const occupationSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    aliases: z.array(z.string().min(1)).optional(),
    category: occupationCategoryIdSchema,
    tags: z.array(occupationTagIdSchema).optional(),
    sources: z.array(sourceReferenceSchema).min(1),
    eras: z.array(eraIdSchema).min(1),
    creditRating: z
      .object({
        min: z.number().finite().nonnegative(),
        max: z.number().finite().nonnegative(),
      })
      .strict()
      .refine((value) => value.min <= value.max, {
        message: "最低信用评级不能高于最高信用评级",
        path: ["min"],
      }),
    pointFormula: occupationPointFormulaSchema,
    skillRequirements: z.array(occupationSkillRequirementSchema),
    prerequisites: z.array(occupationPrerequisiteSchema).optional(),
    keeperApproval: z.boolean().optional(),
    recommendedContacts: z.array(z.string().min(1)).optional(),
    summary: z.string().min(1).optional(),
  })
  .strict();

export type OccupationCategoryId = z.infer<typeof occupationCategoryIdSchema>;
export type OccupationTagId = z.infer<typeof occupationTagIdSchema>;
export type EraId = z.infer<typeof eraIdSchema>;
export type Occupation = z.infer<typeof occupationSchema>;
