import { z } from "zod";

import { settingIdSchema } from "./setting";

export const characterSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    name: z.string(),
    settingId: settingIdSchema,
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
