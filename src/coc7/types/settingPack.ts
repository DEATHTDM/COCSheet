import { z } from "zod";

import { eraIdSchema, occupationSchema } from "./occupation";
import { settingIdSchema } from "./setting";
import { sourceReferenceSchema } from "./source";

export const characterExtensionIdSchema = z.enum(["regency-reputation"]);

export const skillDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();

export const equipmentDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();

export const ruleOptionDefinitionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    enabledByDefault: z.boolean(),
  })
  .strict();

export const settingPackSchema = z
  .object({
    version: z.literal(1),
    id: settingIdSchema,
    name: z.string().min(1),
    shortName: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    eras: z.array(eraIdSchema).optional(),
    occupations: z.array(occupationSchema),
    skills: z.array(skillDefinitionSchema).optional(),
    equipment: z.array(equipmentDefinitionSchema).optional(),
    characterExtensions: z.array(characterExtensionIdSchema).optional(),
    ruleOptions: z.array(ruleOptionDefinitionSchema).optional(),
    sources: z.array(sourceReferenceSchema).optional(),
  })
  .strict();

export type CharacterExtensionId = z.infer<typeof characterExtensionIdSchema>;
export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;
export type EquipmentDefinition = z.infer<typeof equipmentDefinitionSchema>;
export type RuleOptionDefinition = z.infer<typeof ruleOptionDefinitionSchema>;
export type SettingPack = z.infer<typeof settingPackSchema>;
