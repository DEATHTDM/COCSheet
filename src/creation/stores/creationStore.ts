import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { deriveFinalCharacteristics, getAgeAdjustmentRule, runEduImprovements, validateReductionAllocation } from "../../coc7/rules/age";
import {
  applyLowRollBoost,
  defaultPointBuyConfig,
  rollAssignResults,
  rollLowRollBoost,
  rollMultipleCharacteristics,
  rollStandardCharacteristics,
  validateAssignRoll,
  validatePointBuy,
} from "../../coc7/rules/attributes";
import { rollLuck } from "../../coc7/rules/luck";
import { systemRandomSource, type RandomSource } from "../../coc7/rules/random";
import {
  characteristicIds,
  characteristicValuesSchema,
  type CharacteristicId,
  type CharacteristicValues,
} from "../../coc7/types/attribute";
import type { Character } from "../../coc7/types/character";
import type { SettingId } from "../../coc7/types/setting";
import { getSettingPackOrThrow } from "../../content/registry";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import type { CharacterRecord, CreationSessionRecord } from "../../db/records";
import {
  resolveAttributeGenerationConfig,
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

function emptyAgeAdjustment(age: number): AgeAdjustmentState {
  return { age, reductionAllocation: {}, eduImprovements: [] };
}

function makeGeneration(method: AttributeGenerationMethod): AttributeGenerationState {
  switch (method) {
    case "standard-roll": return { method };
    case "low-roll-boost": return { method, allocation: {} };
    case "assign-roll": return { method, assignments: {} };
    case "multi-roll": return { method };
    case "point-buy": return {
      method,
      values: { STR: 50, CON: 50, SIZ: 60, DEX: 50, APP: 50, INT: 60, POW: 50, EDU: 90 },
    };
    case "manual": return {
      method,
      values: { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50 },
    };
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
    let generation = makeGeneration(method);
    if (generation.method === "manual" && generation.values) {
      generation = { ...generation, baseCharacteristics: generation.values };
    }
    if (generation.method === "point-buy" && generation.values &&
      validatePointBuy(generation.values, config.value.pointBuy ?? defaultPointBuyConfig).valid) {
      generation = { ...generation, baseCharacteristics: generation.values };
    }
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

  async function setEnteredValue(id: CharacteristicId, value: number): Promise<void> {
    const session = requireSession();
    const generation = session.attributes?.generation;
    if (generation?.method !== "point-buy" && generation?.method !== "manual") return;
    const currentValues = generation.values ?? Object.fromEntries(characteristicIds.map((key) => [key, 0]));
    const values = characteristicValuesSchema.parse({ ...currentValues, [id]: value });
    let valid = true;
    if (generation.method === "point-buy") {
      valid = validatePointBuy(values, config.value.pointBuy ?? defaultPointBuyConfig).valid;
    }
    await replaceGeneration({
      ...generation,
      values,
      ...(valid ? { baseCharacteristics: values } : { baseCharacteristics: undefined }),
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
    if (attributes.ageAdjustment.eduImprovements.length !== rule.eduImprovementCount) errors.push("EDU 成长判定尚未完成");
    if (!attributes.luck) errors.push("Luck 尚未生成或输入");
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
    const completedSession: CreationSession = { ...session, currentStep: "occupation" };
    const records = await creationWorkflowRepository.updateCharacterWithSession(
      { ...character, age, characteristics: finalValues, luck: attributes.luck.value },
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
