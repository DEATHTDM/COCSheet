import { z } from "zod";

import { settingIdSchema } from "../../coc7/types/setting";

export const attributeGenerationMethodSchema = z.enum([
  "standard-roll",
  "low-roll-boost",
  "assign-roll",
  "multi-roll",
  "point-buy",
  "manual",
]);

export const attributeGenerationConfigSchema = z
  .object({
    allowedMethods: z.array(attributeGenerationMethodSchema).min(1),
    multiRoll: z
      .object({ count: z.number().int().min(2).max(10) })
      .strict()
      .optional(),
    assignRoll: z
      .object({
        intMin: z.number().int().min(0).max(99),
        sizMin: z.number().int().min(0).max(99),
      })
      .strict()
      .optional(),
    pointBuy: z
      .object({
        total: z.number().int().positive(),
        min: z.number().int().min(0).max(99),
        max: z.number().int().min(0).max(99),
        intMin: z.number().int().min(0).max(99),
        sizMin: z.number().int().min(0).max(99),
      })
      .strict()
      .refine((value) => value.min <= value.max, {
        message: "属性最小值不能高于最大值",
        path: ["min"],
      })
      .optional(),
  })
  .strict();

const presetBaseSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    name: z.string().min(1),
    settingId: settingIdSchema,
    attributeGeneration: attributeGenerationConfigSchema.optional(),
    attributeMethods: z.array(attributeGenerationMethodSchema).min(1).optional(),
    skillCaps: z
      .object({
        occupation: z.number().finite().nonnegative().optional(),
        interest: z.number().finite().nonnegative().optional(),
        overall: z.number().finite().nonnegative().optional(),
      })
      .strict()
      .optional(),
    occupationPolicy: z
      .object({
        bannedOccupationIds: z.array(z.string().min(1)).optional(),
        approvalRequiredOccupationIds: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    allowCustomOccupation: z.union([
      z.literal(true),
      z.literal(false),
      z.literal("keeper-approval"),
    ]),
    age: z
      .object({
        min: z.number().int().nonnegative().optional(),
        max: z.number().int().nonnegative().optional(),
      })
      .strict()
      .refine(
        (value) => value.min === undefined || value.max === undefined || value.min <= value.max,
        { message: "最低年龄不能高于最高年龄", path: ["min"] },
      )
      .optional(),
  })
  .strict()
  .refine((value) => value.attributeGeneration !== undefined || value.attributeMethods !== undefined, {
    message: "必须配置至少一种属性生成方式",
    path: ["attributeGeneration"],
  });

export const creationPresetSchema = presetBaseSchema.transform(({ attributeMethods, ...preset }) => ({
  ...preset,
  attributeGeneration: preset.attributeGeneration ?? { allowedMethods: attributeMethods ?? ["manual"] },
}));

export type AttributeGenerationMethod = z.infer<typeof attributeGenerationMethodSchema>;
export type AttributeGenerationConfig = z.infer<typeof attributeGenerationConfigSchema>;
export type CreationPreset = z.infer<typeof creationPresetSchema>;

export const defaultAttributeGenerationConfig: AttributeGenerationConfig = {
  allowedMethods: [
    "standard-roll",
    "low-roll-boost",
    "assign-roll",
    "multi-roll",
    "point-buy",
    "manual",
  ],
  multiRoll: { count: 3 },
  assignRoll: { intMin: 40, sizMin: 40 },
  pointBuy: { total: 460, min: 15, max: 90, intMin: 40, sizMin: 40 },
};

export function resolveAttributeGenerationConfig(
  preset?: CreationPreset,
): AttributeGenerationConfig {
  const configured = preset?.attributeGeneration;
  return {
    allowedMethods: configured?.allowedMethods ?? defaultAttributeGenerationConfig.allowedMethods,
    multiRoll: configured?.multiRoll ?? defaultAttributeGenerationConfig.multiRoll,
    assignRoll: configured?.assignRoll ?? defaultAttributeGenerationConfig.assignRoll,
    pointBuy: configured?.pointBuy ?? defaultAttributeGenerationConfig.pointBuy,
  };
}
