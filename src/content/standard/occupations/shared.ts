import type {
  ExactSkillSelector,
  NamedCustomSpecializationSelector,
  OccupationDefinition,
  OccupationPointFormula,
  OccupationRequirement,
  OneBranchSkillSelector,
  SpecializationOfSkillSelector,
  SkillSelector,
} from "../../../coc7/types/occupation";
import type { SourceReference } from "../../../coc7/types/source";
import type { SkillRef } from "../../../coc7/types/skill";

const keeperRulebookTitle = "《克苏鲁的呼唤 40 周年纪念版》";
const investigatorHandbookTitle = "《克苏鲁的呼唤第七版调查员手册》";

export const keeperRulebook = (page: number, note?: string): SourceReference => ({
  sourceId: "coc7-keeper-rulebook-40th-zh",
  title: keeperRulebookTitle,
  page,
  ...(note ? { note } : {}),
});

export const investigatorHandbook = (page: number, note?: string): SourceReference => ({
  sourceId: "coc7-investigator-handbook-zh-1-21",
  title: investigatorHandbookTitle,
  page,
  ...(note ? { note } : {}),
});

export const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

export const edu2Plus = (
  ...attributes: ("STR" | "DEX" | "APP" | "POW")[]
): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    attributes.length === 1
      ? { type: "attribute", attribute: attributes[0] ?? "STR", multiplier: 2 }
      : { type: "best-of", attributes, multiplier: 2 },
  ],
});

export const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
export const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

export const exact = (ref: SkillRef): ExactSkillSelector => {
  if (ref.type === "custom") throw new Error("静态职业 selector 不接受 custom UUID");
  return { type: "exact", ref };
};

export const specializationOf = (
  definitionId: string,
  exclude?: readonly SkillRef[],
): SpecializationOfSkillSelector => ({
  type: "specialization-of",
  definitionId,
  ...(exclude ? {
    exclude: exclude.map((ref) => {
      if (ref.type === "custom") throw new Error("静态职业 exclude 不接受 custom UUID");
      return ref;
    }),
  } : {}),
});

export const namedCustomSpecialization = (
  definitionId: string,
  zh: string,
  en: string,
): NamedCustomSpecializationSelector => ({
  type: "named-custom-specialization",
  definitionId,
  name: { zh, en },
});

export const oneOf = (...selectors: SkillSelector[]): SkillSelector => ({
  type: "one-of",
  selectors,
});

export const oneBranch = (
  ...branches: OneBranchSkillSelector["branches"]
): OneBranchSkillSelector => ({
  type: "one-branch",
  branches,
});

export const anySkill = (...exclude: SkillSelector[]): SkillSelector => ({
  type: "any-skill",
  ...(exclude.length > 0 ? { exclude } : {}),
});

export const requirement = (
  id: string,
  selector: SkillSelector,
  min = 1,
  max: number | null = 1,
  keeperReview = false,
  guidance?: { readonly zh: string; readonly en: string },
): OccupationRequirement => ({
  id,
  selector,
  cardinality: { min, ...(max === null ? {} : { max }) },
  ...(keeperReview ? { keeperReview: true } : {}),
  ...(guidance ? { guidance } : {}),
});

export const socialSelector = oneOf(
  exact(standard("charm")),
  exact(standard("fast-talk")),
  exact(standard("intimidate")),
  exact(standard("persuade")),
);

interface OccupationOptions {
  readonly aliases?: OccupationDefinition["aliases"];
  readonly variantOf?: string;
  readonly era?: OccupationDefinition["era"];
}

export function defineOccupation(
  id: string,
  zh: string,
  en: string,
  sourceRefs: readonly SourceReference[],
  creditRating: { readonly min: number; readonly max: number },
  pointFormula: OccupationPointFormula,
  skillRequirements: readonly OccupationRequirement[],
  category: OccupationDefinition["category"],
  options: OccupationOptions = {},
): OccupationDefinition {
  return {
    version: 1,
    id,
    ...(options.variantOf ? { variantOf: options.variantOf } : {}),
    name: { zh, en },
    ...(options.aliases ? { aliases: options.aliases } : {}),
    category,
    sourceRefs: [...sourceRefs],
    era: options.era ?? { type: "all" },
    creditRating,
    pointFormula,
    skillRequirements: [...skillRequirements],
  };
}

export const personalOrEraGuidance = {
  zh: "个人或时代特长",
  en: "personal or era specialty",
};
