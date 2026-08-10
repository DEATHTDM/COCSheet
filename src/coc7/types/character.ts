import { z } from "zod";

import { characteristicValuesSchema } from "./attribute";
import { settingIdSchema } from "./setting";

export const characterSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    name: z.string(),
    settingId: settingIdSchema,
    age: z.number().int().nonnegative().optional(),
    characteristics: characteristicValuesSchema.optional(),
    luck: z.number().int().min(0).max(99).optional(),
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
