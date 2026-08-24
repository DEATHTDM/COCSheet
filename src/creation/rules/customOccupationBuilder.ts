import { calculateCustomOccupationSkillCapacity, validateCustomOccupationDefinition } from "../../coc7/rules/occupationSkills";
import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import type { CharacteristicId } from "../../coc7/types/attribute";
import {
  occupationCategoryIds,
  occupationDefinitionSchema,
  occupationPointFormulaSchema,
  type OccupationCategoryId,
  type OccupationDefinition,
  type OccupationPointFormula,
  type OccupationRequirement,
} from "../../coc7/types/occupation";
import type { SkillDefinition } from "../../coc7/types/skill";
import type { SkillRegistry } from "../../content/skillRegistry";

export type CustomOccupationFormulaDraft =
  | {
    readonly type: "single";
    readonly attribute: CharacteristicId;
    readonly multiplier: number;
  }
  | {
    readonly type: "sum-two";
    readonly first: { readonly attribute: CharacteristicId; readonly multiplier: number };
    readonly second: { readonly attribute: CharacteristicId; readonly multiplier: number };
  }
  | {
    readonly type: "best-of";
    readonly attributes: readonly CharacteristicId[];
    readonly multiplier: number;
  };

export type CustomOccupationSkillSlotMode =
  | "ordinary"
  | "predefined"
  | "named-custom"
  | "specialization-of";

export interface CustomOccupationSkillSlotDraft {
  readonly id: string;
  readonly definitionId: string;
  readonly mode: CustomOccupationSkillSlotMode;
  readonly specializationId?: string | undefined;
  readonly customName?: string | undefined;
}

export interface CustomOccupationDraft {
  readonly id: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly category: OccupationCategoryId;
  readonly creditRatingMin: number;
  readonly creditRatingMax: number;
  readonly pointFormula: CustomOccupationFormulaDraft;
  readonly skillSlots: readonly CustomOccupationSkillSlotDraft[];
}

export interface CustomOccupationBuilderResult {
  readonly definition?: OccupationDefinition | undefined;
  readonly errors: readonly string[];
  readonly maximumSkills?: number | undefined;
}

export interface CustomOccupationDraftResult {
  readonly draft?: CustomOccupationDraft | undefined;
  readonly errors: readonly string[];
}

const customSource = { sourceId: "custom", title: "用户自定义职业" } as const;

export function createCustomOccupationSkillSlot(
  createUuid: () => string = () => crypto.randomUUID(),
): CustomOccupationSkillSlotDraft {
  return {
    id: `skill-${createUuid()}`,
    definitionId: "",
    mode: "ordinary",
  };
}

export function createCustomOccupationDraft(
  createUuid: () => string = () => crypto.randomUUID(),
): CustomOccupationDraft {
  return {
    id: createUuid(),
    nameZh: "",
    nameEn: "",
    category: "academic",
    creditRatingMin: 0,
    creditRatingMax: 99,
    pointFormula: { type: "single", attribute: "EDU", multiplier: 4 },
    skillSlots: [],
  };
}

function formulaFromDraft(
  draft: CustomOccupationFormulaDraft,
): { readonly formula?: OccupationPointFormula; readonly errors: readonly string[] } {
  switch (draft.type) {
    case "single":
      return {
        formula: { type: "attribute", attribute: draft.attribute, multiplier: draft.multiplier },
        errors: [],
      };
    case "sum-two":
      return {
        formula: {
          type: "sum",
          terms: [
            { type: "attribute", attribute: draft.first.attribute, multiplier: draft.first.multiplier },
            { type: "attribute", attribute: draft.second.attribute, multiplier: draft.second.multiplier },
          ],
        },
        errors: [],
      };
    case "best-of":
      return {
        formula: {
          type: "best-of",
          attributes: [...draft.attributes],
          multiplier: draft.multiplier,
        },
        errors: draft.attributes.length < 2 ? ["多属性取高公式至少需要选择两项不同属性。"] : [],
      };
  }
}

export function previewCustomOccupationPointFormula(
  draft: CustomOccupationFormulaDraft,
): OccupationPointFormula | undefined {
  const result = formulaFromDraft(draft);
  if (result.errors.length > 0) return undefined;
  return occupationPointFormulaSchema.safeParse(result.formula).success
    ? result.formula
    : undefined;
}

function slotToRequirement(
  slot: CustomOccupationSkillSlotDraft,
  skill: SkillDefinition,
): { readonly requirement?: OccupationRequirement; readonly errors: readonly string[] } {
  const cardinality = { min: 1, max: 1 } as const;
  switch (slot.mode) {
    case "ordinary":
      if (skill.specialization.type !== "none") {
        return { errors: [`技能栏位【${skill.name.zh}】需要选择具体专业形式。`] };
      }
      return {
        requirement: {
          id: slot.id,
          selector: { type: "exact", ref: { type: "standard", definitionId: skill.id } },
          cardinality,
        },
        errors: [],
      };
    case "predefined": {
      if (skill.specialization.type !== "required") {
        return { errors: [`技能栏位【${skill.name.zh}】不是技能专攻。`] };
      }
      const specialization = skill.predefinedSpecializations.find(
        ({ id }) => id === slot.specializationId,
      );
      if (!specialization) {
        return { errors: [`技能栏位【${skill.name.zh}】尚未选择有效的预定义专业。`] };
      }
      return {
        requirement: {
          id: slot.id,
          selector: {
            type: "exact",
            ref: {
              type: "predefined",
              definitionId: skill.id,
              specializationId: specialization.id,
            },
          },
          cardinality,
        },
        errors: [],
      };
    }
    case "named-custom": {
      const name = slot.customName?.trim() ?? "";
      if (skill.specialization.type !== "required" || !skill.specialization.allowCustom) {
        return { errors: [`技能栏位【${skill.name.zh}】不允许固定自定义专业。`] };
      }
      if (!name) return { errors: [`技能栏位【${skill.name.zh}】的自定义专业名称不能为空。`] };
      return {
        requirement: {
          id: slot.id,
          selector: {
            type: "named-custom-specialization",
            definitionId: skill.id,
            name: { zh: name, en: name },
          },
          cardinality,
        },
        errors: [],
      };
    }
    case "specialization-of":
      if (skill.specialization.type !== "required") {
        return { errors: [`技能栏位【${skill.name.zh}】不能稍后选择专业。`] };
      }
      return {
        requirement: {
          id: slot.id,
          selector: { type: "specialization-of", definitionId: skill.id },
          cardinality: skill.id === "fighting" || skill.id === "firearms"
            ? { min: 1 }
            : cardinality,
        },
        errors: [],
      };
  }
}

function exactSelectorKey(requirement: OccupationRequirement): string | undefined {
  if (requirement.selector.type !== "exact") return undefined;
  const ref = requirement.selector.ref;
  return ref.type === "standard"
    ? `standard:${ref.definitionId}`
    : `predefined:${ref.definitionId}:${ref.specializationId}`;
}

export function buildCustomOccupationDefinition(
  draft: CustomOccupationDraft,
  skills: SkillRegistry,
  eraId?: string,
): CustomOccupationBuilderResult {
  const errors: string[] = [];
  const nameZh = draft.nameZh.trim();
  const nameEn = draft.nameEn.trim() || nameZh;
  if (!nameZh) errors.push("职业名称（中文）不能为空。");
  if (!occupationCategoryIds.includes(draft.category)) errors.push("请选择有效的职业分类。");
  if (!Number.isInteger(draft.creditRatingMin) || draft.creditRatingMin < 0 || draft.creditRatingMin > 99) {
    errors.push("最低信用评级必须是 0～99 的整数。");
  }
  if (!Number.isInteger(draft.creditRatingMax) || draft.creditRatingMax < 0 || draft.creditRatingMax > 99) {
    errors.push("最高信用评级必须是 0～99 的整数。");
  }
  if (draft.creditRatingMin > draft.creditRatingMax) {
    errors.push("最低信用评级不能高于最高信用评级。");
  }
  const formulaResult = formulaFromDraft(draft.pointFormula);
  errors.push(...formulaResult.errors);
  const requirements: OccupationRequirement[] = [];
  const exactKeys = new Set<string>();
  const singleParentCounts = new Map<string, number>();
  const requirementIds = new Set<string>();

  for (const [index, slot] of draft.skillSlots.entries()) {
    const label = `第 ${index + 1} 个本职技能栏位`;
    if (requirementIds.has(slot.id)) errors.push(`${label}与其他栏位使用了重复的稳定 ID。`);
    requirementIds.add(slot.id);
    const skill = skills.get(slot.definitionId);
    if (!skill) {
      errors.push(`${label}尚未选择有效技能。`);
      continue;
    }
    if (skill.id === "credit-rating") {
    errors.push("信用评级由职业信用范围独立处理，不能加入本职技能栏位。");
      continue;
    }
    if (eraId && !isSkillAvailableInEra(skill, eraId)) {
      errors.push(`技能【${skill.name.zh}】不适用于当前建卡时代。`);
    }
    if (skill.specialization.type === "required" && !skill.specialization.allowMultiple) {
      const count = (singleParentCounts.get(skill.id) ?? 0) + 1;
      singleParentCounts.set(skill.id, count);
      if (count > 1) errors.push(`技能【${skill.name.zh}】只允许占用一个本职技能栏位。`);
    }
    const result = slotToRequirement(slot, skill);
    errors.push(...result.errors);
    if (!result.requirement) continue;
    const exactKey = exactSelectorKey(result.requirement);
    if (exactKey && exactKeys.has(exactKey)) {
      errors.push(`本职技能栏位不能重复选择【${skill.name.zh}】的同一技能实例。`);
    }
    if (exactKey) exactKeys.add(exactKey);
    requirements.push(result.requirement);
  }

  if (!formulaResult.formula || errors.length > 0) return { errors };
  const candidate = {
    version: 1,
    id: draft.id,
    name: { zh: nameZh, en: nameEn },
    category: draft.category,
    sourceRefs: [customSource],
    era: { type: "all" },
    creditRating: { min: draft.creditRatingMin, max: draft.creditRatingMax },
    pointFormula: formulaResult.formula,
    skillRequirements: requirements,
  };
  const parsed = occupationDefinitionSchema.safeParse(candidate);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((issue) => issue.message) };
  }
  const definitionErrors = validateCustomOccupationDefinition(parsed.data);
  const capacity = calculateCustomOccupationSkillCapacity(parsed.data);
  if (definitionErrors.length > 0) {
    return { errors: definitionErrors, maximumSkills: capacity.maximumSkills };
  }
  return { definition: parsed.data, errors: [], maximumSkills: capacity.maximumSkills };
}

function formulaToDraft(formula: OccupationPointFormula): CustomOccupationFormulaDraft | undefined {
  if (formula.type === "attribute") {
    return { type: "single", attribute: formula.attribute, multiplier: formula.multiplier };
  }
  if (formula.type === "best-of") {
    return { type: "best-of", attributes: [...formula.attributes], multiplier: formula.multiplier };
  }
  if (formula.terms.length !== 2 || formula.terms.some((term) => term.type !== "attribute")) {
    return undefined;
  }
  const [first, second] = formula.terms;
  if (!first || !second || first.type !== "attribute" || second.type !== "attribute") return undefined;
  return {
    type: "sum-two",
    first: { attribute: first.attribute, multiplier: first.multiplier },
    second: { attribute: second.attribute, multiplier: second.multiplier },
  };
}

function requirementToSlot(
  requirement: OccupationRequirement,
): CustomOccupationSkillSlotDraft | undefined {
  const { selector, cardinality } = requirement;
  if (selector.type === "exact" && cardinality.min === 1 && cardinality.max === 1) {
    return selector.ref.type === "standard"
      ? { id: requirement.id, definitionId: selector.ref.definitionId, mode: "ordinary" }
      : {
        id: requirement.id,
        definitionId: selector.ref.definitionId,
        mode: "predefined",
        specializationId: selector.ref.specializationId,
      };
  }
  if (selector.type === "named-custom-specialization" &&
    cardinality.min === 1 && cardinality.max === 1) {
    return {
      id: requirement.id,
      definitionId: selector.definitionId,
      mode: "named-custom",
      customName: selector.name.zh,
    };
  }
  if (selector.type === "specialization-of" && cardinality.min === 1 &&
    (cardinality.max === 1 ||
      (cardinality.max === undefined &&
        (selector.definitionId === "fighting" || selector.definitionId === "firearms")))) {
    return {
      id: requirement.id,
      definitionId: selector.definitionId,
      mode: "specialization-of",
    };
  }
  return undefined;
}

export function createCustomOccupationDraftFromDefinition(
  definition: OccupationDefinition,
): CustomOccupationDraftResult {
  const errors: string[] = [];
  if (definition.variantOf || definition.skillReplacement || definition.prerequisites?.length ||
    definition.approval || definition.aliases || definition.tags?.length ||
    definition.recommendedContacts?.length || definition.summary) {
    errors.push("当前自定义职业包含 Builder 不支持的高级字段，无法安全编辑。");
  }
  if (definition.era.type !== "all") errors.push("Builder 只支持全时代自定义职业。");
  const formula = formulaToDraft(definition.pointFormula);
  if (!formula) errors.push("当前本职技能点公式不属于编辑器支持的单属性、两项相加或多属性取高形式。");
  const slots = definition.skillRequirements.map(requirementToSlot);
  if (slots.some((slot) => slot === undefined)) {
    errors.push("当前职业包含编辑器无法转换的本职技能栏位。");
  }
  if (!formula || slots.some((slot) => slot === undefined) || errors.length > 0) return { errors };
  return {
    draft: {
      id: definition.id,
      nameZh: definition.name.zh,
      nameEn: definition.name.en === definition.name.zh ? "" : definition.name.en,
      category: definition.category,
      creditRatingMin: definition.creditRating.min,
      creditRatingMax: definition.creditRating.max,
      pointFormula: formula,
      skillSlots: slots.filter((slot): slot is CustomOccupationSkillSlotDraft => slot !== undefined),
    },
    errors: [],
  };
}
