import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { deriveFinalCharacteristics, getAgeAdjustmentRule, runEduImprovements, validateEduImprovementHistory, validateReductionAllocation } from "../../coc7/rules/age";
import {
  applyLowRollBoost,
  defaultPointBuyConfig,
  getMinimumPointBuyValues,
  rollAssignResults,
  rollLowRollBoost,
  rollMultipleCharacteristics,
  rollStandardCharacteristics,
  validateAssignRoll,
  validatePointBuy,
} from "../../coc7/rules/attributes";
import { rollLuck, validateRolledLuck } from "../../coc7/rules/luck";
import { systemRandomSource, type RandomSource } from "../../coc7/rules/random";
import { clampSanityToMaximum, deriveStandardCharacterValues } from "../../coc7/rules/derived";
import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import {
  finalizeSkillAllocation,
  instantiateNamedCustomSpecialization,
  matchesSkillSelector,
  occupationRequirementApprovalSubject,
  occupationSkillReplacementApprovalSubject,
  validateCustomOccupationDefinition,
  type ApprovalRequirement,
  type FinalizeSkillAllocationResult,
} from "../../coc7/rules/occupationSkills";
import { getSkillRefKey } from "../../coc7/rules/skills";
import { deriveStandardInitialWealth } from "../../coc7/rules/wealth";
import {
  characteristicValueSchema,
  characteristicValuesSchema,
  type CharacteristicId,
  type CharacteristicValues,
  type PartialCharacteristicValues,
} from "../../coc7/types/attribute";
import type { Character } from "../../coc7/types/character";
import {
  occupationDefinitionSchema,
  type NamedCustomSpecializationSelector,
  type OccupationDefinition,
  type SkillSelector,
} from "../../coc7/types/occupation";
import { skillRefSchema, type SkillRef } from "../../coc7/types/skill";
import type { SettingId } from "../../coc7/types/setting";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import type { CharacterRecord, CreationSessionRecord } from "../../db/records";
import {
  resolveAttributeGenerationConfig,
  type AttributeGenerationConfig,
  type AttributeGenerationMethod,
  type CreationPreset,
} from "../types/creationPreset";
import type {
  AgeAdjustmentState,
  AttributeGenerationState,
  AttributeState,
  CreationSession,
  CreationStepId,
} from "../types/creationSession";
import { replaceOccupationSelection, resetOccupationAllocation } from "../rules/skillDraft";
import {
  getActiveOccupationSkillReplacement,
  getDeterministicRequirementSelection,
  listRequirementCustomOptions,
} from "../rules/requirementSelection";
import { listOccupationAllocationRefs } from "../rules/skillAllocationPresentation";
import { validateCreationBackstory } from "../rules/creationBackstory";
import {
  getFinalCreditRating,
  isStandardWealthEraId,
  validateCreationWealth,
} from "../rules/creationWealth";
import {
  skillAllocationSchema,
  type ApprovalReasonId,
  type SkillCreationState,
} from "../types/skillCreation";

function emptyAgeAdjustment(age: number): AgeAdjustmentState {
  return { age, reductionAllocation: {}, eduImprovements: [] };
}

function makeGeneration(
  method: AttributeGenerationMethod,
  generationConfig: AttributeGenerationConfig,
): AttributeGenerationState {
  switch (method) {
    case "standard-roll": return { method };
    case "low-roll-boost": return { method, allocation: {} };
    case "assign-roll": return { method, assignments: {} };
    case "multi-roll": return { method };
    case "point-buy": return {
      method,
      values: getMinimumPointBuyValues(generationConfig.pointBuy ?? defaultPointBuyConfig),
    };
    case "manual": return { method, values: {} };
  }
}

function baseFromGeneration(generation: AttributeGenerationState): CharacteristicValues | undefined {
  return generation.baseCharacteristics;
}

function listNamedCustomSelectors(
  selector: SkillSelector,
): readonly NamedCustomSpecializationSelector[] {
  switch (selector.type) {
    case "named-custom-specialization":
      return [selector];
    case "one-of":
      return selector.selectors.flatMap(listNamedCustomSelectors);
    case "all-of":
      return selector.groups.flatMap((group) => listNamedCustomSelectors(group.selector));
    case "one-branch":
    case "choice-pool":
      return selector.branches.flatMap((branch) => listNamedCustomSelectors(branch.selector));
    case "exact":
    case "specialization-of":
    case "any-skill":
      return [];
  }
}

function addDeterministicRequirementSelections(
  definition: OccupationDefinition,
  state: SkillCreationState,
): SkillCreationState {
  const activeReplacement = getActiveOccupationSkillReplacement(definition, state);
  const existingRequirementIds = new Set(
    state.requirementSelections.map((selection) => selection.requirementId),
  );
  const additions = definition.skillRequirements.flatMap((requirement) => {
    if (requirement.id === activeReplacement?.targetRequirementId ||
      existingRequirementIds.has(requirement.id)) return [];
    const ref = getDeterministicRequirementSelection(requirement);
    return ref ? [{ requirementId: requirement.id, refs: [ref] }] : [];
  });
  return additions.length === 0
    ? state
    : { ...state, requirementSelections: [...state.requirementSelections, ...additions] };
}

function haveSameSkillRefKeys(left: readonly SkillRef[], right: readonly SkillRef[]): boolean {
  const leftKeys = new Set(left.map(getSkillRefKey));
  const rightKeys = new Set(right.map(getSkillRefKey));
  return leftKeys.size === rightKeys.size && [...leftKeys].every((key) => rightKeys.has(key));
}

function haveSameCustomOccupationApprovalMechanics(
  left: OccupationDefinition,
  right: OccupationDefinition,
): boolean {
  const approvalMechanics = (definition: OccupationDefinition) => ({
    era: definition.era,
    creditRating: definition.creditRating,
    pointFormula: definition.pointFormula,
    skillRequirements: definition.skillRequirements,
    skillReplacement: definition.skillReplacement,
    prerequisites: definition.prerequisites,
    approval: definition.approval,
  });
  return JSON.stringify(approvalMechanics(left)) === JSON.stringify(approvalMechanics(right));
}

function haveSameCreditRatingRange(
  left: OccupationDefinition,
  right: OccupationDefinition,
): boolean {
  return left.creditRating.min === right.creditRating.min &&
    left.creditRating.max === right.creditRating.max;
}

export const useCreationStore = defineStore("creation", () => {
  const creating = ref(false);
  const current = ref<CreationSessionRecord>();
  const sessionSteps = ref<Readonly<Record<string, CreationStepId>>>({});
  const sessionStepsLoaded = ref(false);
  const randomSource = ref<RandomSource>(systemRandomSource);
  let skillAllocationWriteQueue: Promise<void> = Promise.resolve();

  const config = computed(() => resolveAttributeGenerationConfig(current.value?.data.presetSnapshot));

  function requireSession(): CreationSession {
    if (!current.value) throw new Error("尚未载入建卡会话");
    return current.value.data;
  }

  async function persist(session: CreationSession): Promise<CreationSessionRecord> {
    const record = await creationSessionRepository.update(session);
    current.value = record;
    return record;
  }

  function enqueueSkillAllocationWrite<Result>(mutation: () => Promise<Result>): Promise<Result> {
    const pending = skillAllocationWriteQueue.then(mutation);
    skillAllocationWriteQueue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  async function flushSkillAllocationWrites(): Promise<void> {
    while (true) {
      const pending = skillAllocationWriteQueue;
      await pending;
      if (pending === skillAllocationWriteQueue) return;
    }
  }

  async function start(settingId: SettingId, preset?: CreationPreset): Promise<string> {
    getSettingPackOrThrow(settingId);
    if (preset && preset.settingId !== settingId) throw new Error("预设与所选建卡环境不一致");
    creating.value = true;
    try {
      const characterId = crypto.randomUUID();
      const character: Character = { version: 1, id: characterId, name: "未命名调查员", settingId };
      const session: CreationSession = {
        version: 1,
        characterId,
        settingId,
        currentStep: "basic-info",
        ...(preset ? { presetSnapshot: preset } : {}),
      };
      const records = await creationWorkflowRepository.createCharacterWithSession(character, session);
      current.value = records.session;
      return characterId;
    } finally {
      creating.value = false;
    }
  }

  async function loadByCharacterId(characterId: string): Promise<CreationSessionRecord | undefined> {
    const record = await creationSessionRepository.getByCharacterId(characterId);
    current.value = record;
    return record;
  }

  async function loadSessionSteps(): Promise<void> {
    sessionStepsLoaded.value = false;
    try {
      const records = await creationSessionRepository.list();
      sessionSteps.value = Object.fromEntries(
        records.map((record) => [record.characterId, record.data.currentStep]),
      );
    } finally {
      sessionStepsLoaded.value = true;
    }
  }

  async function setCurrentStep(step: CreationStepId): Promise<void> {
    await flushSkillAllocationWrites();
    await persist({ ...requireSession(), currentStep: step });
  }

  function emptySkillCreationState(): SkillCreationState {
    return { requirementSelections: [], allocations: [], keeperApprovals: [] };
  }

  async function selectCatalogOccupation(occupationId: string): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    const definition = getOccupationRegistry(session.settingId).get(occupationId);
    if (!definition) throw new Error(`找不到职业：${occupationId}`);
    await persist({
      ...replaceOccupationSelection(session, {
        kind: "catalog",
        selectedOccupationId: definition.id,
        definitionSnapshot: definition,
      }),
      skills: session.skills ?? emptySkillCreationState(),
    });
  }

  async function selectCustomOccupation(definition: OccupationDefinition): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (session.presetSnapshot?.allowCustomOccupation === false) {
      throw new Error("当前 KP 预设禁止自定义职业");
    }
    const parsed = occupationDefinitionSchema.parse(definition);
    const errors = validateCustomOccupationDefinition(parsed);
    if (errors.length > 0) throw new Error(errors.join("；"));
    let skills = session.skills ?? emptySkillCreationState();
    if (session.occupation?.kind === "custom" &&
      session.occupation.selectedOccupationId === parsed.id) {
      const previousDefinition = session.occupation.definitionSnapshot;
      if (!haveSameCustomOccupationApprovalMechanics(previousDefinition, parsed)) {
        skills = {
          ...skills,
          keeperApprovals: skills.keeperApprovals.filter((grant) =>
            grant.reason !== "custom-occupation" || grant.subjectId !== parsed.id,
          ),
        };
      }
      if (!haveSameCreditRatingRange(previousDefinition, parsed) &&
        skills.creditRatingOverride?.occupationId === parsed.id) {
        const { creditRatingOverride: _staleOverride, ...skillsWithoutOverride } = skills;
        skills = skillsWithoutOverride;
      }
    }
    await persist({
      ...replaceOccupationSelection(session, {
        kind: "custom",
        selectedOccupationId: parsed.id,
        definitionSnapshot: parsed,
      }),
      skills,
    });
  }

  async function setSkillCreationState(skills: SkillCreationState): Promise<void> {
    await persist({ ...requireSession(), skills });
  }

  async function setSkillAllocationImmediate(
    ref: SkillRef,
    occupationPoints: number,
    interestPoints: number,
  ): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const allocation = skillAllocationSchema.parse({
      ref: skillRefSchema.parse(ref),
      occupationPoints,
      interestPoints,
    });
    const key = getSkillRefKey(allocation.ref);
    const allocations = session.skills.allocations.filter(
      (current) => getSkillRefKey(current.ref) !== key,
    );
    const existingIndex = session.skills.allocations.findIndex(
      (current) => getSkillRefKey(current.ref) === key,
    );
    if (allocation.occupationPoints !== 0 || allocation.interestPoints !== 0) {
      if (existingIndex >= 0) allocations.splice(existingIndex, 0, allocation);
      else allocations.push(allocation);
    }
    await persist({
      ...session,
      skills: { ...session.skills, allocations },
    });
  }

  function setSkillAllocation(
    ref: SkillRef,
    occupationPoints: number,
    interestPoints: number,
  ): Promise<void> {
    return enqueueSkillAllocationWrite(() =>
      setSkillAllocationImmediate(ref, occupationPoints, interestPoints),
    );
  }

  async function setSkillAllocationPoint(
    ref: SkillRef,
    field: "occupationPoints" | "interestPoints",
    value: number,
  ): Promise<void> {
    await enqueueSkillAllocationWrite(async () => {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("技能点必须是非负整数");
      }
      const parsedRef = skillRefSchema.parse(ref);
      const session = requireSession();
      if (!session.occupation || !session.skills) {
        throw new Error("职业或技能创建状态尚未初始化");
      }
      const key = getSkillRefKey(parsedRef);
      const currentAllocation = session.skills.allocations.find(
        (allocation) => getSkillRefKey(allocation.ref) === key,
      );
      await setSkillAllocationImmediate(
        parsedRef,
        field === "occupationPoints"
          ? value
          : currentAllocation?.occupationPoints ?? 0,
        field === "interestPoints"
          ? value
          : currentAllocation?.interestPoints ?? 0,
      );
    });
  }

  async function removeSkillAllocationImmediate(ref: SkillRef): Promise<void> {
    const parsed = skillRefSchema.parse(ref);
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const key = getSkillRefKey(parsed);
    const allocations = session.skills.allocations.filter(
      (allocation) => getSkillRefKey(allocation.ref) !== key,
    );
    if (allocations.length === session.skills.allocations.length) return;
    await persist({ ...session, skills: { ...session.skills, allocations } });
  }

  function removeSkillAllocation(ref: SkillRef): Promise<void> {
    return enqueueSkillAllocationWrite(() => removeSkillAllocationImmediate(ref));
  }

  async function createCustomInterestAllocationImmediate(
    definitionId: string,
    displayName: string,
    interestPoints: number,
  ): Promise<SkillRef> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const trimmedName = displayName.trim();
    if (!trimmedName) throw new Error("自定义专业化名称不能为空");
    if (!Number.isInteger(interestPoints) || interestPoints <= 0) {
      throw new Error("兴趣技能点必须是正整数");
    }

    const skillRegistry = getSkillRegistry(session.settingId);
    const definition = skillRegistry.get(definitionId);
    if (!definition) throw new Error(`找不到技能定义：${definitionId}`);
    if (definition.specialization.type !== "required" || !definition.specialization.allowCustom) {
      throw new Error("该技能不允许创建自定义专业化");
    }

    const character = await characterRepository.getById(session.characterId);
    if (!character) throw new Error("找不到当前调查员");
    if ((getSettingPackOrThrow(session.settingId).eras?.length ?? 0) > 0 && !character.data.eraId) {
      throw new Error("请先选择建卡时代");
    }
    if (character.data.eraId && !isSkillAvailableInEra(definition, character.data.eraId)) {
      throw new Error("该技能不适用于当前建卡时代");
    }

    if (!definition.specialization.allowMultiple) {
      const occupationRefs = listOccupationAllocationRefs(
        session.occupation.definitionSnapshot,
        session.skills,
      );
      const alreadyExists = [...occupationRefs, ...session.skills.allocations.map(({ ref }) => ref)]
        .some((ref) => ref.definitionId === definition.id);
      if (alreadyExists) throw new Error(`${definition.name.zh}只允许一个专业化实例`);
    }

    const ref = skillRefSchema.parse({
      type: "custom",
      definitionId: definition.id,
      specializationId: crypto.randomUUID(),
      displayName: trimmedName,
    });
    await setSkillAllocationImmediate(ref, 0, interestPoints);
    return ref;
  }

  function createCustomInterestAllocation(
    definitionId: string,
    displayName: string,
    interestPoints: number,
  ): Promise<SkillRef> {
    return enqueueSkillAllocationWrite(() =>
      createCustomInterestAllocationImmediate(definitionId, displayName, interestPoints),
    );
  }

  async function ensureDeterministicRequirementSelections(): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }

    const nextSkills = addDeterministicRequirementSelections(
      session.occupation.definitionSnapshot,
      session.skills,
    );
    if (nextSkills === session.skills) return;

    await persist({
      ...session,
      skills: nextSkills,
    });
  }

  async function setRequirementSelection(
    requirementId: string,
    refs: readonly SkillRef[],
  ): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const requirement = session.occupation.definitionSnapshot.skillRequirements.find(
      (candidate) => candidate.id === requirementId,
    );
    if (!requirement) throw new Error("该职业不存在此技能需求");
    if (refs.length > 0 && getActiveOccupationSkillReplacement(
      session.occupation.definitionSnapshot,
      session.skills,
    )?.targetRequirementId === requirementId) {
      throw new Error("已被替换的职业技能需求不能保存普通 selection");
    }

    const parsedRefs = skillRefSchema.array().parse(refs);
    const previousRefs = session.skills.requirementSelections.find(
      (selection) => selection.requirementId === requirementId,
    )?.refs ?? [];
    const fuzzyApprovalSubject = occupationRequirementApprovalSubject(
      session.occupation.selectedOccupationId,
      requirementId,
    );
    const keeperApprovals = requirement.keeperReview &&
      !haveSameSkillRefKeys(previousRefs, parsedRefs)
      ? session.skills.keeperApprovals.filter((approval) =>
          approval.reason !== "fuzzy-requirement" ||
          approval.subjectId !== fuzzyApprovalSubject,
        )
      : session.skills.keeperApprovals;
    const requirementSelections = session.skills.requirementSelections
      .filter((selection) => selection.requirementId !== requirementId);
    const existingIndex = session.skills.requirementSelections.findIndex(
      (selection) => selection.requirementId === requirementId,
    );
    if (parsedRefs.length > 0) {
      const nextSelection = { requirementId, refs: parsedRefs };
      if (existingIndex >= 0) {
        requirementSelections.splice(existingIndex, 0, nextSelection);
      } else {
        requirementSelections.push(nextSelection);
      }
    }

    await persist({
      ...session,
      skills: { ...session.skills, requirementSelections, keeperApprovals },
    });
  }

  async function createCustomRequirementSpecialization(
    requirementId: string,
    definitionId: string,
    displayName: string,
  ): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const requirement = session.occupation.definitionSnapshot.skillRequirements
      .find((candidate) => candidate.id === requirementId);
    if (!requirement) throw new Error("该职业不存在此技能需求");

    const skillRegistry = getSkillRegistry(session.settingId);
    const definition = skillRegistry.get(definitionId);
    if (!definition) throw new Error(`找不到技能定义：${definitionId}`);
    if (definition.specialization.type !== "required") {
      throw new Error("该技能不使用专业化实例");
    }
    if (!definition.specialization.allowCustom) {
      throw new Error("该技能不允许自定义专业化");
    }
    const trimmedName = displayName.trim();
    if (!trimmedName) throw new Error("自定义专业化名称不能为空");

    const character = await characterRepository.getById(session.characterId);
    if (!character) throw new Error("找不到当前调查员");
    if ((getSettingPackOrThrow(session.settingId).eras?.length ?? 0) > 0 && !character.data.eraId) {
      throw new Error("请先选择建卡时代");
    }
    if (character.data.eraId) {
      const customOptions = listRequirementCustomOptions(
        requirement,
        skillRegistry.definitions,
        character.data.eraId,
      );
      if (!customOptions.some((option) => option.definitionId === definition.id)) {
        throw new Error("该技能在当前时代或当前职业需求中不可创建");
      }
    }
    if (!definition.specialization.allowMultiple) {
      const requirements = new Map(
        session.occupation.definitionSnapshot.skillRequirements.map((candidate) => [candidate.id, candidate]),
      );
      const alreadySelected = session.skills.requirementSelections.some((selection) => {
        const currentRequirement = requirements.get(selection.requirementId);
        return currentRequirement !== undefined && selection.refs.some((ref) =>
          ref.definitionId === definition.id &&
          matchesSkillSelector(ref, currentRequirement.selector),
        );
      });
      if (alreadySelected) {
        throw new Error(`${definition.name.zh}只允许一个专业化实例`);
      }
    }

    const specializationId = crypto.randomUUID();
    const namedSelector = listNamedCustomSelectors(requirement.selector).find((selector) => {
      if (selector.definitionId !== definition.id) return false;
      const candidate = instantiateNamedCustomSpecialization(
        selector,
        specializationId,
        trimmedName,
      );
      return matchesSkillSelector(candidate, selector);
    });
    const ref = namedSelector
      ? instantiateNamedCustomSpecialization(namedSelector, specializationId, namedSelector.name.zh)
      : skillRefSchema.parse({
        type: "custom",
        definitionId: definition.id,
        specializationId,
        displayName: trimmedName,
      });
    if (!matchesSkillSelector(ref, requirement.selector)) {
      throw new Error("该自定义专业化不符合当前职业技能需求");
    }

    const currentRefs = session.skills.requirementSelections
      .find((selection) => selection.requirementId === requirementId)?.refs ?? [];
    const maximum = requirement.cardinality.max;
    if (maximum !== undefined && maximum !== 1 && currentRefs.length >= maximum) {
      throw new Error("该职业技能需求已达到选择上限");
    }
    await setRequirementSelection(
      requirementId,
      maximum === 1 ? [ref] : [...currentRefs, ref],
    );
  }

  async function setOccupationSkillReplacementTarget(
    targetRequirementId: string | undefined,
  ): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const definition = session.occupation.definitionSnapshot;
    const policy = definition.skillReplacement;
    if (!policy) throw new Error("当前职业没有技能 replacement policy");
    if (targetRequirementId !== undefined) {
      if (!policy.targetRequirementIds.includes(targetRequirementId)) {
        throw new Error("该需求不是当前 replacement policy 的合法目标");
      }
      if (!definition.skillRequirements.some((requirement) => requirement.id === targetRequirementId)) {
        throw new Error("当前职业不存在此 replacement target");
      }
    }

    const currentDraft = session.skills.occupationSkillReplacement;
    if (targetRequirementId === undefined && currentDraft === undefined) return;
    if (targetRequirementId !== undefined &&
      currentDraft?.policyId === policy.id &&
      currentDraft.targetRequirementId === targetRequirementId) return;

    const validApprovalSubjects = new Set(policy.targetRequirementIds.map((requirementId) =>
      occupationSkillReplacementApprovalSubject(
        session.occupation!.selectedOccupationId,
        policy.id,
        requirementId,
      ),
    ));
    const keeperApprovals = session.skills.keeperApprovals.filter((approval) =>
      approval.reason !== "occupation-skill-replacement" ||
      approval.subjectId === undefined ||
      !validApprovalSubjects.has(approval.subjectId),
    );
    const requirementSelections = targetRequirementId === undefined
      ? session.skills.requirementSelections
      : session.skills.requirementSelections.filter(
        (selection) => selection.requirementId !== targetRequirementId,
      );
    const {
      occupationSkillReplacement: _previousReplacement,
      ...skillsWithoutReplacement
    } = session.skills;
    let nextSkills: SkillCreationState = {
      ...skillsWithoutReplacement,
      requirementSelections,
      keeperApprovals,
      ...(targetRequirementId !== undefined ? {
        occupationSkillReplacement: {
          policyId: policy.id,
          targetRequirementId,
        },
      } : {}),
    };
    nextSkills = addDeterministicRequirementSelections(definition, nextSkills);
    await persist({ ...session, skills: nextSkills });
  }

  async function resetCurrentOccupationAllocation(): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (!session.skills) return;
    const resetSkills = resetOccupationAllocation(session.skills);
    await persist({
      ...session,
      skills: session.occupation
        ? addDeterministicRequirementSelections(session.occupation.definitionSnapshot, resetSkills)
        : resetSkills,
    });
  }

  async function confirmStructuredSkillRebuild(character: Character): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    if (!character.skills || character.skills.length === 0) {
      throw new Error("当前调查员没有需要确认重建的 Character.skills");
    }
    if (session.skills.existingSkillResolution?.action === "rebuild-structured") return;
    await persist({
      ...session,
      skills: {
        ...session.skills,
        existingSkillResolution: { action: "rebuild-structured", confirmed: true },
      },
    });
  }

  function getSkillFinalizePlan(character: Character): FinalizeSkillAllocationResult {
    const session = requireSession();
    if ((getSettingPackOrThrow(character.settingId).eras?.length ?? 0) > 0 && !character.eraId) {
      throw new Error("请先选择建卡时代");
    }
    if (!session.occupation || !session.skills) throw new Error("职业或技能创建状态尚未初始化");
    return finalizeSkillAllocation({
      character,
      occupation: session.occupation,
      state: session.skills,
      skillDefinitions: getSkillRegistry(session.settingId).definitions,
      ...(session.presetSnapshot ? { preset: session.presetSnapshot } : {}),
    });
  }

  async function approvePendingSkillApproval(
    character: Character,
    approval: ApprovalRequirement,
    note?: string,
  ): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const pending = getSkillFinalizePlan(character).approvals.find((candidate) =>
      candidate.reason === approval.reason && candidate.subjectId === approval.subjectId,
    );
    if (!pending) throw new Error("该 Keeper approval 已失效或并非当前待批准项目");
    if (pending.reason === "credit-rating-override") {
      throw new Error("Credit Rating override 必须使用独立批准操作");
    }
    if (session.skills.keeperApprovals.some((grant) =>
      grant.reason === pending.reason && grant.subjectId === pending.subjectId,
    )) return;

    const trimmedNote = note?.trim();
    await persist({
      ...session,
      skills: {
        ...session.skills,
        keeperApprovals: [
          ...session.skills.keeperApprovals,
          {
            reason: pending.reason,
            ...(pending.subjectId ? { subjectId: pending.subjectId } : {}),
            approved: true,
            ...(trimmedNote ? { note: trimmedNote } : {}),
          },
        ],
      },
    });
  }

  async function revokeKeeperApproval(
    reason: ApprovalReasonId,
    subjectId?: string,
  ): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    const keeperApprovals = session.skills.keeperApprovals.filter((grant) =>
      grant.reason !== reason || grant.subjectId !== subjectId,
    );
    if (keeperApprovals.length === session.skills.keeperApprovals.length) return;
    await persist({ ...session, skills: { ...session.skills, keeperApprovals } });
  }

  async function approveCreditRatingOverride(
    character: Character,
    reason?: string,
  ): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    if (!getSkillFinalizePlan(character).approvals.some(
      (approval) => approval.reason === "credit-rating-override",
    )) {
      throw new Error("当前没有待批准的 Credit Rating override");
    }
    const trimmedReason = reason?.trim();
    await persist({
      ...session,
      skills: {
        ...session.skills,
        creditRatingOverride: {
          occupationId: session.occupation.selectedOccupationId,
          approved: true,
          ...(trimmedReason ? { reason: trimmedReason } : {}),
        },
      },
    });
  }

  async function revokeCurrentCreditRatingOverride(): Promise<void> {
    const session = requireSession();
    if (!session.occupation || !session.skills) {
      throw new Error("职业或技能创建状态尚未初始化");
    }
    if (session.skills.creditRatingOverride?.occupationId !==
      session.occupation.selectedOccupationId) return;
    const { creditRatingOverride: _currentOverride, ...skills } = session.skills;
    await persist({ ...session, skills });
  }

  async function completeSkills(
    character: Character,
    acknowledgeWarnings = false,
  ): Promise<CharacterRecord> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    if (!session.occupation || !session.skills) throw new Error("职业或技能创建状态尚未初始化");
    const plan = getSkillFinalizePlan(character);
    if (!plan.valid) {
      const blockers = [
        ...plan.errors.map((error) => error.message),
        ...plan.approvals.map((approval) => approval.message),
      ];
      throw new Error(blockers.join("；"));
    }
    if (plan.warnings.length > 0 && !acknowledgeWarnings) {
      throw new Error(`完成前必须显式确认：${plan.warnings.map((warning) => warning.message).join("；")}`);
    }

    const selection = session.occupation;
    const definition = selection.definitionSnapshot;
    const occupation = selection.kind === "catalog"
      ? {
        kind: "catalog" as const,
        id: selection.selectedOccupationId,
        displayNameSnapshot: definition.name,
        ...(definition.variantOf ? { variantOf: definition.variantOf } : {}),
        sourceRefs: definition.sourceRefs,
      }
      : {
        kind: "custom" as const,
        id: selection.selectedOccupationId,
        displayNameSnapshot: definition.name,
        sourceRefs: definition.sourceRefs,
      };
    const completedSession: CreationSession = {
      ...session,
      currentStep: "background",
      skills: {
        ...session.skills,
        // 首次结构化 finalize 后记录明确来源，返回 skills 再次计算时不会把自己的结果误判为 Phase 4 手动状态。
        existingSkillResolution: { action: "rebuild-structured", confirmed: true },
      },
    };
    const finalizedCthulhuMythos = plan.skills.find(
      (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "cthulhu-mythos",
    )?.currentValue ?? 0;
    const resources = character.resources
      ? {
        ...character.resources,
        san: {
          current: clampSanityToMaximum(
            character.resources.san.current,
            finalizedCthulhuMythos,
          ),
        },
      }
      : undefined;
    const records = await creationWorkflowRepository.updateCharacterWithSession(
      {
        ...character,
        occupation,
        skills: [...plan.skills],
        ...(resources ? { resources } : {}),
      },
      completedSession,
    );
    current.value = records.session;
    return records.character;
  }

  async function completeBackground(): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    const character = await characterRepository.getById(session.characterId);
    if (!character) throw new Error(`调查员不存在：${session.characterId}`);
    const validation = validateCreationBackstory(character.data.backstory);
    if (!validation.valid) {
      throw new Error(validation.errors.map((error) => error.message).join("；"));
    }
    await persist({ ...session, currentStep: "possessions" });
  }

  async function initializeCurrentStandardWealth(): Promise<CharacterRecord> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    const characterRecord = await characterRepository.getById(session.characterId);
    if (!characterRecord) throw new Error(`调查员不存在：${session.characterId}`);
    const character = characterRecord.data;
    if (character.settingId !== "standard") {
      throw new Error("当前仅实现 Standard COC7 财富规则");
    }
    if (!isStandardWealthEraId(character.eraId)) {
      throw new Error("Standard 调查员必须先选择建卡时代");
    }
    const creditRating = getFinalCreditRating(character);
    if (creditRating === undefined) {
      throw new Error("必须先完成技能并生成最终 Credit Rating");
    }
    const initial = deriveStandardInitialWealth(character.eraId, creditRating);
    const completedSession: CreationSession = {
      ...session,
      wealthInitialization: { eraId: character.eraId, creditRating },
    };
    const records = await creationWorkflowRepository.updateCharacterWithSession(
      {
        ...character,
        wealth: {
          cashMinorUnits: initial.cashMinorUnits,
          assetsMinorUnits: initial.assets.amountMinorUnits,
          assetEntries: [...(character.wealth?.assetEntries ?? [])],
        },
      },
      completedSession,
    );
    current.value = records.session;
    return records.character;
  }

  async function completePossessions(): Promise<void> {
    await flushSkillAllocationWrites();
    const session = requireSession();
    const character = await characterRepository.getById(session.characterId);
    if (!character) throw new Error(`调查员不存在：${session.characterId}`);
    const validation = validateCreationWealth(
      character.data,
      session.wealthInitialization,
    );
    if (!validation.valid) {
      throw new Error(validation.errors.map((error) => error.message).join("；"));
    }
    await persist({ ...session, currentStep: "review" });
  }

  async function setAge(age: number): Promise<void> {
    const session = requireSession();
    if (session.draftAge === age) return;
    const oldAge = session.draftAge;
    const oldAttributes = session.attributes;
    let attributes = oldAttributes;
    if (oldAttributes) {
      const preserveLuck = oldAge !== undefined &&
        getAgeAdjustmentRule(oldAge).luckRollCount === getAgeAdjustmentRule(age).luckRollCount;
      attributes = {
        ...oldAttributes,
        ageAdjustment: emptyAgeAdjustment(age),
        ...(preserveLuck && oldAttributes.luck ? { luck: oldAttributes.luck } : { luck: undefined }),
      };
    }
    await persist({ ...session, draftAge: age, ...(attributes ? { attributes } : {}) });
  }

  async function chooseGenerationMethod(method: AttributeGenerationMethod): Promise<void> {
    const session = requireSession();
    if (session.settingId !== "standard") throw new Error("当前仅实现 Standard COC7 属性规则");
    if (!config.value.allowedMethods.includes(method)) throw new Error("该预设不允许此属性生成方式");
    const generation = makeGeneration(method, config.value);
    const attributes: AttributeState = {
      generationMethod: method,
      generation,
      ...(session.draftAge === undefined ? {} : { ageAdjustment: emptyAgeAdjustment(session.draftAge) }),
    };
    await persist({ ...session, attributes });
  }

  async function replaceGeneration(generation: AttributeGenerationState): Promise<void> {
    const session = requireSession();
    const previous = session.attributes;
    const attributes: AttributeState = {
      generationMethod: generation.method,
      generation,
      ...(session.draftAge === undefined ? {} : { ageAdjustment: emptyAgeAdjustment(session.draftAge) }),
      ...(previous?.luck ? { luck: previous.luck } : {}),
    };
    await persist({ ...session, attributes });
  }

  async function generateCurrentMethod(): Promise<void> {
    const session = requireSession();
    const method = session.attributes?.generationMethod;
    if (!method) throw new Error("请先选择属性生成方式");
    if (method === "standard-roll") {
      const result = rollStandardCharacteristics(randomSource.value);
      await replaceGeneration({ method, result, baseCharacteristics: result.values });
    } else if (method === "low-roll-boost") {
      const result = rollStandardCharacteristics(randomSource.value);
      const bonusRoll = rollLowRollBoost(result, randomSource.value);
      const applied = applyLowRollBoost(result, bonusRoll, {});
      await replaceGeneration({
        method,
        result,
        ...(bonusRoll === undefined ? {} : { bonusRoll }),
        allocation: {},
        ...(applied.values ? { baseCharacteristics: applied.values } : {}),
      });
    } else if (method === "assign-roll") {
      await replaceGeneration({ method, rolls: [...rollAssignResults(randomSource.value)], assignments: {} });
    } else if (method === "multi-roll") {
      const count = config.value.multiRoll?.count ?? 3;
      await replaceGeneration({ method, candidates: [...rollMultipleCharacteristics(count, randomSource.value)] });
    }
  }

  async function setLowRollAllocation(id: CharacteristicId, value: number): Promise<void> {
    const session = requireSession();
    const generation = session.attributes?.generation;
    if (generation?.method !== "low-roll-boost" || !generation.result) return;
    const allocation = { ...generation.allocation, [id]: value };
    const applied = applyLowRollBoost(generation.result, generation.bonusRoll, allocation);
    await replaceGeneration({
      ...generation,
      allocation,
      ...(applied.values ? { baseCharacteristics: applied.values } : { baseCharacteristics: undefined }),
    });
  }

  async function setAssignment(id: CharacteristicId, rollId: string): Promise<void> {
    const session = requireSession();
    const generation = session.attributes?.generation;
    if (generation?.method !== "assign-roll" || !generation.rolls) return;
    const assignments = { ...generation.assignments, [id]: rollId };
    const limits = config.value.assignRoll ?? { intMin: 40, sizMin: 40 };
    const result = validateAssignRoll(generation.rolls, assignments, limits.intMin, limits.sizMin);
    await replaceGeneration({
      ...generation,
      assignments,
      ...(result.values ? { baseCharacteristics: result.values } : { baseCharacteristics: undefined }),
    });
  }

  async function selectCandidate(index: number): Promise<void> {
    const session = requireSession();
    const generation = session.attributes?.generation;
    if (generation?.method !== "multi-roll" || !generation.candidates?.[index]) return;
    await replaceGeneration({ ...generation, selectedIndex: index, baseCharacteristics: generation.candidates[index].values });
  }

  async function setEnteredValue(id: CharacteristicId, value: number | undefined): Promise<void> {
    const session = requireSession();
    const generation = session.attributes?.generation;
    if (generation?.method !== "point-buy" && generation?.method !== "manual") return;
    if (generation.method === "manual") {
      const values: PartialCharacteristicValues = { ...generation.values };
      if (value === undefined) {
        delete values[id];
      } else {
        values[id] = characteristicValueSchema.parse(value);
      }
      const completed = characteristicValuesSchema.safeParse(values);
      await replaceGeneration({
        method: "manual",
        values,
        ...(completed.success ? { baseCharacteristics: completed.data } : {}),
      });
      return;
    }

    if (value === undefined || !generation.values) return;
    const values = characteristicValuesSchema.parse({ ...generation.values, [id]: value });
    const valid = validatePointBuy(values, config.value.pointBuy ?? defaultPointBuyConfig).valid;
    await replaceGeneration({
      method: "point-buy",
      values,
      ...(valid ? { baseCharacteristics: values } : {}),
    });
  }

  async function setReduction(id: CharacteristicId, value: number): Promise<void> {
    const session = requireSession();
    const attributes = session.attributes;
    if (!attributes?.ageAdjustment) return;
    await persist({
      ...session,
      attributes: {
        ...attributes,
        ageAdjustment: {
          ...attributes.ageAdjustment,
          reductionAllocation: { ...attributes.ageAdjustment.reductionAllocation, [id]: value },
        },
      },
    });
  }

  async function rollEdu(): Promise<void> {
    const session = requireSession();
    const attributes = session.attributes;
    const base = attributes ? baseFromGeneration(attributes.generation) : undefined;
    if (!attributes?.ageAdjustment || !base) throw new Error("请先完成基础属性");
    const rule = getAgeAdjustmentRule(attributes.ageAdjustment.age);
    const eduImprovements = [...runEduImprovements(base.EDU, rule.eduImprovementCount, randomSource.value)];
    await persist({ ...session, attributes: { ...attributes, ageAdjustment: { ...attributes.ageAdjustment, eduImprovements } } });
  }

  async function rollCurrentLuck(): Promise<void> {
    const session = requireSession();
    const attributes = session.attributes;
    if (!attributes || session.draftAge === undefined) throw new Error("请先输入年龄并选择生成方式");
    const result = rollLuck(getAgeAdjustmentRule(session.draftAge).luckRollCount, randomSource.value);
    await persist({ ...session, attributes: { ...attributes, luck: { source: "rolled", rolls: [...result.rolls], value: result.value } } });
  }

  async function setManualLuck(value: number): Promise<void> {
    const session = requireSession();
    if (!session.attributes) throw new Error("请先选择属性生成方式");
    await persist({ ...session, attributes: { ...session.attributes, luck: { source: "manual", value } } });
  }

  function getCompletionErrors(): readonly string[] {
    const session = current.value?.data;
    if (!session) return ["尚未载入建卡会话"];
    const attributes = session.attributes;
    if (!attributes) return ["尚未选择属性生成方式"];
    const base = baseFromGeneration(attributes.generation);
    if (!base) return ["基础属性尚未完成或不符合预设限制"];
    if (session.draftAge === undefined || !attributes.ageAdjustment) return ["尚未输入年龄"];
    const rule = getAgeAdjustmentRule(session.draftAge);
    if (rule.requiresKeeperRuling) return ["该年龄需要 KP 裁定，标准年龄调整无法自动完成"];
    const errors: string[] = [];
    const ageLimit = session.presetSnapshot?.age;
    if (ageLimit?.min !== undefined && session.draftAge < ageLimit.min) errors.push(`年龄不得低于预设下限 ${ageLimit.min}`);
    if (ageLimit?.max !== undefined && session.draftAge > ageLimit.max) errors.push(`年龄不得高于预设上限 ${ageLimit.max}`);
    errors.push(...validateReductionAllocation(base, rule, attributes.ageAdjustment.reductionAllocation).errors);
    errors.push(...validateEduImprovementHistory(
      base.EDU,
      rule.eduImprovementCount,
      attributes.ageAdjustment.eduImprovements,
    ).errors);
    if (!attributes.luck) {
      errors.push("Luck 尚未生成或输入");
    } else if (attributes.luck.source === "rolled") {
      errors.push(...validateRolledLuck(rule.luckRollCount, attributes.luck.rolls, attributes.luck.value).errors);
    }
    return errors;
  }

  async function completeAttributes(character: Character): Promise<CharacterRecord> {
    const session = requireSession();
    const errors = getCompletionErrors();
    if (errors.length > 0) throw new Error(errors.join("；"));
    const attributes = session.attributes;
    const age = session.draftAge;
    if (!attributes?.ageAdjustment || age === undefined || !attributes.luck) throw new Error("属性状态不完整");
    const base = baseFromGeneration(attributes.generation);
    if (!base) throw new Error("基础属性状态不完整");
    const finalValues = deriveFinalCharacteristics(
      base,
      getAgeAdjustmentRule(age),
      attributes.ageAdjustment.reductionAllocation,
      attributes.ageAdjustment.eduImprovements,
    );
    const derived = deriveStandardCharacterValues(age, finalValues);
    const currentCthulhuMythos = character.skills?.find(
      (skill) => skill.ref.type === "standard" &&
        skill.ref.definitionId === "cthulhu-mythos",
    )?.currentValue ?? 0;
    const completedSession: CreationSession = { ...session, currentStep: "occupation" };
    const records = await creationWorkflowRepository.updateCharacterWithSession(
      {
        ...character,
        age,
        characteristics: finalValues,
        luck: attributes.luck.value,
        resources: {
          hp: { current: derived.maxHp },
          mp: { current: derived.initialMp },
          san: { current: clampSanityToMaximum(derived.initialSan, currentCthulhuMythos) },
        },
      },
      completedSession,
    );
    current.value = records.session;
    return records.character;
  }

  function setRandomSource(source: RandomSource): void {
    randomSource.value = source;
  }

  return {
    creating,
    current,
    sessionSteps,
    sessionStepsLoaded,
    config,
    start,
    loadByCharacterId,
    loadSessionSteps,
    setCurrentStep,
    selectCatalogOccupation,
    selectCustomOccupation,
    setSkillCreationState,
    setSkillAllocation,
    setSkillAllocationPoint,
    removeSkillAllocation,
    createCustomInterestAllocation,
    ensureDeterministicRequirementSelections,
    setRequirementSelection,
    createCustomRequirementSpecialization,
    setOccupationSkillReplacementTarget,
    resetCurrentOccupationAllocation,
    confirmStructuredSkillRebuild,
    getSkillFinalizePlan,
    approvePendingSkillApproval,
    revokeKeeperApproval,
    approveCreditRatingOverride,
    revokeCurrentCreditRatingOverride,
    completeSkills,
    completeBackground,
    initializeCurrentStandardWealth,
    completePossessions,
    setAge,
    chooseGenerationMethod,
    generateCurrentMethod,
    setLowRollAllocation,
    setAssignment,
    selectCandidate,
    setEnteredValue,
    setReduction,
    rollEdu,
    rollCurrentLuck,
    setManualLuck,
    getCompletionErrors,
    completeAttributes,
    setRandomSource,
  };
});
