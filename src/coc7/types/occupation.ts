import { z } from "zod";

import { characteristicIdSchema } from "./attribute";
import {
  localizedSkillAliasesSchema,
  localizedSkillNameSchema,
  skillDefinitionIdSchema,
  skillSpecializationIdSchema,
  stableMachineIdSchema,
  type LocalizedSkillName,
  type SkillDefinitionId,
  type SkillSpecializationId,
} from "./skill";
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
export const occupationTagIdSchema = stableMachineIdSchema;
export const eraIdSchema = stableMachineIdSchema;

export const attributeFormulaSchema = z
  .object({
    type: z.literal("attribute"),
    attribute: characteristicIdSchema,
    multiplier: z.number().finite().positive(),
  })
  .strict();

export const bestOfFormulaSchema = z
  .object({
    type: z.literal("best-of"),
    attributes: z.array(characteristicIdSchema).min(2),
    multiplier: z.number().finite().positive(),
  })
  .strict()
  .superRefine((formula, context) => {
    const seen = new Set<string>();
    formula.attributes.forEach((attribute, index) => {
      if (seen.has(attribute)) {
        context.addIssue({
          code: "custom",
          message: `best-of 不能重复引用属性：${attribute}`,
          path: ["attributes", index],
        });
      }
      seen.add(attribute);
    });
  });

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

export interface SelectorCardinality {
  readonly min: number;
  readonly max?: number | undefined;
}

export interface ExactSkillSelector {
  readonly type: "exact";
  readonly ref:
    | { readonly type: "standard"; readonly definitionId: SkillDefinitionId }
    | {
      readonly type: "predefined";
      readonly definitionId: SkillDefinitionId;
      readonly specializationId: SkillSpecializationId;
    };
}

export interface SpecializationOfSkillSelector {
  readonly type: "specialization-of";
  readonly definitionId: SkillDefinitionId;
  readonly exclude?: readonly ExactSkillSelector["ref"][] | undefined;
}

export interface NamedCustomSpecializationSelector {
  readonly type: "named-custom-specialization";
  readonly definitionId: SkillDefinitionId;
  readonly name: LocalizedSkillName;
}

export type OneBranchChildSkillSelector =
  | ExactSkillSelector
  | SpecializationOfSkillSelector
  | NamedCustomSpecializationSelector;

export interface OneBranchSkillSelector {
  readonly type: "one-branch";
  readonly branches: readonly {
    readonly selector: OneBranchChildSkillSelector;
    readonly cardinality: SelectorCardinality;
  }[];
}

export interface OneOfSkillSelector {
  readonly type: "one-of";
  readonly selectors: readonly SkillSelector[];
}

export interface AnySkillSelector {
  readonly type: "any-skill";
  readonly exclude?: readonly SkillSelector[] | undefined;
}

export interface AllOfSkillSelector {
  readonly type: "all-of";
  readonly groups: readonly {
    readonly selector: SkillSelector;
    readonly cardinality: SelectorCardinality;
  }[];
}

export type SkillSelector =
  | ExactSkillSelector
  | SpecializationOfSkillSelector
  | NamedCustomSpecializationSelector
  | OneBranchSkillSelector
  | OneOfSkillSelector
  | AnySkillSelector
  | AllOfSkillSelector;

const selectorCardinalitySchema = z
  .object({
    min: z.number().int().positive(),
    max: z.number().int().positive().optional(),
  })
  .strict()
  .refine((value) => value.max === undefined || value.min <= value.max, {
    message: "selector cardinality 的 min 不能高于 max",
    path: ["min"],
  });

const exactSkillRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("standard"), definitionId: skillDefinitionIdSchema }).strict(),
  z.object({
    type: z.literal("predefined"),
    definitionId: skillDefinitionIdSchema,
    specializationId: skillSpecializationIdSchema,
  }).strict(),
]);

const oneBranchChildSkillSelectorSchema: z.ZodType<OneBranchChildSkillSelector> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("exact"), ref: exactSkillRefSchema }).strict(),
    z.object({
      type: z.literal("specialization-of"),
      definitionId: skillDefinitionIdSchema,
      exclude: z.array(exactSkillRefSchema).min(1).optional(),
    }).strict(),
    z.object({
      type: z.literal("named-custom-specialization"),
      definitionId: skillDefinitionIdSchema,
      name: localizedSkillNameSchema,
    }).strict(),
  ]);

export const skillSelectorSchema: z.ZodType<SkillSelector> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("exact"), ref: exactSkillRefSchema }).strict(),
    z.object({
      type: z.literal("specialization-of"),
      definitionId: skillDefinitionIdSchema,
      exclude: z.array(exactSkillRefSchema).min(1).optional(),
    }).strict(),
    z.object({
      type: z.literal("named-custom-specialization"),
      definitionId: skillDefinitionIdSchema,
      name: localizedSkillNameSchema,
    }).strict(),
    z.object({
      type: z.literal("one-branch"),
      branches: z.array(z.object({
        selector: oneBranchChildSkillSelectorSchema,
        cardinality: selectorCardinalitySchema,
      }).strict()).min(2),
    }).strict(),
    z.object({
      type: z.literal("one-of"),
      selectors: z.array(skillSelectorSchema).min(2),
    }).strict(),
    z.object({
      type: z.literal("any-skill"),
      exclude: z.array(skillSelectorSchema).min(1).optional(),
    }).strict(),
    z.object({
      type: z.literal("all-of"),
      groups: z.array(z.object({
        selector: skillSelectorSchema,
        cardinality: selectorCardinalitySchema,
      }).strict()).min(2),
    }).strict(),
  ]),
);

export const occupationRequirementSchema = z
  .object({
    id: stableMachineIdSchema,
    selector: skillSelectorSchema,
    cardinality: selectorCardinalitySchema,
    guidance: localizedSkillNameSchema.optional(),
    keeperReview: z.boolean().optional(),
  })
  .strict();

export const attributePrerequisiteSchema = z
  .object({
    type: z.literal("attribute"),
    attribute: characteristicIdSchema,
    operator: z.enum([">", ">=", "<", "<=", "=="]),
    value: z.number().finite(),
  })
  .strict();

export const occupationPrerequisiteSchema = z.discriminatedUnion("type", [
  attributePrerequisiteSchema,
]);

export const occupationEraAvailabilitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }).strict(),
  z.object({ type: z.literal("specific"), eraIds: z.array(eraIdSchema).min(1) }).strict(),
]);

export const occupationDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: z.union([stableMachineIdSchema, z.string().uuid()]),
    variantOf: stableMachineIdSchema.optional(),
    name: localizedSkillNameSchema,
    aliases: localizedSkillAliasesSchema.optional(),
    category: occupationCategoryIdSchema,
    tags: z.array(occupationTagIdSchema).optional(),
    sourceRefs: z.array(sourceReferenceSchema).min(1),
    era: occupationEraAvailabilitySchema,
    creditRating: z
      .object({
        min: z.number().int().min(0).max(99),
        max: z.number().int().min(0).max(99),
      })
      .strict()
      .refine((value) => value.min <= value.max, {
        message: "最低信用评级不能高于最高信用评级",
        path: ["min"],
      }),
    pointFormula: occupationPointFormulaSchema,
    skillRequirements: z.array(occupationRequirementSchema),
    prerequisites: z.array(occupationPrerequisiteSchema).optional(),
    approval: z.object({
      reason: z.literal("occupation-definition"),
      guidance: localizedSkillNameSchema.optional(),
    }).strict().optional(),
    recommendedContacts: z.array(z.string().trim().min(1)).optional(),
    summary: localizedSkillNameSchema.optional(),
  })
  .strict()
  .superRefine((occupation, context) => {
    if (occupation.variantOf === occupation.id) {
      context.addIssue({
        code: "custom",
        message: "职业 variantOf 不能引用自身",
        path: ["variantOf"],
      });
    }
    const requirementIds = new Set<string>();
    occupation.skillRequirements.forEach((requirement, index) => {
      if (requirementIds.has(requirement.id)) {
        context.addIssue({
          code: "custom",
          message: `重复的职业 requirement ID：${requirement.id}`,
          path: ["skillRequirements", index, "id"],
        });
      }
      requirementIds.add(requirement.id);
    });
  });

// 保留旧导出名，减少领域重构对现有调用方的机械影响。
export const occupationSchema = occupationDefinitionSchema;

export type OccupationCategoryId = z.infer<typeof occupationCategoryIdSchema>;
export type OccupationTagId = z.infer<typeof occupationTagIdSchema>;
export type EraId = z.infer<typeof eraIdSchema>;
export type OccupationEraAvailability = z.infer<typeof occupationEraAvailabilitySchema>;
export type OccupationRequirement = z.infer<typeof occupationRequirementSchema>;
export type AttributePrerequisite = z.infer<typeof attributePrerequisiteSchema>;
export type OccupationPrerequisite = z.infer<typeof occupationPrerequisiteSchema>;
export type OccupationDefinition = z.infer<typeof occupationDefinitionSchema>;
export type Occupation = OccupationDefinition;
