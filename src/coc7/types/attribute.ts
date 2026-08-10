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

export const characteristicValueSchema = z.number().int().min(0).max(99);
export const characteristicValuesSchema = z
  .object({
    STR: characteristicValueSchema,
    CON: characteristicValueSchema,
    SIZ: characteristicValueSchema,
    DEX: characteristicValueSchema,
    APP: characteristicValueSchema,
    INT: characteristicValueSchema,
    POW: characteristicValueSchema,
    EDU: characteristicValueSchema,
  })
  .strict();

export const partialCharacteristicValuesSchema = z
  .object({
    STR: characteristicValueSchema.optional(),
    CON: characteristicValueSchema.optional(),
    SIZ: characteristicValueSchema.optional(),
    DEX: characteristicValueSchema.optional(),
    APP: characteristicValueSchema.optional(),
    INT: characteristicValueSchema.optional(),
    POW: characteristicValueSchema.optional(),
    EDU: characteristicValueSchema.optional(),
  })
  .strict();

export const diceRollSchema = z
  .object({
    dice: z.array(z.number().int().min(1)).min(1),
    modifier: z.number().int(),
    total: z.number().int().min(1),
  })
  .strict();

export const characteristicRollSchema = z
  .object({
    characteristic: characteristicIdSchema,
    dice: z.array(z.number().int().min(1).max(6)).min(2).max(3),
    modifier: z.number().int().min(0),
    raw: z.number().int().min(1),
    value: characteristicValueSchema,
  })
  .strict();

export const standardRollResultSchema = z
  .object({
    rolls: z.array(characteristicRollSchema).length(characteristicIds.length),
    values: characteristicValuesSchema,
  })
  .strict();

export const assignRollResultSchema = z
  .object({
    id: z.string().min(1),
    formula: z.enum(["3d6", "2d6+6"]),
    dice: z.array(z.number().int().min(1).max(6)).min(2).max(3),
    modifier: z.number().int().min(0),
    raw: z.number().int().min(1),
    value: characteristicValueSchema,
  })
  .strict();

export type CharacteristicId = z.infer<typeof characteristicIdSchema>;
export type LuckId = z.infer<typeof luckIdSchema>;
export type AttributeId = z.infer<typeof attributeIdSchema>;
export type CharacteristicValues = z.infer<typeof characteristicValuesSchema>;
export type PartialCharacteristicValues = z.infer<typeof partialCharacteristicValuesSchema>;
export type AttributeValues = CharacteristicValues & Readonly<Record<LuckId, number>>;
export type DiceRoll = z.infer<typeof diceRollSchema>;
export type CharacteristicRoll = z.infer<typeof characteristicRollSchema>;
export type StandardRollResult = z.infer<typeof standardRollResultSchema>;
export type AssignRollResult = z.infer<typeof assignRollResultSchema>;
