import {
  occupationDefinitionSchema,
  type EraId,
  type OccupationCategoryId,
  type OccupationDefinition,
  type SelectorCardinality,
  type SkillSelector,
} from "../coc7/types/occupation";
import type { SettingId } from "../coc7/types/setting";
import type { SettingPack } from "../coc7/types/settingPack";
import { stableMachineIdSchema, type SkillRef } from "../coc7/types/skill";
import { getSkillBaseValueRule } from "../coc7/rules/skills";
import { getSettingPack } from "./registry";
import { getSkillRegistry, type SkillRegistry } from "./skillRegistry";

export interface OccupationFilters {
  readonly category?: OccupationCategoryId;
  readonly tag?: string;
  readonly era?: EraId;
}

export interface OccupationRegistry {
  readonly definitions: readonly OccupationDefinition[];
  get(id: string): OccupationDefinition | undefined;
  list(filters?: OccupationFilters): readonly OccupationDefinition[];
  search(query: string, filters?: OccupationFilters): readonly OccupationDefinition[];
}

function validateExactRef(ref: SkillRef, skills: SkillRegistry): void {
  const definition = skills.get(ref.definitionId);
  if (!definition) throw new Error(`职业 selector 引用了未知技能：${ref.definitionId}`);
  try {
    getSkillBaseValueRule(definition, ref);
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : `职业 selector 技能引用无效：${ref.definitionId}`);
  }
}

function validateSelector(selector: SkillSelector, skills: SkillRegistry): void {
  switch (selector.type) {
    case "exact":
      validateExactRef(selector.ref, skills);
      return;
    case "specialization-of": {
      const definition = skills.get(selector.definitionId);
      if (!definition) throw new Error(`职业 selector 引用了未知技能：${selector.definitionId}`);
      if (definition.specialization.type !== "required") {
        throw new Error(`技能 ${selector.definitionId} 不是专业化技能`);
      }
      selector.exclude?.forEach((ref) => {
        if (ref.definitionId !== selector.definitionId) {
          throw new Error(
            `专业化 selector ${selector.definitionId} 的 exclude 必须引用同一技能定义`,
          );
        }
        validateExactRef(ref, skills);
      });
      return;
    }
    case "named-custom-specialization": {
      const definition = skills.get(selector.definitionId);
      if (!definition) throw new Error(`职业 selector 引用了未知技能：${selector.definitionId}`);
      if (definition.specialization.type !== "required" || !definition.specialization.allowCustom) {
        throw new Error(`技能 ${selector.definitionId} 不允许固定名称的自定义专业化`);
      }
      return;
    }
    case "one-branch":
      selector.branches.forEach((branch) => validateSelector(branch.selector, skills));
      return;
    case "choice-pool":
      selector.branches.forEach((branch) => validateSelector(branch.selector, skills));
      return;
    case "one-of":
      selector.selectors.forEach((child) => validateSelector(child, skills));
      return;
    case "any-skill":
      selector.exclude?.forEach((child) => validateSelector(child, skills));
      return;
    case "all-of":
      selector.groups.forEach((group) => validateSelector(group.selector, skills));
      return;
  }
}

function cardinalitiesOverlap(
  left: SelectorCardinality,
  right: SelectorCardinality,
): boolean {
  const minimum = Math.max(left.min, right.min);
  const maximum = Math.min(left.max ?? Number.POSITIVE_INFINITY, right.max ?? Number.POSITIVE_INFINITY);
  return minimum <= maximum;
}

function validateSelectorCardinality(
  selector: SkillSelector,
  cardinality: SelectorCardinality,
  context: string,
): void {
  if (selector.type === "exact") {
    if (cardinality.min > 1 || (cardinality.max !== undefined && cardinality.max > 1)) {
      throw new Error(`${context} 的 exact selector 最多只能选择一项技能`);
    }
    return;
  }

  if (selector.type === "one-branch") {
    selector.branches.forEach((branch, index) => {
      const branchContext = `${context}.one-branch[${index}]`;
      validateSelectorCardinality(branch.selector, branch.cardinality, branchContext);
      if (!cardinalitiesOverlap(cardinality, branch.cardinality)) {
        throw new Error(`${branchContext} 的 cardinality 与外层 requirement 不相容`);
      }
    });
    return;
  }

  if (selector.type === "choice-pool") {
    const available = selector.branches.length;
    if (selector.selectedBranches.min > available) {
      throw new Error(`${context} 的 selectedBranches.min ${selector.selectedBranches.min} 超过 ${available} 个 branch`);
    }
    if (selector.selectedBranches.max !== undefined && selector.selectedBranches.max > available) {
      throw new Error(`${context} 的 selectedBranches.max ${selector.selectedBranches.max} 超过 ${available} 个 branch`);
    }
    selector.branches.forEach((branch, index) => {
      validateSelectorCardinality(
        branch.selector,
        branch.cardinality,
        `${context}.choice-pool[${index}]`,
      );
    });

    const minimumActiveBranches = selector.selectedBranches.min;
    const minimumPossibleRefs = selector.branches
      .map((branch) => branch.cardinality.min)
      .sort((left, right) => left - right)
      .slice(0, minimumActiveBranches)
      .reduce((sum, minimum) => sum + minimum, 0);
    if (cardinality.max !== undefined && cardinality.max < minimumPossibleRefs) {
      throw new Error(
        `${context} 的外层 max ${cardinality.max} 低于 choice-pool minimum possible refs ${minimumPossibleRefs}`,
      );
    }

    const maximumActiveBranches = selector.selectedBranches.max ?? available;
    const boundedBranchMaximums = selector.branches.map((branch) => branch.cardinality.max);
    if (boundedBranchMaximums.every((maximum) => maximum !== undefined)) {
      const maximumPossibleRefs = boundedBranchMaximums
        .map((maximum) => maximum ?? 0)
        .sort((left, right) => right - left)
        .slice(0, maximumActiveBranches)
        .reduce((sum, maximum) => sum + maximum, 0);
      if (cardinality.min > maximumPossibleRefs) {
        throw new Error(
          `${context} 的外层 min ${cardinality.min} 超过 choice-pool maximum possible refs ${maximumPossibleRefs}`,
        );
      }
    }
    return;
  }

  if (selector.type === "one-of") {
    const available = selector.selectors.length;
    if (cardinality.min > available) {
      throw new Error(`${context} 的 min ${cardinality.min} 超过 one-of 的 ${available} 个子 selector`);
    }
    if (cardinality.max !== undefined && cardinality.max > available) {
      throw new Error(`${context} 的 max ${cardinality.max} 超过 one-of 的 ${available} 个子 selector`);
    }
    selector.selectors.forEach((child, index) => {
      validateNestedSelectorStructure(child, `${context}.one-of[${index}]`);
    });
    return;
  }

  if (selector.type === "all-of") {
    const innerMinimum = selector.groups.reduce((sum, group) => sum + group.cardinality.min, 0);
    if (cardinality.max !== undefined && innerMinimum > cardinality.max) {
      throw new Error(`${context} 的 all-of 内部 minimum ${innerMinimum} 超过外层 max ${cardinality.max}`);
    }
    const hasBoundedMaximum = selector.groups.every((group) => group.cardinality.max !== undefined);
    if (hasBoundedMaximum) {
      const innerMaximum = selector.groups.reduce(
        (sum, group) => sum + (group.cardinality.max ?? 0),
        0,
      );
      if (cardinality.min > innerMaximum) {
        throw new Error(`${context} 的外层 min ${cardinality.min} 超过 all-of 内部 maximum ${innerMaximum}`);
      }
    }
    selector.groups.forEach((group, index) => {
      validateSelectorCardinality(group.selector, group.cardinality, `${context}.all-of[${index}]`);
    });
    return;
  }

  validateNestedSelectorStructure(selector, context);
}

function validateNestedSelectorStructure(selector: SkillSelector, context: string): void {
  switch (selector.type) {
    case "one-branch":
      selector.branches.forEach((branch, index) => {
        validateSelectorCardinality(
          branch.selector,
          branch.cardinality,
          `${context}.one-branch[${index}]`,
        );
      });
      return;
    case "choice-pool":
      selector.branches.forEach((branch, index) => {
        validateSelectorCardinality(
          branch.selector,
          branch.cardinality,
          `${context}.choice-pool[${index}]`,
        );
      });
      return;
    case "one-of":
      selector.selectors.forEach((child, index) => {
        validateNestedSelectorStructure(child, `${context}.one-of[${index}]`);
      });
      return;
    case "all-of":
      selector.groups.forEach((group, index) => {
        validateSelectorCardinality(group.selector, group.cardinality, `${context}.all-of[${index}]`);
      });
      return;
    case "any-skill":
      selector.exclude?.forEach((child, index) => {
        validateNestedSelectorStructure(child, `${context}.exclude[${index}]`);
      });
      return;
    case "exact":
    case "specialization-of":
    case "named-custom-specialization":
      return;
  }
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function matchesFilters(occupation: OccupationDefinition, filters?: OccupationFilters): boolean {
  if (!filters) return true;
  if (filters.category && occupation.category !== filters.category) return false;
  if (filters.tag && !occupation.tags?.includes(filters.tag)) return false;
  if (filters.era && occupation.era.type === "specific" && !occupation.era.eraIds.includes(filters.era)) {
    return false;
  }
  return true;
}

export function createOccupationRegistry(
  pack: Pick<SettingPack, "eras" | "occupations">,
  skills: SkillRegistry,
): OccupationRegistry {
  const definitions = pack.occupations.map((occupation) => occupationDefinitionSchema.parse(occupation));
  const byId = new Map<string, OccupationDefinition>();
  const eraIds = new Set(pack.eras ?? []);

  for (const occupation of definitions) {
    if (!stableMachineIdSchema.safeParse(occupation.id).success) {
      throw new Error(`SettingPack 职业必须使用 kebab-case ID：${occupation.id}`);
    }
    if (byId.has(occupation.id)) throw new Error(`重复的职业 ID：${occupation.id}`);
    if (occupation.era.type === "specific") {
      for (const eraId of occupation.era.eraIds) {
        if (!eraIds.has(eraId)) throw new Error(`职业 ${occupation.id} 引用了未声明时代：${eraId}`);
      }
    }
    occupation.skillRequirements.forEach((requirement) => {
      validateSelector(requirement.selector, skills);
      validateSelectorCardinality(
        requirement.selector,
        requirement.cardinality,
        `职业 ${occupation.id} 的 requirement ${requirement.id}`,
      );
    });
    if (occupation.skillReplacement) {
      validateSelector(occupation.skillReplacement.replacement, skills);
    }
    byId.set(occupation.id, occupation);
  }

  return {
    definitions,
    get: (id) => byId.get(id),
    list: (filters) => definitions.filter((occupation) => matchesFilters(occupation, filters)),
    search: (query, filters) => {
      const normalized = normalizeSearchText(query);
      return definitions.filter((occupation) => {
        if (!matchesFilters(occupation, filters)) return false;
        if (normalized.length === 0) return true;
        const names = [
          occupation.name.zh,
          occupation.name.en,
          ...(occupation.aliases?.zh ?? []),
          ...(occupation.aliases?.en ?? []),
        ];
        return names.some((name) => normalizeSearchText(name).includes(normalized));
      });
    },
  };
}

const occupationRegistries = new Map<SettingId, OccupationRegistry>();
const emptyOccupationRegistry: OccupationRegistry = {
  definitions: [],
  get: () => undefined,
  list: () => [],
  search: () => [],
};

export function getOccupationRegistry(settingId: SettingId): OccupationRegistry {
  const cached = occupationRegistries.get(settingId);
  if (cached) return cached;
  const pack = getSettingPack(settingId);
  const registry = pack
    ? createOccupationRegistry(pack, getSkillRegistry(settingId))
    : emptyOccupationRegistry;
  occupationRegistries.set(settingId, registry);
  return registry;
}
