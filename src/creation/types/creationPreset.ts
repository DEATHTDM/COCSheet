import { z } from "zod";

import { settingIdSchema } from "../../coc7/types/setting";

export const attributeGenerationMethodSchema = z.enum([
  "standard-roll",
  "assign-roll",
  "multi-roll",
  "point-buy",
  "manual",
]);

export const creationPresetSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    name: z.string().min(1),
    settingId: settingIdSchema,
    attributeMethods: z.array(attributeGenerationMethodSchema).min(1),
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
        {
          message: "最低年龄不能高于最高年龄",
          path: ["min"],
        },
      )
      .optional(),
  })
  .strict();

export type AttributeGenerationMethod = z.infer<typeof attributeGenerationMethodSchema>;
export type CreationPreset = z.infer<typeof creationPresetSchema>;
