import type { SourceReference } from "../../../coc7/types/source";
import type {
  WeaponDefinition,
  WeaponEraAvailability,
  WeaponSkillRef,
} from "../../../coc7/types/weapon";

interface WeaponSourceLocation {
  readonly keeperPage: number;
  readonly keeperTable: string;
  readonly keeperNote?: string;
  readonly investigatorPage: number;
  readonly investigatorTable: string;
  readonly investigatorNote?: string;
}

type WeaponDefinitionInput = Omit<WeaponDefinition, "version" | "sourceRefs"> & {
  readonly source: WeaponSourceLocation;
};

const keeperRulebook = (
  page: number,
  table: string,
  note?: string,
): SourceReference => ({
  sourceId: "coc7-keeper-rulebook-40th-zh",
  title: "《克苏鲁的呼唤 40 周年纪念版》",
  page,
  note: [table, note].filter(Boolean).join("；"),
});

const investigatorHandbook = (
  page: number,
  table: string,
  note?: string,
): SourceReference => ({
  sourceId: "coc7-investigator-handbook-zh-1-21",
  title: "《克苏鲁的呼唤第七版调查员手册》",
  page,
  note: [table, note].filter(Boolean).join("；"),
});

export function defineStandardWeapon(input: WeaponDefinitionInput): WeaponDefinition {
  const { source, ...definition } = input;
  return {
    version: 1,
    ...definition,
    sourceRefs: [
      keeperRulebook(
        source.keeperPage,
        source.keeperTable,
        source.keeperNote,
      ),
      investigatorHandbook(
        source.investigatorPage,
        source.investigatorTable,
        source.investigatorNote,
      ),
    ],
  };
}

export const standard = (definitionId: string): WeaponSkillRef => ({
  type: "standard",
  definitionId,
});

export const predefined = (
  definitionId: string,
  specializationId: string,
): WeaponSkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

const era = (
  classic1920s: WeaponEraAvailability,
  modern: WeaponEraAvailability,
) => ({ classic1920s, modern }) as const;

export const availableBoth = era("available", "available");
export const classicOnly = era("available", "unavailable");
export const modernOnly = era("unavailable", "available");
export const rareBoth = era("rare", "rare");
export const classicAvailableModernRare = era("available", "rare");
export const classicRareOnly = era("rare", "unavailable");
