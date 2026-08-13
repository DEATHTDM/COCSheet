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
import {
  finalizeSkillAllocation,
  validateCustomOccupationDefinition,
  type FinalizeSkillAllocationResult,
} from "../../coc7/rules/occupationSkills";
import {
  characteristicValueSchema,
  characteristicValuesSchema,
  type CharacteristicId,
  type CharacteristicValues,
  type PartialCharacteristicValues,
} from "../../coc7/types/attribute";
import type { Character } from "../../coc7/types/character";
import { occupationDefinitionSchema, type OccupationDefinition } from "../../coc7/types/occupation";
import type { SettingId } from "../../coc7/types/setting";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
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
import type { SkillCreationState } from "../types/skillCreation";

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

export const useCreationStore = defineStore("creation", () => {
  const creating = ref(false);
  const current = ref<CreationSessionRecord>();
  const randomSource = ref<RandomSource>(systemRandomSource);

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

  async function setCurrentStep(step: CreationStepId): Promise<void> {
    await persist({ ...requireSession(), currentStep: step });
  }

  function emptySkillCreationState(): SkillCreationState {
    return { requirementSelections: [], allocations: [], keeperApprovals: [] };
  }

  async function selectCatalogOccupation(occupationId: string): Promise<void> {
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
    const session = requireSession();
    const parsed = occupationDefinitionSchema.parse(definition);
    const errors = validateCustomOccupationDefinition(parsed);
    if (errors.length > 0) throw new Error(errors.join("；"));
    await persist({
      ...replaceOccupationSelection(session, {
        kind: "custom",
        selectedOccupationId: parsed.id,
        definitionSnapshot: parsed,
      }),
      skills: session.skills ?? emptySkillCreationState(),
    });
  }

  async function setSkillCreationState(skills: SkillCreationState): Promise<void> {
    await persist({ ...requireSession(), skills });
  }

  async function resetCurrentOccupationAllocation(): Promise<void> {
    const session = requireSession();
    if (!session.skills) return;
    await persist({ ...session, skills: resetOccupationAllocation(session.skills) });
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

  async function completeSkills(
    character: Character,
    acknowledgeWarnings = false,
  ): Promise<CharacterRecord> {
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
      currentStep: "review",
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
    config,
    start,
    loadByCharacterId,
    setCurrentStep,
    selectCatalogOccupation,
    selectCustomOccupation,
    setSkillCreationState,
    resetCurrentOccupationAllocation,
    getSkillFinalizePlan,
    completeSkills,
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
