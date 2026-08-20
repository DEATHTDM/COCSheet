import { z } from "zod";

import {
  assignRollResultSchema,
  characteristicValuesSchema,
  diceRollSchema,
  partialCharacteristicValuesSchema,
  standardRollResultSchema,
} from "../../coc7/types/attribute";
import { settingIdSchema } from "../../coc7/types/setting";
import { attributeGenerationMethodSchema, creationPresetSchema } from "./creationPreset";
import { occupationSelectionSchema, skillCreationStateSchema } from "./skillCreation";

export const creationStepIdSchema = z.enum([
  "basic-info",
  "attributes",
  "occupation",
  "skills",
  "background",
  "possessions",
  "review",
]);

export const wealthInitializationSchema = z
  .object({
    eraId: z.enum(["classic-1920s", "modern"]),
    creditRating: z.number().int().min(0).max(99),
  })
  .strict();

const assignmentSchema = z
  .object({
    STR: z.string().min(1).optional(),
    CON: z.string().min(1).optional(),
    SIZ: z.string().min(1).optional(),
    DEX: z.string().min(1).optional(),
    APP: z.string().min(1).optional(),
    INT: z.string().min(1).optional(),
    POW: z.string().min(1).optional(),
    EDU: z.string().min(1).optional(),
  })
  .strict();

const standardGenerationSchema = z
  .object({
    method: z.literal("standard-roll"),
    result: standardRollResultSchema.optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

const lowRollGenerationSchema = z
  .object({
    method: z.literal("low-roll-boost"),
    result: standardRollResultSchema.optional(),
    bonusRoll: z.number().int().min(1).max(6).optional(),
    allocation: partialCharacteristicValuesSchema.optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

const assignGenerationSchema = z
  .object({
    method: z.literal("assign-roll"),
    rolls: z.array(assignRollResultSchema).optional(),
    assignments: assignmentSchema.optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

const multiGenerationSchema = z
  .object({
    method: z.literal("multi-roll"),
    candidates: z.array(standardRollResultSchema).min(2).max(10).optional(),
    selectedIndex: z.number().int().nonnegative().optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

const pointBuyGenerationSchema = z
  .object({
    method: z.literal("point-buy"),
    values: characteristicValuesSchema.optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

const manualGenerationSchema = z
  .object({
    method: z.literal("manual"),
    values: partialCharacteristicValuesSchema.optional(),
    baseCharacteristics: characteristicValuesSchema.optional(),
  })
  .strict();

export const attributeGenerationStateSchema = z.discriminatedUnion("method", [
  standardGenerationSchema,
  lowRollGenerationSchema,
  assignGenerationSchema,
  multiGenerationSchema,
  pointBuyGenerationSchema,
  manualGenerationSchema,
]);

export const eduImprovementResultSchema = z
  .object({
    checkRoll: z.number().int().min(1).max(100),
    eduBefore: z.number().int().min(0).max(99),
    success: z.boolean(),
    improvementRoll: z.number().int().min(1).max(10).optional(),
    eduAfter: z.number().int().min(0).max(99),
  })
  .strict();

export const ageAdjustmentStateSchema = z
  .object({
    age: z.number().int().nonnegative(),
    reductionAllocation: partialCharacteristicValuesSchema,
    eduImprovements: z.array(eduImprovementResultSchema),
  })
  .strict();

export const luckStateSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("rolled"), rolls: z.array(diceRollSchema).min(1).max(2), value: z.number().int().min(0).max(99) }).strict(),
  z.object({ source: z.literal("manual"), value: z.number().int().min(0).max(99) }).strict(),
]);

export const attributeStateSchema = z
  .object({
    generationMethod: attributeGenerationMethodSchema,
    generation: attributeGenerationStateSchema,
    ageAdjustment: ageAdjustmentStateSchema.optional(),
    luck: luckStateSchema.optional(),
  })
  .strict()
  .refine((value) => value.generationMethod === value.generation.method, {
    message: "属性生成方式与生成状态不一致",
    path: ["generation"],
  });

export const creationSessionSchema = z
  .object({
    version: z.literal(1),
    characterId: z.string().uuid(),
    settingId: settingIdSchema,
    currentStep: creationStepIdSchema,
    presetSnapshot: creationPresetSchema.optional(),
    draftAge: z.number().int().nonnegative().optional(),
    attributes: attributeStateSchema.optional(),
    occupation: occupationSelectionSchema.optional(),
    skills: skillCreationStateSchema.optional(),
    wealthInitialization: wealthInitializationSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const adjustmentAge = value.attributes?.ageAdjustment?.age;
    if (value.draftAge !== undefined && adjustmentAge !== undefined && value.draftAge !== adjustmentAge) {
      context.addIssue({
        code: "custom",
        message: "草稿年龄与属性年龄调整状态不一致",
        path: ["attributes", "ageAdjustment", "age"],
      });
    }
  });

export type CreationStepId = z.infer<typeof creationStepIdSchema>;
export type WealthInitialization = z.infer<typeof wealthInitializationSchema>;
export type AttributeGenerationState = z.infer<typeof attributeGenerationStateSchema>;
export type EduImprovementResult = z.infer<typeof eduImprovementResultSchema>;
export type AgeAdjustmentState = z.infer<typeof ageAdjustmentStateSchema>;
export type LuckState = z.infer<typeof luckStateSchema>;
export type AttributeState = z.infer<typeof attributeStateSchema>;
export type CreationSession = z.infer<typeof creationSessionSchema>;
