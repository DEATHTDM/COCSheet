import type {
  EraId,
  OccupationCategoryId,
  OccupationDefinition,
  OccupationEraAvailability,
  OccupationPointFormula,
  OccupationRequirement,
  SelectorCardinality,
  SkillSelector,
} from "../../coc7/types/occupation";
import { occupationCategoryIds } from "../../coc7/types/occupation";
import { isOccupationAvailableInEra } from "../../coc7/rules/availability";
import type { SkillRef } from "../../coc7/types/skill";
import type { SkillRegistry } from "../../content/skillRegistry";
import type { CreationPreset } from "../types/creationPreset";
import type { CreationSession } from "../types/creationSession";

const occupationCategoryLabels: Readonly<Record<OccupationCategoryId, string>> = {
  academic: "学术研究",
  "media-art": "媒体与艺术",
  medical: "医疗",
  "business-professional": "商业与专业人士",
  "technical-labor": "技术与劳动",
  "investigation-security": "调查与安保",
  "outdoor-adventure": "户外与冒险",
  "military-government-law": "军事、政府与法律",
  "religion-occult": "宗教与神秘",
  "criminal-underworld": "犯罪与地下世界",
  "social-special": "社会与特殊职业",
};

const eraLabels: Readonly<Record<string, string>> = {
  "classic-1920s": "古典（1920年代）",
  modern: "现代",
};

export type OccupationPresetPolicyStatus =
  | "allowed"
  | "keeper-approval-required"
  | "banned";

export function formatOccupationPointFormula(formula: OccupationPointFormula): string {
  switch (formula.type) {
    case "attribute":
      return `${formula.attribute} × ${formula.multiplier}`;
    case "best-of":
      return `${formula.attributes.join(" / ")} 取高 × ${formula.multiplier}`;
    case "sum":
      return formula.terms.map(formatOccupationPointFormula).join(" + ");
  }
}

export function formatOccupationEra(era: OccupationEraAvailability): string {
  if (era.type === "all") return "全时代";
  return era.eraIds.map((eraId) => eraLabels[eraId] ?? eraId).join("、");
}

export function formatOccupationEraId(eraId: string): string {
  return eraLabels[eraId] ?? eraId;
}

export function formatOccupationCategory(category: OccupationCategoryId): string {
  return occupationCategoryLabels[category];
}

function requireSkillName(definitionId: string, skills: SkillRegistry): string {
  const definition = skills.get(definitionId);
  if (!definition) throw new Error(`找不到技能定义：${definitionId}`);
  return definition.name.zh;
}

export function formatSkillRefForOccupation(ref: SkillRef, skills: SkillRegistry): string {
  const definitionName = requireSkillName(ref.definitionId, skills);
  if (ref.type === "standard") return definitionName;
  if (ref.type === "custom") return `${definitionName}（${ref.displayName}）`;
  const specialization = skills.resolvePredefined(ref.definitionId, ref.specializationId);
  if (!specialization) {
    throw new Error(`找不到技能专业化：${ref.definitionId}/${ref.specializationId}`);
  }
  return `${definitionName}（${specialization.name.zh}）`;
}

function formatCardinality(cardinality: SelectorCardinality, noun = "项"): string {
  if (cardinality.max === cardinality.min) return `选择 ${cardinality.min} ${noun}`;
  if (cardinality.max === undefined) return `至少 ${cardinality.min} ${noun}`;
  return `选择 ${cardinality.min}～${cardinality.max} ${noun}`;
}

function formatBranch(
  selector: SkillSelector,
  cardinality: SelectorCardinality,
  skills: SkillRegistry,
): string {
  const label = formatSkillSelectorForOccupation(selector, skills);
  if (cardinality.min === 1 && cardinality.max === 1) return label;
  const noun = selector.type === "specialization-of" ? "个专业" : "项";
  const cardinalityLabel = formatCardinality(cardinality, noun);
  return selector.type === "specialization-of" && label.endsWith("）")
    ? `${label.slice(0, -1)}；${cardinalityLabel}）`
    : `${label}（${cardinalityLabel}）`;
}

function formatSelectedBranches(cardinality: SelectorCardinality): string {
  if (cardinality.max === cardinality.min) return `选择 ${cardinality.min} 类`;
  if (cardinality.max === undefined) return `至少选择 ${cardinality.min} 类`;
  return `选择 ${cardinality.min}～${cardinality.max} 类`;
}

export function formatSkillSelectorForOccupation(
  selector: SkillSelector,
  skills: SkillRegistry,
): string {
  switch (selector.type) {
    case "exact":
      return formatSkillRefForOccupation(selector.ref, skills);
    case "specialization-of": {
      const definitionName = requireSkillName(selector.definitionId, skills);
      const specializationPrompt = selector.definitionId === "language-own" ||
        selector.definitionId === "language-other"
        ? "自选具体语言"
        : "自选专业";
      const exclusion = selector.exclude?.length
        ? `；不含 ${selector.exclude.map((ref) => formatSkillRefForOccupation(ref, skills)).join("、")}`
        : "";
      return `${definitionName}（${specializationPrompt}${exclusion}）`;
    }
    case "named-custom-specialization":
      return `${requireSkillName(selector.definitionId, skills)}（${selector.name.zh}）`;
    case "one-of":
      return selector.selectors
        .map((child) => formatSkillSelectorForOccupation(child, skills))
        .join(" 或 ");
    case "any-skill": {
      const exclusion = selector.exclude?.length
        ? `（不含 ${selector.exclude
          .map((child) => formatSkillSelectorForOccupation(child, skills))
          .join("、")}）`
        : "";
      return `任意技能${exclusion}`;
    }
    case "all-of":
      return `同时选择：${selector.groups
        .map((group) => formatBranch(group.selector, group.cardinality, skills))
        .join("；")}`;
    case "one-branch":
      return `选择一个类别：${selector.branches
        .map((branch) => formatBranch(branch.selector, branch.cardinality, skills))
        .join("；或 ")}`;
    case "choice-pool":
      return `从以下 ${selector.branches.length} 类中${formatSelectedBranches(selector.selectedBranches)}：${selector.branches
        .map((branch) => formatBranch(branch.selector, branch.cardinality, skills))
        .join("、")}`;
  }
}

function formatRequirementSelection(
  requirement: OccupationRequirement,
  skills: SkillRegistry,
): string {
  const selector = requirement.selector;
  if (selector.type === "any-skill") {
    const exclusion = selector.exclude?.length
      ? `（不含 ${selector.exclude
        .map((child) => formatSkillSelectorForOccupation(child, skills))
        .join("、")}）`
      : "";
    if (requirement.cardinality.min === 1 && requirement.cardinality.max === 1) {
      return `任意技能${exclusion}`;
    }
    if (requirement.cardinality.max === requirement.cardinality.min) {
      return `任意 ${requirement.cardinality.min} 项技能${exclusion}`;
    }
    if (requirement.cardinality.max === undefined) {
      return `至少选择 ${requirement.cardinality.min} 项任意技能${exclusion}`;
    }
    return `任意 ${requirement.cardinality.min}～${requirement.cardinality.max} 项技能${exclusion}`;
  }
  const label = formatSkillSelectorForOccupation(selector, skills);
  if (selector.type === "one-branch" || selector.type === "choice-pool" || selector.type === "all-of") {
    return label;
  }
  if (requirement.cardinality.min === 1 && requirement.cardinality.max === 1) return label;
  return `${label}：${formatCardinality(requirement.cardinality)}`;
}

export function formatOccupationRequirement(
  requirement: OccupationRequirement,
  skills: SkillRegistry,
): string {
  const notes = [
    requirement.guidance?.zh,
    requirement.keeperReview ? "需 KP 确认" : undefined,
  ].filter((note): note is string => Boolean(note));
  const selection = formatRequirementSelection(requirement, skills);
  return notes.length > 0 ? `${selection}（${notes.join("；")}）` : selection;
}

export function getAvailableOccupationCategories(
  occupations: readonly OccupationDefinition[],
): readonly OccupationCategoryId[] {
  const available = new Set(occupations.map((occupation) => occupation.category));
  return occupationCategoryIds.filter((category) => available.has(category));
}

export function getAvailableOccupationTags(
  occupations: readonly OccupationDefinition[],
): readonly string[] {
  return [...new Set(occupations.flatMap((occupation) => occupation.tags ?? []))]
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function getOccupationPresetPolicyStatus(
  occupationId: string,
  preset?: CreationPreset,
): OccupationPresetPolicyStatus {
  const policy = preset?.occupationPolicy;
  if (policy?.bannedOccupationIds?.includes(occupationId)) return "banned";
  if (policy?.approvalRequiredOccupationIds?.includes(occupationId)) {
    return "keeper-approval-required";
  }
  return "allowed";
}

export interface OccupationTransitionStatusInput {
  readonly occupation: CreationSession["occupation"];
  readonly presetSnapshot: CreationPreset | undefined;
  readonly eraId: EraId | undefined;
  readonly eraRequired: boolean;
}

export interface OccupationTransitionStatus {
  readonly canContinue: boolean;
  readonly reason: string;
}

export function getOccupationTransitionStatus(
  input: OccupationTransitionStatusInput,
): OccupationTransitionStatus {
  if (input.eraRequired && !input.eraId) {
    return { canContinue: false, reason: "请先返回基本信息选择建卡时代。" };
  }
  if (!input.occupation) {
    return { canContinue: false, reason: "请先选择一个职业。" };
  }
  if (input.occupation.kind === "catalog" && getOccupationPresetPolicyStatus(
    input.occupation.selectedOccupationId,
    input.presetSnapshot,
  ) === "banned") {
    return { canContinue: false, reason: "当前已选职业被此 KP 预设禁用，请先更换职业。" };
  }
  if (input.occupation.kind === "custom" && input.presetSnapshot?.allowCustomOccupation === false) {
    return { canContinue: false, reason: "当前 KP 预设禁止自定义职业，请先更换职业。" };
  }
  if (input.eraRequired && input.eraId && !isOccupationAvailableInEra(
    input.occupation.definitionSnapshot,
    input.eraId,
  )) {
    return {
      canContinue: false,
      reason: `当前职业不适用于${formatOccupationEraId(input.eraId)}`,
    };
  }
  return { canContinue: true, reason: "" };
}

export function sortOccupationsForDisplay(
  occupations: readonly OccupationDefinition[],
): readonly OccupationDefinition[] {
  return [...occupations].sort((left, right) =>
    left.name.zh.localeCompare(right.name.zh, "zh-CN") ||
    left.name.en.localeCompare(right.name.en, "en") ||
    left.id.localeCompare(right.id, "en"),
  );
}
