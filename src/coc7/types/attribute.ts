import { z } from "zod";

export const attributeIds = [
  "STR",
  "CON",
  "SIZ",
  "DEX",
  "APP",
  "INT",
  "POW",
  "EDU",
  "LUCK",
] as const;

export const attributeIdSchema = z.enum(attributeIds);

export type AttributeId = z.infer<typeof attributeIdSchema>;
export type AttributeValues = Readonly<Record<AttributeId, number>>;
