import type { CharacteristicValues } from "../types/attribute";
import type { Character } from "../types/character";
import {
  occupationDefinitionSchema,
  type NamedCustomSpecializationSelector,
  type OccupationDefinition,
  type OccupationRequirement,
  type SelectorCardinality,
  type SkillSelector,
} from "../types/occupation";
import {
  skillRefSchema,
  type CharacterSkill,
  type SkillDefinition,
  type SkillRef,
} from "../types/skill";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type {
  ApprovalReasonId,
  KeeperApprovalGrant,
  OccupationSelection,
  SkillCreationState,
} from "../../creation/types/skillCreation";
import { evaluateOccupationPointFormula } from "./occupationPointFormula";
import { evaluateOccupationPrerequisite } from "./occupationPrerequisite";
import { isOccupationAvailableInEra, isSkillAvailableInEra } from "./availability";
import {
  calculateSkillBaseValue,
  getSkillBaseValueRule,
  getSkillRefKey,
  validateCharacterSkills,
} from "./skills";

export type SkillAllocationErrorCode =
  | "missing-characteristics"
  | "existing-manual-skills"
  | "custom-occupation-skill-capacity"
  | "occupation-prerequisite"
  | "occupation-era-incompatible"
  | "skill-era-incompatible"
  | "preset-occupation-banned"
  | "invalid-occupation-skill-replacement"
  | "missing-requirement-selection"
  | "stale-requirement-selection"
  | "requirement-cardinality"
  | "selector-mismatch"
  | "duplicate-skill-selection"
  | "invalid-skill-ref"
  | "occupation-skill-not-eligible"
  | "creation-points-forbidden"
  | "occupation-budget-exceeded"
  | "interest-budget-exceeded"
  | "occupation-skill-final-limit"
  | "interest-only-skill-final-limit"
  | "global-skill-final-limit"
  | "character-skill-validation";

export type SkillAllocationWarningCode =
  | "unused-occupation-points"
  | "unused-interest-points";

export interface SkillAllocationIssue {
  readonly code: SkillAllocationErrorCode | SkillAllocationWarningCode;
  readonly message: string;
  readonly requirementId?: string;
  readonly refKey?: string;
}

export interface ApprovalRequirement {
  readonly reason: ApprovalReasonId;
  readonly subjectId?: string;
  readonly message: string;
}

export interface StructuredAllocationConflict {
  readonly hasConflict: boolean;
  readonly needsExplicitAdoptionOrReset: boolean;
  readonly existingSkillRefs: readonly SkillRef[];
}

export interface FinalizeSkillAllocationInput {
  readonly character: Character;
  readonly occupation: OccupationSelection;
  readonly state: SkillCreationState;
  readonly skillDefinitions: readonly SkillDefinition[];
  readonly preset?: CreationPreset;
}

export interface FinalizeSkillAllocationResult {
  readonly valid: boolean;
  readonly errors: readonly SkillAllocationIssue[];
  readonly warnings: readonly SkillAllocationIssue[];
  readonly approvals: readonly ApprovalRequirement[];
  readonly occupationBudget: number;
  readonly interestBudget: number;
  readonly remainingOccupationPoints: number;
  readonly remainingInterestPoints: number;
  readonly skills: readonly CharacterSkill[];
}

function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function instantiateNamedCustomSpecialization(
  selector: NamedCustomSpecializationSelector,
  specializationId: string,
  displayName = selector.name.en,
): SkillRef {
  return skillRefSchema.parse({
    type: "custom",
    definitionId: selector.definitionId,
    specializationId,
    displayName,
  });
}

export function matchesSkillSelector(ref: SkillRef, selector: SkillSelector): boolean {
  switch (selector.type) {
    case "exact":
      return getSkillRefKey(ref) === getSkillRefKey(selector.ref);
    case "specialization-of":
      return ref.type !== "standard" &&
        ref.definitionId === selector.definitionId &&
        !selector.exclude?.some((excluded) => getSkillRefKey(excluded) === getSkillRefKey(ref));
    case "named-custom-specialization": {
      if (ref.type !== "custom" || ref.definitionId !== selector.definitionId) return false;
      const actual = normalizeDisplayName(ref.displayName);
      return [selector.name.zh, selector.name.en]
        .map(normalizeDisplayName)
        .includes(actual);
    }
    case "one-branch":
      // This is union eligibility for one ref only. Whole-selection branch exclusivity is checked below.
      return selector.branches.some((branch) => matchesSkillSelector(ref, branch.selector));
    case "choice-pool":
      // This is union eligibility for one ref only. Whole-selection branch assignment is checked below.
      return selector.branches.some((branch) => matchesSkillSelector(ref, branch.selector));
    case "one-of":
      return selector.selectors.some((candidate) => matchesSkillSelector(ref, candidate));
    case "any-skill":
      return !selector.exclude?.some((excluded) => matchesSkillSelector(ref, excluded));
    case "all-of":
      return selector.groups.some((group) => matchesSkillSelector(ref, group.selector));
  }
}

function cardinalityMatches(count: number, cardinality: SelectorCardinality): boolean {
  return count >= cardinality.min && (cardinality.max === undefined || count <= cardinality.max);
}

function canAssignAllOf(
  refs: readonly SkillRef[],
  groups: Extract<SkillSelector, { type: "all-of" }>["groups"],
): boolean {
  const counts = groups.map(() => 0);

  function assign(index: number): boolean {
    if (index === refs.length) {
      return groups.every((group, groupIndex) => cardinalityMatches(counts[groupIndex] ?? 0, group.cardinality));
    }
    const ref = refs[index];
    if (!ref) return false;
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      if (!group || !matchesSkillSelector(ref, group.selector)) continue;
      const maximum = group.cardinality.max;
      if (maximum !== undefined && (counts[groupIndex] ?? 0) >= maximum) continue;
      counts[groupIndex] = (counts[groupIndex] ?? 0) + 1;
      if (assign(index + 1)) return true;
      counts[groupIndex] = (counts[groupIndex] ?? 1) - 1;
    }
    return false;
  }

  return assign(0);
}

function canAssignOneOf(
  refs: readonly SkillRef[],
  selectors: Extract<SkillSelector, { type: "one-of" }>["selectors"],
): boolean {
  const usedSelectors = selectors.map(() => false);

  function assign(index: number): boolean {
    if (index === refs.length) return true;
    const ref = refs[index];
    if (!ref) return false;
    for (let selectorIndex = 0; selectorIndex < selectors.length; selectorIndex += 1) {
      const selector = selectors[selectorIndex];
      if (!selector || usedSelectors[selectorIndex] || !matchesSkillSelector(ref, selector)) continue;
      usedSelectors[selectorIndex] = true;
      if (assign(index + 1)) return true;
      usedSelectors[selectorIndex] = false;
    }
    return false;
  }

  return assign(0);
}

function canAssignOneBranch(
  refs: readonly SkillRef[],
  branches: Extract<SkillSelector, { type: "one-branch" }>["branches"],
): boolean {
  // one-of models distinct child slots and intentionally consumes each child at most once.
  // one-branch instead derives one exclusive branch that accepts the complete selection
  // under that branch's own cardinality; no chosen branch identity needs to be persisted.
  return branches.some((branch) =>
    cardinalityMatches(refs.length, branch.cardinality) &&
    refs.every((ref) => matchesSkillSelector(ref, branch.selector)),
  );
}

export function canAssignChoicePool(
  refs: readonly SkillRef[],
  branches: Extract<SkillSelector, { type: "choice-pool" }>["branches"],
  selectedBranches: SelectorCardinality,
): boolean {
  const counts = branches.map(() => 0);

  function assign(index: number): boolean {
    if (index === refs.length) {
      const activeBranchIndexes = counts
        .map((count, branchIndex) => ({ count, branchIndex }))
        .filter(({ count }) => count > 0);
      return cardinalityMatches(activeBranchIndexes.length, selectedBranches) &&
        activeBranchIndexes.every(({ count, branchIndex }) => {
          const branch = branches[branchIndex];
          return branch !== undefined && cardinalityMatches(count, branch.cardinality);
        });
    }

    const ref = refs[index];
    if (!ref) return false;
    for (let branchIndex = 0; branchIndex < branches.length; branchIndex += 1) {
      const branch = branches[branchIndex];
      if (!branch || !matchesSkillSelector(ref, branch.selector)) continue;
      const maximum = branch.cardinality.max;
      if (maximum !== undefined && (counts[branchIndex] ?? 0) >= maximum) continue;
      counts[branchIndex] = (counts[branchIndex] ?? 0) + 1;
      if (assign(index + 1)) return true;
      counts[branchIndex] = (counts[branchIndex] ?? 1) - 1;
    }
    return false;
  }

  return assign(0);
}

export function validateOccupationRequirementSelection(
  requirement: OccupationRequirement,
  refs: readonly SkillRef[],
): SkillAllocationIssue[] {
  const errors: SkillAllocationIssue[] = [];
  if (!cardinalityMatches(refs.length, requirement.cardinality)) {
    errors.push({
      code: "requirement-cardinality",
      requirementId: requirement.id,
      message: `职业需求 ${requirement.id} 的选择数量不符合 ${requirement.cardinality.min}～${requirement.cardinality.max ?? "无上限"}`,
    });
  }
  const keys = new Set<string>();
  for (const ref of refs) {
    const key = getSkillRefKey(ref);
    if (keys.has(key)) {
      errors.push({
        code: "duplicate-skill-selection",
        requirementId: requirement.id,
        refKey: key,
        message: `职业需求 ${requirement.id} 重复选择了 ${key}`,
      });
    }
    keys.add(key);
  }
  const selectorMatches = requirement.selector.type === "all-of"
    ? canAssignAllOf(refs, requirement.selector.groups)
    : requirement.selector.type === "one-of"
      ? canAssignOneOf(refs, requirement.selector.selectors)
      : requirement.selector.type === "one-branch"
        ? canAssignOneBranch(refs, requirement.selector.branches)
        : requirement.selector.type === "choice-pool"
          ? canAssignChoicePool(
            refs,
            requirement.selector.branches,
            requirement.selector.selectedBranches,
          )
          : refs.every((ref) => matchesSkillSelector(ref, requirement.selector));
  if (!selectorMatches) {
    errors.push({
      code: "selector-mismatch",
      requirementId: requirement.id,
      message: `职业需求 ${requirement.id} 的技能选择不符合 selector`,
    });
  }
  return errors;
}

export function calculateInterestSkillBudget(characteristics: CharacteristicValues): number {
  return characteristics.INT * 2;
}

export function detectStructuredAllocationConflict(character: Character): StructuredAllocationConflict {
  const existingSkillRefs = character.skills?.map((skill) => skill.ref) ?? [];
  const hasConflict = existingSkillRefs.length > 0;
  return {
    hasConflict,
    needsExplicitAdoptionOrReset: hasConflict,
    existingSkillRefs,
  };
}

export function validateCustomOccupationDefinition(occupation: OccupationDefinition): readonly string[] {
  const parsed = occupationDefinitionSchema.safeParse(occupation);
  const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
  if (!occupation.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    errors.push("自定义职业必须使用 UUID identity");
  }
  const skillCapacity = calculateCustomOccupationSkillCapacity(occupation);
  errors.push(...skillCapacity.errors);
  return errors;
}

export interface CustomOccupationSkillCapacityResult {
  readonly valid: boolean;
  readonly maximumSkills?: number;
  readonly errors: readonly string[];
}

function calculateBranchSkillCapacity(
  branch: Extract<SkillSelector, { type: "one-branch" | "choice-pool" }>["branches"][number],
  outerMaximum: number | undefined,
): number | undefined {
  if (branch.cardinality.max !== undefined) return branch.cardinality.max;
  if (branch.selector.type === "exact") return 1;
  if (branch.selector.type === "specialization-of" &&
    (branch.selector.definitionId === "fighting" || branch.selector.definitionId === "firearms")) {
    return 1;
  }
  return outerMaximum;
}

export function calculateCustomOccupationSkillCapacity(
  occupation: OccupationDefinition,
): CustomOccupationSkillCapacityResult {
  let maximumSkills = 0;
  let hasUnboundedRequirement = false;
  const errors: string[] = [];
  for (const requirement of occupation.skillRequirements) {
    if (requirement.selector.type === "one-branch") {
      const branchCapacities = requirement.selector.branches.map((branch) =>
        calculateBranchSkillCapacity(branch, requirement.cardinality.max));
      if (branchCapacities.some((capacity) => capacity === undefined)) {
        hasUnboundedRequirement = true;
        errors.push(`自定义职业需求 ${requirement.id} 的 one-branch 无法证明有限容量`);
        continue;
      }
      const branchMaximum = Math.max(...branchCapacities.map((capacity) => capacity ?? 0));
      maximumSkills += requirement.cardinality.max === undefined
        ? branchMaximum
        : Math.min(branchMaximum, requirement.cardinality.max);
      continue;
    }
    if (requirement.selector.type === "choice-pool") {
      const branchCapacities = requirement.selector.branches.map((branch) =>
        calculateBranchSkillCapacity(branch, requirement.cardinality.max));
      if (branchCapacities.some((capacity) => capacity === undefined)) {
        hasUnboundedRequirement = true;
        errors.push(`自定义职业需求 ${requirement.id} 的 choice-pool 无法证明有限容量`);
        continue;
      }
      const maximumActiveBranches = requirement.selector.selectedBranches.max ??
        requirement.selector.branches.length;
      const poolMaximum = branchCapacities
        .map((capacity) => capacity ?? 0)
        .sort((left, right) => right - left)
        .slice(0, maximumActiveBranches)
        .reduce((sum, capacity) => sum + capacity, 0);
      maximumSkills += requirement.cardinality.max === undefined
        ? poolMaximum
        : Math.min(poolMaximum, requirement.cardinality.max);
      continue;
    }
    if (requirement.cardinality.max !== undefined) {
      maximumSkills += requirement.cardinality.max;
      continue;
    }
    const isGenericCombatSpecialization = requirement.selector.type === "specialization-of" &&
      (requirement.selector.definitionId === "fighting" || requirement.selector.definitionId === "firearms");
    if (isGenericCombatSpecialization) {
      maximumSkills += 1;
      continue;
    }
    hasUnboundedRequirement = true;
    errors.push(`自定义职业需求 ${requirement.id} 没有有限 max，无法证明职业技能不超过八项`);
  }
  if (maximumSkills > 8) {
    errors.push(`自定义职业最多允许八项职业技能；当前需求最多可产生 ${maximumSkills} 项`);
  }
  return {
    valid: errors.length === 0,
    ...(!hasUnboundedRequirement ? { maximumSkills } : {}),
    errors,
  };
}

export function occupationRequirementApprovalSubject(
  occupationId: string,
  requirementId: string,
): string {
  return `occupation:${occupationId}:requirement:${requirementId}`;
}

export function occupationSkillReplacementApprovalSubject(
  occupationId: string,
  policyId: string,
  targetRequirementId: string,
): string {
  return `occupation:${occupationId}:replacement:${policyId}:target:${targetRequirementId}`;
}

function hasApproval(
  grants: readonly KeeperApprovalGrant[],
  reason: ApprovalReasonId,
  subjectId?: string,
): boolean {
  return grants.some((grant) =>
    grant.reason === reason &&
    (subjectId === undefined || grant.subjectId === subjectId),
  );
}

function addApproval(
  approvals: ApprovalRequirement[],
  requirement: ApprovalRequirement,
): void {
  if (!approvals.some((existing) =>
    existing.reason === requirement.reason && existing.subjectId === requirement.subjectId,
  )) {
    approvals.push(requirement);
  }
}

function addSkillRef(map: Map<string, SkillRef>, ref: SkillRef): void {
  map.set(getSkillRefKey(ref), ref);
}

function formatEraForIssue(eraId: string): string {
  if (eraId === "classic-1920s") return "古典（1920年代）";
  if (eraId === "modern") return "现代";
  return eraId;
}

export function finalizeSkillAllocation(
  input: FinalizeSkillAllocationInput,
): FinalizeSkillAllocationResult {
  const { character, occupation, state, preset } = input;
  const definition = occupation.definitionSnapshot;
  const errors: SkillAllocationIssue[] = [];
  const warnings: SkillAllocationIssue[] = [];
  const approvals: ApprovalRequirement[] = [];
  const definitions = new Map(input.skillDefinitions.map((skill) => [skill.id, skill]));
  const characteristics = character.characteristics;

  if (!characteristics) {
    errors.push({ code: "missing-characteristics", message: "完成技能分配前必须存在最终属性" });
    return {
      valid: false,
      errors,
      warnings,
      approvals,
      occupationBudget: 0,
      interestBudget: 0,
      remainingOccupationPoints: 0,
      remainingInterestPoints: 0,
      skills: [],
    };
  }

  if (character.eraId && !isOccupationAvailableInEra(definition, character.eraId)) {
    errors.push({
      code: "occupation-era-incompatible",
      message: `职业【${definition.name.zh}】不适用于${formatEraForIssue(character.eraId)}`,
    });
  }

  const conflict = detectStructuredAllocationConflict(character);
  if (conflict.hasConflict && state.existingSkillResolution?.action !== "rebuild-structured") {
    errors.push({
      code: "existing-manual-skills",
      message: "已有手动 Character.skills；结构化分配需要显式采用并重建技能",
    });
  }
  if (occupation.kind === "custom") {
    for (const message of calculateCustomOccupationSkillCapacity(definition).errors) {
      errors.push({ code: "custom-occupation-skill-capacity", message });
    }
  }
  for (const prerequisite of definition.prerequisites ?? []) {
    if (!evaluateOccupationPrerequisite(prerequisite, characteristics)) {
      errors.push({ code: "occupation-prerequisite", message: `不满足职业 ${definition.id} 的属性前置条件` });
    }
  }

  if (preset?.occupationPolicy?.bannedOccupationIds?.includes(occupation.selectedOccupationId)) {
    errors.push({ code: "preset-occupation-banned", message: "当前 Preset 禁止该职业" });
  }
  if (preset?.occupationPolicy?.approvalRequiredOccupationIds?.includes(occupation.selectedOccupationId) &&
    !hasApproval(state.keeperApprovals, "preset-occupation-policy", occupation.selectedOccupationId)) {
    addApproval(approvals, {
      reason: "preset-occupation-policy",
      subjectId: occupation.selectedOccupationId,
      message: "当前 Preset 要求 Keeper 批准该职业",
    });
  }
  if (occupation.kind === "custom") {
    if (preset?.allowCustomOccupation === false) {
      errors.push({ code: "preset-occupation-banned", message: "当前 Preset 禁止自定义职业" });
    } else if (preset?.allowCustomOccupation === "keeper-approval" &&
      !hasApproval(state.keeperApprovals, "custom-occupation", occupation.selectedOccupationId)) {
      addApproval(approvals, {
        reason: "custom-occupation",
        subjectId: occupation.selectedOccupationId,
        message: "当前 Preset 要求 Keeper 批准自定义职业",
      });
    }
  }
  if (definition.approval &&
    !hasApproval(state.keeperApprovals, "occupation-definition", occupation.selectedOccupationId)) {
    addApproval(approvals, {
      reason: "occupation-definition",
      subjectId: occupation.selectedOccupationId,
      message: "职业定义本身要求 Keeper 批准",
    });
  }

  const requirements = new Map(definition.skillRequirements.map((requirement) => [requirement.id, requirement]));
  const selections = new Map(state.requirementSelections.map((selection) => [selection.requirementId, selection]));
  const occupationEligible = new Set<string>();
  const selectedSkillRefs = new Map<string, SkillRef>();
  const availabilitySkillRefs = new Map<string, SkillRef>();
  for (const selection of state.requirementSelections) {
    for (const ref of selection.refs) addSkillRef(availabilitySkillRefs, ref);
  }
  for (const allocation of state.allocations) addSkillRef(availabilitySkillRefs, allocation.ref);
  if (state.occupationSkillReplacement && definition.skillReplacement) {
    addSkillRef(availabilitySkillRefs, definition.skillReplacement.replacement.ref);
  }
  const usedAcrossRequirements = new Map<string, string>();
  let replacementTargetRequirementId: string | undefined;

  if (state.occupationSkillReplacement) {
    const replacementState = state.occupationSkillReplacement;
    const policy = definition.skillReplacement;
    const targetRequirement = requirements.get(replacementState.targetRequirementId);
    if (!policy ||
      policy.id !== replacementState.policyId ||
      !policy.targetRequirementIds.includes(replacementState.targetRequirementId) ||
      !targetRequirement) {
      errors.push({
        code: "invalid-occupation-skill-replacement",
        requirementId: replacementState.targetRequirementId,
        message: `职业技能 replacement 草稿与当前职业定义不匹配：${replacementState.policyId}/${replacementState.targetRequirementId}`,
      });
    } else {
      replacementTargetRequirementId = replacementState.targetRequirementId;
      if (selections.has(replacementTargetRequirementId)) {
        errors.push({
          code: "invalid-occupation-skill-replacement",
          requirementId: replacementTargetRequirementId,
          message: `被 replacement 替换的职业需求仍存在普通 selection：${replacementTargetRequirementId}`,
        });
      }
      const replacementRef = policy.replacement.ref;
      const replacementKey = getSkillRefKey(replacementRef);
      occupationEligible.add(replacementKey);
      addSkillRef(selectedSkillRefs, replacementRef);
      usedAcrossRequirements.set(replacementKey, replacementTargetRequirementId);

      const approvalSubject = occupationSkillReplacementApprovalSubject(
        occupation.selectedOccupationId,
        policy.id,
        replacementTargetRequirementId,
      );
      if (!hasApproval(state.keeperApprovals, "occupation-skill-replacement", approvalSubject)) {
        addApproval(approvals, {
          reason: "occupation-skill-replacement",
          subjectId: approvalSubject,
          message: `职业技能 replacement ${policy.id} 需要 Keeper 批准目标 ${replacementTargetRequirementId}`,
        });
      }
    }
  }

  for (const selection of state.requirementSelections) {
    if (!requirements.has(selection.requirementId)) {
      errors.push({
        code: "stale-requirement-selection",
        requirementId: selection.requirementId,
        message: `职业切换后遗留了无法匹配的 requirement selection：${selection.requirementId}`,
      });
    }
  }

  for (const requirement of definition.skillRequirements) {
    if (requirement.id === replacementTargetRequirementId) continue;
    const selection = selections.get(requirement.id);
    if (!selection) {
      errors.push({
        code: "missing-requirement-selection",
        requirementId: requirement.id,
        message: `尚未完成职业需求：${requirement.id}`,
      });
      continue;
    }
    const selectionErrors = validateOccupationRequirementSelection(requirement, selection.refs);
    errors.push(...selectionErrors);
    for (const ref of selection.refs) {
      const key = getSkillRefKey(ref);
      const previousRequirement = usedAcrossRequirements.get(key);
      if (previousRequirement) {
        errors.push({
          code: "duplicate-skill-selection",
          requirementId: requirement.id,
          refKey: key,
          message: `${key} 已用于职业需求 ${previousRequirement}，不能再次满足 ${requirement.id}`,
        });
      } else {
        usedAcrossRequirements.set(key, requirement.id);
        if (selectionErrors.length === 0) {
          occupationEligible.add(key);
          addSkillRef(selectedSkillRefs, ref);
        }
      }
    }
    const approvalSubject = occupationRequirementApprovalSubject(
      occupation.selectedOccupationId,
      requirement.id,
    );
    if (requirement.keeperReview &&
      !hasApproval(state.keeperApprovals, "fuzzy-requirement", approvalSubject)) {
      addApproval(approvals, {
        reason: "fuzzy-requirement",
        subjectId: approvalSubject,
        message: `职业需求 ${requirement.id} 需要 Keeper review`,
      });
    }
  }

  const creditRatingRef: SkillRef = { type: "standard", definitionId: "credit-rating" };
  const creditRatingKey = getSkillRefKey(creditRatingRef);
  occupationEligible.add(creditRatingKey);
  addSkillRef(selectedSkillRefs, creditRatingRef);

  let spentOccupationPoints = 0;
  let spentInterestPoints = 0;
  const allocations = new Map(state.allocations.map((allocation) => [getSkillRefKey(allocation.ref), allocation]));
  for (const allocation of state.allocations) {
    const key = getSkillRefKey(allocation.ref);
    addSkillRef(selectedSkillRefs, allocation.ref);
    spentOccupationPoints += allocation.occupationPoints;
    spentInterestPoints += allocation.interestPoints;
    if (allocation.occupationPoints > 0 && !occupationEligible.has(key)) {
      errors.push({
        code: "occupation-skill-not-eligible",
        refKey: key,
        message: `${key} 不是当前职业选择产生的本职技能`,
      });
    }
    const skillDefinition = definitions.get(allocation.ref.definitionId);
    if (!skillDefinition) {
      errors.push({ code: "invalid-skill-ref", refKey: key, message: `找不到技能定义：${allocation.ref.definitionId}` });
      continue;
    }
    try {
      getSkillBaseValueRule(skillDefinition, allocation.ref);
    } catch (error: unknown) {
      errors.push({
        code: "invalid-skill-ref",
        refKey: key,
        message: error instanceof Error ? error.message : `技能引用无效：${key}`,
      });
    }
    const allocatedPoints = allocation.occupationPoints + allocation.interestPoints;
    if (allocatedPoints > 0 && skillDefinition.creationPointPolicy === "forbidden") {
      errors.push({ code: "creation-points-forbidden", refKey: key, message: `${key} 不允许分配创建期技能点` });
    }
    if (allocatedPoints > 0 && skillDefinition.creationPointPolicy === "keeper-approval" &&
      !hasApproval(
        state.keeperApprovals,
        skillDefinition.id === "cthulhu-mythos"
          ? "cthulhu-mythos-allocation"
          : "skill-creation-point-policy",
        key,
      )) {
      const reason = skillDefinition.id === "cthulhu-mythos"
        ? "cthulhu-mythos-allocation" as const
        : "skill-creation-point-policy" as const;
      addApproval(approvals, {
        reason,
        subjectId: key,
        message: `${key} 的创建期点数需要 Keeper 批准`,
      });
    }
  }

  if (character.eraId) {
    for (const ref of selectedSkillRefs.values()) addSkillRef(availabilitySkillRefs, ref);
    for (const [key, ref] of availabilitySkillRefs) {
      const skillDefinition = definitions.get(ref.definitionId);
      if (skillDefinition && !isSkillAvailableInEra(skillDefinition, character.eraId)) {
        errors.push({
          code: "skill-era-incompatible",
          refKey: key,
          message: `技能【${skillDefinition.name.zh}】不适用于${formatEraForIssue(character.eraId)}`,
        });
      }
    }
  }

  const occupationBudget = evaluateOccupationPointFormula(definition.pointFormula, characteristics);
  const interestBudget = calculateInterestSkillBudget(characteristics);
  if (spentOccupationPoints > occupationBudget) {
    errors.push({ code: "occupation-budget-exceeded", message: "职业技能点超过预算" });
  } else if (spentOccupationPoints < occupationBudget) {
    warnings.push({ code: "unused-occupation-points", message: `尚有 ${occupationBudget - spentOccupationPoints} 点职业技能点未分配` });
  }
  if (spentInterestPoints > interestBudget) {
    errors.push({ code: "interest-budget-exceeded", message: "兴趣技能点超过预算" });
  } else if (spentInterestPoints < interestBudget) {
    warnings.push({ code: "unused-interest-points", message: `尚有 ${interestBudget - spentInterestPoints} 点兴趣技能点未分配` });
  }

  const finalizedSkills: CharacterSkill[] = [];
  for (const [key, ref] of [...selectedSkillRefs.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const skillDefinition = definitions.get(ref.definitionId);
    if (!skillDefinition) {
      if (!errors.some((issue) => issue.code === "invalid-skill-ref" && issue.refKey === key)) {
        errors.push({ code: "invalid-skill-ref", refKey: key, message: `找不到技能定义：${ref.definitionId}` });
      }
      continue;
    }
    let baseValue: number;
    try {
      baseValue = calculateSkillBaseValue(getSkillBaseValueRule(skillDefinition, ref), characteristics);
    } catch (error: unknown) {
      if (!errors.some((issue) => issue.code === "invalid-skill-ref" && issue.refKey === key)) {
        errors.push({
          code: "invalid-skill-ref",
          refKey: key,
          message: error instanceof Error ? error.message : `技能引用无效：${key}`,
        });
      }
      continue;
    }
    const allocation = allocations.get(key);
    const currentValue = baseValue + (allocation?.occupationPoints ?? 0) + (allocation?.interestPoints ?? 0);
    const limits = preset?.skillLimits;
    if (limits?.maxOccupationSkillFinalValue !== undefined &&
      occupationEligible.has(key) && currentValue > limits.maxOccupationSkillFinalValue) {
      errors.push({ code: "occupation-skill-final-limit", refKey: key, message: `${key} 超过职业技能最终值上限` });
    }
    if (limits?.maxInterestOnlySkillFinalValue !== undefined &&
      !occupationEligible.has(key) && currentValue > limits.maxInterestOnlySkillFinalValue) {
      errors.push({ code: "interest-only-skill-final-limit", refKey: key, message: `${key} 超过非职业兴趣技能最终值上限` });
    }
    if (limits?.maxSkillFinalValue !== undefined && currentValue > limits.maxSkillFinalValue) {
      errors.push({ code: "global-skill-final-limit", refKey: key, message: `${key} 超过全局技能最终值上限` });
    }
    finalizedSkills.push({ ref, currentValue, improvementChecked: false });
  }

  const characterSkillValidation = validateCharacterSkills(finalizedSkills, input.skillDefinitions);
  for (const message of characterSkillValidation.errors) {
    errors.push({ code: "character-skill-validation", message });
  }

  const creditRating = finalizedSkills.find((skill) => getSkillRefKey(skill.ref) === creditRatingKey)?.currentValue ?? 0;
  if ((creditRating < definition.creditRating.min || creditRating > definition.creditRating.max) &&
    !(state.creditRatingOverride?.approved &&
      state.creditRatingOverride.occupationId === occupation.selectedOccupationId)) {
    addApproval(approvals, {
      reason: "credit-rating-override",
      subjectId: creditRatingKey,
      message: `最终 Credit Rating ${creditRating} 超出职业范围 ${definition.creditRating.min}～${definition.creditRating.max}`,
    });
  }

  return {
    valid: errors.length === 0 && approvals.length === 0,
    errors,
    warnings,
    approvals,
    occupationBudget,
    interestBudget,
    remainingOccupationPoints: occupationBudget - spentOccupationPoints,
    remainingInterestPoints: interestBudget - spentInterestPoints,
    skills: finalizedSkills,
  };
}
