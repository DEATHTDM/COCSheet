import { z } from "zod";

import { settingIdSchema } from "../../coc7/types/setting";
import { creationPresetSchema } from "./creationPreset";

export const creationStepIdSchema = z.enum(["basic-info", "attributes", "occupation", "review"]);

export const creationSessionSchema = z
  .object({
    version: z.literal(1),
    characterId: z.string().uuid(),
    settingId: settingIdSchema,
    currentStep: creationStepIdSchema,
    presetSnapshot: creationPresetSchema.optional(),
  })
  .strict();

export type CreationStepId = z.infer<typeof creationStepIdSchema>;
export type CreationSession = z.infer<typeof creationSessionSchema>;
