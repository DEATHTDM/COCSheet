import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { characteristicIds } from "../../coc7/types/attribute";
import { useCharacterStore } from "../../app/stores/characterStore";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { creationWorkflowRepository } from "../../db/repositories/creationWorkflowRepository";
import { useCreationStore } from "./creationStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

const initialValues = {
  STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50,
} as const;

async function prepareCompletableManual(store: ReturnType<typeof useCreationStore>): Promise<string> {
  const characterId = await store.start("standard");
  await useCharacterStore().setEra(characterId, "classic-1920s");
  await store.setAge(15);
  await store.chooseGenerationMethod("manual");
  for (const id of characteristicIds) await store.setEnteredValue(id, initialValues[id]);
  await store.setReduction("STR", 5);
  await store.setManualLuck(55);
  return characterId;
}

describe("Manual 未完成状态", () => {
  it("从空输入开始，填满八项后才生成 Base", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.chooseGenerationMethod("manual");
    expect(store.current?.data.attributes?.generation).toEqual({ method: "manual", values: {} });

    for (const id of characteristicIds.slice(0, 7)) await store.setEnteredValue(id, 50);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toBeUndefined();

    await store.setEnteredValue("EDU", 60);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toEqual({
      STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 60,
    });
  });

  it("刷新后可恢复尚未填完的 Manual 输入", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.chooseGenerationMethod("manual");
    await store.setEnteredValue("STR", 55);
    await store.setEnteredValue("CON", 60);
    await store.setEnteredValue("SIZ", 65);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    const generation = restored.current?.data.attributes?.generation;
    if (generation?.method !== "manual") throw new Error("未恢复 Manual 状态");
    expect(generation?.values).toEqual({ STR: 55, CON: 60, SIZ: 65 });
    expect(generation?.baseCharacteristics).toBeUndefined();
  });
});

describe("Point Buy 未完成状态", () => {
  it("从最低合法分配开始，精确达到总点数后才生成 Base", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.chooseGenerationMethod("point-buy");
    const initial = store.current?.data.attributes?.generation;
    if (initial?.method !== "point-buy") throw new Error("未初始化 Point Buy 状态");
    expect(initial?.values).toEqual({ STR: 15, CON: 15, SIZ: 40, DEX: 15, APP: 15, INT: 40, POW: 15, EDU: 15 });
    expect(initial?.baseCharacteristics).toBeUndefined();

    const completed = { STR: 50, CON: 50, SIZ: 60, DEX: 50, APP: 50, INT: 60, POW: 50, EDU: 90 } as const;
    for (const id of characteristicIds) await store.setEnteredValue(id, completed[id]);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toEqual(completed);
  });
});

describe("catalog occupation selection", () => {
  it("保存目录定义快照，并在明确更换职业时保留技能草稿", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.selectCatalogOccupation("accountant");
    expect(store.current?.data.occupation).toMatchObject({
      kind: "catalog",
      selectedOccupationId: "accountant",
      definitionSnapshot: { id: "accountant", name: { zh: "会计师" } },
    });

    const draft = {
      requirementSelections: [{
        requirementId: "history",
        refs: [{ type: "standard" as const, definitionId: "history" }],
      }],
      allocations: [{
        ref: { type: "standard" as const, definitionId: "history" },
        occupationPoints: 20,
        interestPoints: 10,
      }],
      keeperApprovals: [],
    };
    await store.setSkillCreationState(draft);
    await store.selectCatalogOccupation("author");

    expect(store.current?.data.occupation).toMatchObject({
      kind: "catalog",
      selectedOccupationId: "author",
      definitionSnapshot: { id: "author", name: { zh: "作家（原作向）" } },
    });
    expect(store.current?.data.skills).toEqual(draft);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.occupation?.definitionSnapshot.id).toBe("author");
    expect(restored.current?.data.skills).toEqual(draft);
  });
});

describe("完成前语义校验", () => {
  it("拒绝被篡改的 EDU 历史与 rolled Luck", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.setAge(25);
    await store.chooseGenerationMethod("manual");
    for (const id of characteristicIds) await store.setEnteredValue(id, 50);

    const currentSession = store.current?.data;
    if (!currentSession?.attributes?.ageAdjustment) throw new Error("属性状态未初始化");
    await creationSessionRepository.update({
      ...currentSession,
      attributes: {
        ...currentSession.attributes,
        ageAdjustment: {
          ...currentSession.attributes.ageAdjustment,
          eduImprovements: [{ checkRoll: 70, eduBefore: 50, success: false, eduAfter: 50 }],
        },
        luck: {
          source: "rolled",
          rolls: [{ dice: [1, 2, 3], modifier: 0, total: 35 }],
          value: 35,
        },
      },
    });
    await store.loadByCharacterId(characterId);
    const errors = store.getCompletionErrors();
    expect(errors.some((error) => error.includes("成功状态"))).toBe(true);
    expect(errors.some((error) => error.includes("Luck 结果"))).toBe(true);
  });
});

describe("完成属性与 Character resources", () => {
  it("在推进到 occupation 时一起初始化 HP、MP 与 SAN，并可刷新恢复", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("调查员不存在");

    const completed = await store.completeAttributes(character.data);
    expect(completed.data.resources).toEqual({
      hp: { current: 10 },
      mp: { current: 10 },
      san: { current: 50 },
    });
    expect(store.current?.data.currentStep).toBe("occupation");

    setActivePinia(createPinia());
    const restoredCharacter = await useCharacterStore().loadById(characterId);
    const restoredSession = await useCreationStore().loadByCharacterId(characterId);
    expect(restoredCharacter?.data.resources).toEqual(completed.data.resources);
    expect(restoredSession?.data.currentStep).toBe("occupation");
  });

  it("返回修改属性并重新完成后按新最终属性重置资源", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const original = await characterRepository.getById(characterId);
    if (!original) throw new Error("调查员不存在");
    await store.completeAttributes(original.data);

    const characterStore = useCharacterStore();
    await characterStore.loadById(characterId);
    await characterStore.setCurrentHp(characterId, 3);
    await characterStore.setCurrentMp(characterId, 4);
    await characterStore.setCurrentSan(characterId, 90);

    await store.setCurrentStep("attributes");
    const changed = { ...initialValues, CON: 70, SIZ: 60, POW: 65 } as const;
    for (const id of characteristicIds) await store.setEnteredValue(id, changed[id]);
    await store.setReduction("STR", 5);
    const latest = await characterRepository.getById(characterId);
    if (!latest) throw new Error("调查员不存在");
    const completed = await store.completeAttributes(latest.data);

    expect(completed.data.resources).toEqual({
      hp: { current: 13 },
      mp: { current: 13 },
      san: { current: 65 },
    });
  });

  it("重新完成属性时保留技能，并以已有 Mythos 限制初始 SAN", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const original = await characterRepository.getById(characterId);
    if (!original) throw new Error("调查员不存在");
    await store.completeAttributes(original.data);

    const characterStore = useCharacterStore();
    await characterStore.loadById(characterId);
    await characterStore.setSkillValue(
      characterId,
      { type: "standard", definitionId: "cthulhu-mythos" },
      40,
    );
    await characterStore.setSkillValue(
      characterId,
      { type: "standard", definitionId: "library-use" },
      55,
    );

    await store.setCurrentStep("attributes");
    const changed = { ...initialValues, CON: 70, SIZ: 60, POW: 70 } as const;
    for (const id of characteristicIds) await store.setEnteredValue(id, changed[id]);
    await store.setReduction("STR", 5);
    const latest = await characterRepository.getById(characterId);
    if (!latest) throw new Error("调查员不存在");
    const workflowUpdateSpy = vi.spyOn(creationWorkflowRepository, "updateCharacterWithSession");

    const completed = await store.completeAttributes(latest.data);

    expect(workflowUpdateSpy).toHaveBeenCalledTimes(1);
    expect(completed.data.resources).toEqual({
      hp: { current: 13 },
      mp: { current: 14 },
      san: { current: 59 },
    });
    expect(completed.data.skills).toEqual(latest.data.skills);
    expect(completed.data.skills?.find(
      (skill) => skill.ref.type === "standard" &&
        skill.ref.definitionId === "cthulhu-mythos",
    )?.currentValue).toBe(40);
    expect(store.current?.data.currentStep).toBe("occupation");
  });

  it("显式 Mythos 0 不改变正常 POW 初始 SAN", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const characterStore = useCharacterStore();
    await characterStore.loadById(characterId);
    await characterStore.setSkillValue(
      characterId,
      { type: "standard", definitionId: "cthulhu-mythos" },
      0,
    );
    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("调查员不存在");

    const completed = await store.completeAttributes(character.data);

    expect(completed.data.resources?.san.current).toBe(50);
    expect(completed.data.skills).toEqual(character.data.skills);
  });
});

describe("Phase 5A skills finalize foundation", () => {
  it("SettingPack 声明时代时，store 拒绝为缺少 Character.eraId 的人物生成结算计划", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.selectCatalogOccupation("accountant");
    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("调查员不存在");

    expect(character.data.eraId).toBeUndefined();
    expect(() => store.getSkillFinalizePlan(character.data)).toThrow("请先选择建卡时代");
    await expect(store.completeSkills(character.data)).rejects.toThrow("请先选择建卡时代");
  });

  it("保留属性回退期间的职业/分配草稿，并原子写入 Character.skills + review", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const initialCharacter = await characterRepository.getById(characterId);
    if (!initialCharacter) throw new Error("调查员不存在");
    await store.completeAttributes(initialCharacter.data);

    const customOccupationId = crypto.randomUUID();
    await store.selectCustomOccupation({
      version: 1,
      id: customOccupationId,
      name: { zh: "自定义医学顾问", en: "Custom Medical Consultant" },
      category: "medical",
      sourceRefs: [{ sourceId: "custom", title: "Keeper Custom Occupation" }],
      era: { type: "all" },
      creditRating: { min: 0, max: 0 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [{
        id: "medicine",
        selector: { type: "exact", ref: { type: "standard", definitionId: "medicine" } },
        cardinality: { min: 1, max: 1 },
      }],
    });
    await store.setSkillCreationState({
      requirementSelections: [{
        requirementId: "medicine",
        refs: [{ type: "standard", definitionId: "medicine" }],
      }],
      allocations: [{
        ref: { type: "standard", definitionId: "medicine" },
        occupationPoints: 180,
        interestPoints: 100,
      }],
      keeperApprovals: [],
    });
    const beforeReturn = store.current?.data;
    if (!beforeReturn?.occupation || !beforeReturn.skills) throw new Error("技能草稿未建立");

    await store.setCurrentStep("attributes");
    const currentCharacter = await characterRepository.getById(characterId);
    if (!currentCharacter) throw new Error("调查员不存在");
    await store.completeAttributes(currentCharacter.data);
    expect(store.current?.data.occupation).toEqual(beforeReturn.occupation);
    expect(store.current?.data.skills).toEqual(beforeReturn.skills);

    await store.setCurrentStep("skills");
    const latestCharacter = await characterRepository.getById(characterId);
    if (!latestCharacter) throw new Error("调查员不存在");
    const updateSpy = vi.spyOn(creationWorkflowRepository, "updateCharacterWithSession");
    const completed = await store.completeSkills(latestCharacter.data);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(completed.data.occupation).toMatchObject({
      kind: "custom",
      id: customOccupationId,
      displayNameSnapshot: { zh: "自定义医学顾问", en: "Custom Medical Consultant" },
    });
    expect(completed.data.skills?.find(
      (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "medicine",
    )?.currentValue).toBe(281);
    expect(store.current?.data.currentStep).toBe("review");

    const refreshedCharacter = await characterRepository.getById(characterId);
    const refreshedSession = await creationSessionRepository.getByCharacterId(characterId);
    expect(refreshedCharacter?.data.skills).toEqual(completed.data.skills);
    expect(refreshedSession?.data.currentStep).toBe("review");
    expect(refreshedSession?.data.occupation?.definitionSnapshot.pointFormula).toEqual({
      type: "attribute",
      attribute: "EDU",
      multiplier: 4,
    });
  });

  it("完成技能时在同一 workflow update 中按最终 Mythos 收紧 SAN，并保留 HP/MP", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const initialCharacter = await characterRepository.getById(characterId);
    if (!initialCharacter) throw new Error("调查员不存在");
    const afterAttributes = await store.completeAttributes(initialCharacter.data);
    const prepared = await characterRepository.update({
      ...afterAttributes.data,
      resources: {
        hp: { current: 8 },
        mp: { current: 7 },
        san: { current: 70 },
      },
    });
    const occupationId = crypto.randomUUID();
    await store.selectCustomOccupation({
      version: 1,
      id: occupationId,
      name: { zh: "神话研究员", en: "Mythos Researcher" },
      category: "academic",
      sourceRefs: [{ sourceId: "custom", title: "Keeper Custom Occupation" }],
      era: { type: "all" },
      creditRating: { min: 0, max: 99 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [],
    });
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        occupationPoints: 0,
        interestPoints: 40,
      }],
      keeperApprovals: [{
        reason: "cthulhu-mythos-allocation",
        subjectId: "skill:cthulhu-mythos",
        approved: true,
      }],
    });
    const updateSpy = vi.spyOn(creationWorkflowRepository, "updateCharacterWithSession");

    const completed = await store.completeSkills(prepared.data, true);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(completed.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 7 },
      san: { current: 59 },
    });
    const refreshed = await characterRepository.getById(characterId);
    expect(refreshed?.data.resources?.san.current).toBe(59);
    expect(store.current?.data.currentStep).toBe("review");
  });

  it("重建为较低 Mythos 不自动恢复 SAN", async () => {
    const store = useCreationStore();
    const characterId = await prepareCompletableManual(store);
    const initialCharacter = await characterRepository.getById(characterId);
    if (!initialCharacter) throw new Error("调查员不存在");
    const afterAttributes = await store.completeAttributes(initialCharacter.data);
    const prepared = await characterRepository.update({
      ...afterAttributes.data,
      resources: {
        hp: { current: 8 },
        mp: { current: 7 },
        san: { current: 50 },
      },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    });
    const occupationId = crypto.randomUUID();
    await store.selectCustomOccupation({
      version: 1,
      id: occupationId,
      name: { zh: "神话重建", en: "Mythos Rebuild" },
      category: "academic",
      sourceRefs: [{ sourceId: "custom", title: "Keeper Custom Occupation" }],
      era: { type: "all" },
      creditRating: { min: 0, max: 99 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [],
    });
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        occupationPoints: 0,
        interestPoints: 20,
      }],
      keeperApprovals: [{
        reason: "cthulhu-mythos-allocation",
        subjectId: "skill:cthulhu-mythos",
        approved: true,
      }],
      existingSkillResolution: { action: "rebuild-structured", confirmed: true },
    });
    const updateSpy = vi.spyOn(creationWorkflowRepository, "updateCharacterWithSession");

    const completed = await store.completeSkills(prepared.data, true);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(completed.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 7 },
      san: { current: 50 },
    });
    expect(completed.data.skills?.find(
      (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "cthulhu-mythos",
    )?.currentValue).toBe(20);
  });
});
