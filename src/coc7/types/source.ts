import { z } from "zod";

export const sourceReferenceSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    page: z.number().int().positive().optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export type SourceReference = z.infer<typeof sourceReferenceSchema>;
