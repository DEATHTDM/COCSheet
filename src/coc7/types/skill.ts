import { z } from "zod";

import { characteristicIdSchema } from "./attribute";
import { sourceReferenceSchema } from "./source";

const stableMachineIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "必须使用小写 kebab-case 稳定机器 ID");

export const skillDefinitionIdSchema = stableMachineIdSchema;
export const skillSpecializationIdSchema = stableMachineIdSchema;
export const skillTagIdSchema = stableMachineIdSchema;

export const localizedSkillNameSchema = z
  .object({
    zh: z.string().min(1),
    en: z.string().min(1),
  })
  .strict();

export const skillBaseValueRuleSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("fixed"),
      value: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("characteristic"),
      characteristic: characteristicIdSchema,
      fraction: z.enum(["full", "half", "fifth"]),
    })
    .strict(),
]);

export const predefinedSkillSpecializationSchema = z
  .object({
    id: skillSpecializationIdSchema,
    name: localizedSkillNameSchema,
    baseValueRule: skillBaseValueRuleSchema.optional(),
    tags: z.array(skillTagIdSchema).optional(),
    sourceRefs: z.array(sourceReferenceSchema).optional(),
  })
  .strict();

export const skillSpecializationPolicySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }).strict(),
  z
    .object({
      type: z.literal("required"),
      allowMultiple: z.boolean(),
      allowCustom: z.boolean(),
    })
    .strict(),
]);

export const skillImprovementPolicySchema = z.enum(["standard", "not-eligible"]);
export const skillCreationPointPolicySchema = z.enum([
  "allowed",
  "forbidden",
  "keeper-approval",
]);

export const skillDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: skillDefinitionIdSchema,
    name: localizedSkillNameSchema,
    baseValueRule: skillBaseValueRuleSchema,
    specialization: skillSpecializationPolicySchema,
    predefinedSpecializations: z.array(predefinedSkillSpecializationSchema),
    tags: z.array(skillTagIdSchema),
    creationPointPolicy: skillCreationPointPolicySchema,
    improvementPolicy: skillImprovementPolicySchema,
    sourceRefs: z.array(sourceReferenceSchema),
  })
  .strict()
  .superRefine((definition, context) => {
    if (definition.specialization.type === "none" && definition.predefinedSpecializations.length > 0) {
      context.addIssue({
        code: "custom",
        message: "非专业化技能不能包含预定义专业化",
        path: ["predefinedSpecializations"],
      });
    }
    if (definition.specialization.type === "required" &&
      !definition.specialization.allowCustom && definition.predefinedSpecializations.length === 0) {
      context.addIssue({
        code: "custom",
        message: "必须专业化的技能至少需要预定义专业化或允许自定义专业化",
        path: ["specialization"],
      });
    }

    const ids = new Set<string>();
    definition.predefinedSpecializations.forEach((specialization, index) => {
      if (ids.has(specialization.id)) {
        context.addIssue({
          code: "custom",
          message: `重复的专业化 ID：${specialization.id}`,
          path: ["predefinedSpecializations", index, "id"],
        });
      }
      ids.add(specialization.id);
    });
  });

export const skillRefSchema = z.discriminatedUnion("type", [
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
  z
    .object({
      type: z.literal("custom"),
      definitionId: skillDefinitionIdSchema,
      specializationId: z.string().uuid(),
      displayName: z.string().trim().min(1),
    })
    .strict(),
]);

export const characterSkillSchema = z
  .object({
    ref: skillRefSchema,
    currentValue: z.number().int().nonnegative(),
    improvementChecked: z.boolean(),
  })
  .strict();

export const characterSkillsSchema = z.array(characterSkillSchema).superRefine((skills, context) => {
  const keys = new Set<string>();
  skills.forEach((skill, index) => {
    const ref = skill.ref;
    const key = ref.type === "standard"
      ? `standard:${ref.definitionId}`
      : `${ref.type}:${ref.definitionId}:${ref.specializationId}`;
    if (keys.has(key)) {
      context.addIssue({
        code: "custom",
        message: `重复的技能实例：${key}`,
        path: [index, "ref"],
      });
    }
    keys.add(key);
  });
});

export type SkillDefinitionId = z.infer<typeof skillDefinitionIdSchema>;
export type SkillSpecializationId = z.infer<typeof skillSpecializationIdSchema>;
export type SkillBaseValueRule = z.infer<typeof skillBaseValueRuleSchema>;
export type PredefinedSkillSpecialization = z.infer<typeof predefinedSkillSpecializationSchema>;
export type SkillSpecializationPolicy = z.infer<typeof skillSpecializationPolicySchema>;
export type SkillImprovementPolicy = z.infer<typeof skillImprovementPolicySchema>;
export type SkillCreationPointPolicy = z.infer<typeof skillCreationPointPolicySchema>;
export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;
export type SkillRef = z.infer<typeof skillRefSchema>;
export type CharacterSkill = z.infer<typeof characterSkillSchema>;
