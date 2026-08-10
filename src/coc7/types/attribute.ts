import { z } from "zod";

export const characteristicIds = [
  "STR",
  "CON",
  "SIZ",
  "DEX",
  "APP",
  "INT",
  "POW",
  "EDU",
] as const;

export const characteristicIdSchema = z.enum(characteristicIds);
export const luckIdSchema = z.literal("LUCK");
export const attributeIds = [...characteristicIds, "LUCK"] as const;
export const attributeIdSchema = z.enum(attributeIds);

export type CharacteristicId = z.infer<typeof characteristicIdSchema>;
export type LuckId = z.infer<typeof luckIdSchema>;
export type AttributeId = z.infer<typeof attributeIdSchema>;
export type CharacteristicValues = Readonly<Record<CharacteristicId, number>>;
export type AttributeValues = CharacteristicValues & Readonly<Record<LuckId, number>>;
