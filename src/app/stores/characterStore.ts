import { ref } from "vue";
import { defineStore } from "pinia";

import {
  calculateMaximumSanity,
  calculateMaxHitPoints,
  clampSanityToMaximum,
  deriveStandardCharacterValues,
} from "../../coc7/rules/derived";
import {
  getSkillRefKey,
  resolveSkillValue,
  validateCharacterSkill,
  validateCharacterSkills,
} from "../../coc7/rules/skills";
import type { CharacterSkill, SkillDefinition, SkillRef } from "../../coc7/types/skill";
import type {
  BackstoryCategoryId,
  CharacterBackstory,
  CharacterAssetEntry,
  CharacterResources,
  CharacterWealth,
} from "../../coc7/types/character";
import type { EraId } from "../../coc7/types/occupation";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import { characterRepository } from "../../db/repositories/characterRepository";
import type { CharacterRecord } from "../../db/records";
import { isCreationBackstoryCategory } from "../../creation/rules/creationBackstory";

export interface CharacterIdentityDetails {
  readonly sex: string;
  readonly residence: string;
  readonly birthplace: string;
}

export interface CharacterAssetEntryInput {
  readonly description: string;
  readonly valueMinorUnits?: number;
}

export const useCharacterStore = defineStore("characters", () => {
  const records = ref<CharacterRecord[]>([]);
  const current = ref<CharacterRecord>();
  const loading = ref(false);

  function synchronize(updated: CharacterRecord): CharacterRecord {
    current.value = updated;
    records.value = records.value.map((record) => (record.id === updated.id ? updated : record));
    return updated;
  }

  async function requireCharacter(id: string): Promise<CharacterRecord> {
    const existing = current.value?.id === id ? current.value : await characterRepository.getById(id);
    if (!existing) throw new Error(`调查员不存在：${id}`);
    return existing;
  }

  function requireResourceValue(value: number, label: string, maximum: number): void {
    requireNonNegativeInteger(value, label);
    if (value > maximum) {
      throw new RangeError(`${label} 必须为 0～${maximum} 的整数`);
    }
  }

  function requireNonNegativeInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`${label} 必须为非负整数`);
    }
  }

  function requireWealth(record: CharacterRecord): CharacterWealth {
    const wealth = record.data.wealth;
    if (!wealth) throw new Error("调查员财富尚未初始化");
    return wealth;
  }

  function normalizeAssetEntryInput(
    input: CharacterAssetEntryInput,
    id: string,
  ): CharacterAssetEntry {
    const description = input.description.trim();
    if (!description) throw new Error("资产描述不能为空");
    if (input.valueMinorUnits !== undefined) {
      requireNonNegativeInteger(input.valueMinorUnits, "资产估值");
    }
    return {
      id,
      description,
      ...(input.valueMinorUnits === undefined ? {} : { valueMinorUnits: input.valueMinorUnits }),
    };
  }

  function requireSkillDefinition(record: CharacterRecord, definitionId: string): SkillDefinition {
    const definition = getSkillRegistry(record.settingId).get(definitionId);
    if (!definition) throw new Error(`当前设定不存在技能：${definitionId}`);
    return definition;
  }

  function requireCharacteristics(record: CharacterRecord) {
    const characteristics = record.data.characteristics;
    if (!characteristics) throw new Error("调查员属性尚未完成，无法计算技能基础值");
    return characteristics;
  }

  async function persistSkills(
    existing: CharacterRecord,
    skills: readonly CharacterSkill[],
    resources: CharacterResources | undefined = existing.data.resources,
  ): Promise<CharacterRecord> {
    const validation = validateCharacterSkills(
      skills,
      getSkillRegistry(existing.settingId).definitions,
    );
    if (!validation.valid) throw new Error(validation.errors.join("；"));
    return synchronize(await characterRepository.update({
      ...existing.data,
      skills: [...skills],
      resources,
    }));
  }

  function getCurrentCthulhuMythos(record: CharacterRecord): number {
    return record.data.skills?.find(
      (skill) => skill.ref.type === "standard" &&
        skill.ref.definitionId === "cthulhu-mythos",
    )?.currentValue ?? 0;
  }

  async function loadList(): Promise<void> {
    loading.value = true;
    try {
      records.value = await characterRepository.list();
    } finally {
      loading.value = false;
    }
  }

  async function loadById(id: string): Promise<CharacterRecord | undefined> {
    const record = await characterRepository.getById(id);
    current.value = record;
    return record;
  }

  async function updateName(id: string, name: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);

    const updated = await characterRepository.update({ ...existing.data, name });
    return synchronize(updated);
  }

  async function setEra(id: string, eraId: EraId): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const eras = getSettingPackOrThrow(existing.settingId).eras ?? [];
    if (!eras.includes(eraId)) throw new Error(`当前设定不存在时代：${eraId}`);
    return synchronize(await characterRepository.update({ ...existing.data, eraId }));
  }

  async function setIdentityDetails(
    id: string,
    details: CharacterIdentityDetails,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const sex = details.sex.trim();
    const residence = details.residence.trim();
    const birthplace = details.birthplace.trim();
    if (!sex || !residence || !birthplace) {
      throw new Error("性别、住所与出身地均不能为空");
    }
    return synchronize(await characterRepository.update({
      ...existing.data,
      sex,
      residence,
      birthplace,
    }));
  }

  async function addBackstoryEntry(
    id: string,
    category: BackstoryCategoryId,
    text: string,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error("背景条目不能为空");
    const backstory = existing.data.backstory ?? { entries: [] };
    return synchronize(await characterRepository.update({
      ...existing.data,
      backstory: {
        ...backstory,
        entries: [
          ...backstory.entries,
          { id: crypto.randomUUID(), category, text: normalizedText },
        ],
      },
    }));
  }

  async function updateBackstoryEntry(
    id: string,
    entryId: string,
    text: string,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error("背景条目不能为空");
    const backstory = existing.data.backstory;
    if (!backstory?.entries.some((entry) => entry.id === entryId)) {
      throw new Error(`找不到背景条目：${entryId}`);
    }
    return synchronize(await characterRepository.update({
      ...existing.data,
      backstory: {
        ...backstory,
        entries: backstory.entries.map((entry) =>
          entry.id === entryId ? { ...entry, text: normalizedText } : entry,
        ),
      },
    }));
  }

  async function removeBackstoryEntry(id: string, entryId: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const backstory = existing.data.backstory;
    if (!backstory?.entries.some((entry) => entry.id === entryId)) {
      throw new Error(`找不到背景条目：${entryId}`);
    }
    const entries = backstory.entries.filter((entry) => entry.id !== entryId);
    const nextBackstory: CharacterBackstory = backstory.keyConnectionEntryId === entryId
      ? { entries }
      : { ...backstory, entries };
    return synchronize(await characterRepository.update({
      ...existing.data,
      backstory: nextBackstory,
    }));
  }

  async function setKeyConnection(
    id: string,
    entryId: string | undefined,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const backstory = existing.data.backstory ?? { entries: [] };
    if (entryId === undefined) {
      return synchronize(await characterRepository.update({
        ...existing.data,
        backstory: { entries: [...backstory.entries] },
      }));
    }
    const entry = backstory.entries.find((candidate) => candidate.id === entryId);
    if (!entry) throw new Error(`找不到背景条目：${entryId}`);
    if (!isCreationBackstoryCategory(entry.category)) {
      throw new Error("只有六个创建背景类别中的条目可以设为关键连接");
    }
    return synchronize(await characterRepository.update({
      ...existing.data,
      backstory: { ...backstory, keyConnectionEntryId: entryId },
    }));
  }

  async function ensureResourcesInitialized(id: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (character.resources || character.settingId !== "standard" ||
      character.age === undefined || !character.characteristics) {
      return synchronize(existing);
    }

    const derived = deriveStandardCharacterValues(character.age, character.characteristics);
    const updated = await characterRepository.update({
      ...character,
      resources: {
        hp: { current: derived.maxHp },
        mp: { current: derived.initialMp },
        san: {
          current: clampSanityToMaximum(
            derived.initialSan,
            getCurrentCthulhuMythos(existing),
          ),
        },
      },
    });
    return synchronize(updated);
  }

  async function reconcileSanityToMaximum(id: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources) throw new Error("调查员资源尚未初始化");
    const reconciledSan = clampSanityToMaximum(
      character.resources.san.current,
      getCurrentCthulhuMythos(existing),
    );
    if (reconciledSan === character.resources.san.current) {
      return synchronize(existing);
    }
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, san: { current: reconciledSan } },
    }));
  }

  async function setCurrentHp(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources || !character.characteristics) throw new Error("调查员资源尚未初始化");
    const maximum = calculateMaxHitPoints(
      character.characteristics.CON,
      character.characteristics.SIZ,
    );
    requireResourceValue(value, "当前 HP", maximum);
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, hp: { current: value } },
    }));
  }

  async function setCurrentMp(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources) throw new Error("调查员资源尚未初始化");
    requireNonNegativeInteger(value, "当前 MP");
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, mp: { current: value } },
    }));
  }

  async function setCurrentSan(id: string, value: number): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const character = existing.data;
    if (!character.resources) throw new Error("调查员资源尚未初始化");
    requireResourceValue(
      value,
      "当前 SAN",
      calculateMaximumSanity(getCurrentCthulhuMythos(existing)),
    );
    return synchronize(await characterRepository.update({
      ...character,
      resources: { ...character.resources, san: { current: value } },
    }));
  }

  async function setCurrentCash(id: string, cashMinorUnits: number): Promise<CharacterRecord> {
    requireNonNegativeInteger(cashMinorUnits, "当前现金");
    const existing = await requireCharacter(id);
    const wealth = requireWealth(existing);
    return synchronize(await characterRepository.update({
      ...existing.data,
      wealth: { ...wealth, cashMinorUnits },
    }));
  }

  async function setCurrentAssets(id: string, assetsMinorUnits: number): Promise<CharacterRecord> {
    requireNonNegativeInteger(assetsMinorUnits, "当前资产总额");
    const existing = await requireCharacter(id);
    const wealth = requireWealth(existing);
    return synchronize(await characterRepository.update({
      ...existing.data,
      wealth: { ...wealth, assetsMinorUnits },
    }));
  }

  async function addAssetEntry(
    id: string,
    input: CharacterAssetEntryInput,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const wealth = requireWealth(existing);
    const entry = normalizeAssetEntryInput(input, crypto.randomUUID());
    return synchronize(await characterRepository.update({
      ...existing.data,
      wealth: { ...wealth, assetEntries: [...wealth.assetEntries, entry] },
    }));
  }

  async function updateAssetEntry(
    id: string,
    entryId: string,
    input: CharacterAssetEntryInput,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const wealth = requireWealth(existing);
    if (!wealth.assetEntries.some((entry) => entry.id === entryId)) {
      throw new Error(`找不到资产条目：${entryId}`);
    }
    const updatedEntry = normalizeAssetEntryInput(input, entryId);
    return synchronize(await characterRepository.update({
      ...existing.data,
      wealth: {
        ...wealth,
        assetEntries: wealth.assetEntries.map((entry) =>
          entry.id === entryId ? updatedEntry : entry,
        ),
      },
    }));
  }

  async function removeAssetEntry(id: string, entryId: string): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const wealth = requireWealth(existing);
    if (!wealth.assetEntries.some((entry) => entry.id === entryId)) {
      throw new Error(`找不到资产条目：${entryId}`);
    }
    return synchronize(await characterRepository.update({
      ...existing.data,
      wealth: {
        ...wealth,
        assetEntries: wealth.assetEntries.filter((entry) => entry.id !== entryId),
      },
    }));
  }

  async function setSkillValue(
    id: string,
    ref: SkillRef,
    value: number,
  ): Promise<CharacterRecord> {
    requireNonNegativeInteger(value, "技能当前值");
    const existing = await requireCharacter(id);
    const definition = requireSkillDefinition(existing, ref.definitionId);
    const next: CharacterSkill = { ref, currentValue: value, improvementChecked: false };
    const validation = validateCharacterSkill(next, definition);
    if (!validation.valid) throw new Error(validation.errors.join("；"));

    const key = getSkillRefKey(ref);
    const skills = [...(existing.data.skills ?? [])];
    const index = skills.findIndex((skill) => getSkillRefKey(skill.ref) === key);
    if (index >= 0) {
      const current = skills[index];
      if (!current) throw new Error("技能状态索引无效");
      skills[index] = { ...current, currentValue: value };
    } else {
      skills.push(next);
    }

    const resources = definition.id === "cthulhu-mythos" && existing.data.resources
      ? {
          ...existing.data.resources,
          san: {
            current: clampSanityToMaximum(
              existing.data.resources.san.current,
              value,
            ),
          },
        }
      : existing.data.resources;
    return persistSkills(existing, skills, resources);
  }

  async function setImprovementChecked(
    id: string,
    ref: SkillRef,
    checked: boolean,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const definition = requireSkillDefinition(existing, ref.definitionId);
    if (checked && definition.improvementPolicy === "not-eligible") {
      throw new Error(`技能 ${definition.name.zh} 不允许成长标记`);
    }

    const key = getSkillRefKey(ref);
    const skills = [...(existing.data.skills ?? [])];
    const index = skills.findIndex((skill) => getSkillRefKey(skill.ref) === key);
    if (index >= 0) {
      const current = skills[index];
      if (!current) throw new Error("技能状态索引无效");
      skills[index] = { ...current, improvementChecked: checked };
    } else {
      const resolved = resolveSkillValue(definition, ref, requireCharacteristics(existing));
      skills.push({ ref, currentValue: resolved.baseValue, improvementChecked: checked });
    }
    return persistSkills(existing, skills);
  }

  async function createCustomSpecialization(
    id: string,
    definitionId: string,
    displayName: string,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const definition = requireSkillDefinition(existing, definitionId);
    const normalizedName = displayName.trim();
    if (definition.specialization.type !== "required" || !definition.specialization.allowCustom) {
      throw new Error(`技能 ${definition.name.zh} 不允许自定义专业化`);
    }
    if (!normalizedName) throw new Error("自定义专业化名称不能为空");

    const ref: SkillRef = {
      type: "custom",
      definitionId,
      specializationId: crypto.randomUUID(),
      displayName: normalizedName,
    };
    const resolved = resolveSkillValue(definition, ref, requireCharacteristics(existing));
    return persistSkills(existing, [
      ...(existing.data.skills ?? []),
      { ref, currentValue: resolved.baseValue, improvementChecked: false },
    ]);
  }

  async function renameCustomSpecialization(
    id: string,
    specializationId: string,
    displayName: string,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const normalizedName = displayName.trim();
    if (!normalizedName) throw new Error("自定义专业化名称不能为空");
    const skills = [...(existing.data.skills ?? [])];
    const index = skills.findIndex(
      (skill) => skill.ref.type === "custom" && skill.ref.specializationId === specializationId,
    );
    if (index < 0) throw new Error(`找不到自定义专业化：${specializationId}`);
    const current = skills[index];
    if (!current || current.ref.type !== "custom") throw new Error("自定义专业化状态无效");
    skills[index] = {
      ...current,
      ref: { ...current.ref, displayName: normalizedName },
    };
    return persistSkills(existing, skills);
  }

  async function removeCustomSpecialization(
    id: string,
    specializationId: string,
  ): Promise<CharacterRecord> {
    const existing = await requireCharacter(id);
    const skills = existing.data.skills ?? [];
    const target = skills.find(
      (skill) => skill.ref.type === "custom" && skill.ref.specializationId === specializationId,
    );
    if (!target) throw new Error(`找不到自定义专业化：${specializationId}`);
    return persistSkills(
      existing,
      skills.filter((skill) => skill !== target),
    );
  }

  async function remove(id: string): Promise<void> {
    await characterRepository.remove(id);
    records.value = records.value.filter((record) => record.id !== id);
    if (current.value?.id === id) {
      current.value = undefined;
    }
  }

  return {
    records,
    current,
    loading,
    loadList,
    loadById,
    updateName,
    setEra,
    setIdentityDetails,
    addBackstoryEntry,
    updateBackstoryEntry,
    removeBackstoryEntry,
    setKeyConnection,
    ensureResourcesInitialized,
    reconcileSanityToMaximum,
    setCurrentHp,
    setCurrentMp,
    setCurrentSan,
    setCurrentCash,
    setCurrentAssets,
    addAssetEntry,
    updateAssetEntry,
    removeAssetEntry,
    setSkillValue,
    setImprovementChecked,
    createCustomSpecialization,
    renameCustomSpecialization,
    removeCustomSpecialization,
    remove,
  };
});
