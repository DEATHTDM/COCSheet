import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCharacterStore } from "../../app/stores/characterStore";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { getStaleOccupationDraftErrors } from "../presentation/skillDraftConflictPresentation";
import { useCreationStore } from "./creationStore";

const characteristics = {
  STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50,
} as const;

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  await db.delete();
});

async function prepareAccountant(): Promise<{
  readonly store: ReturnType<typeof useCreationStore>;
  readonly characterId: string;
}> {
  const store = useCreationStore();
  const characterId = await store.start("standard");
  await useCharacterStore().setEra(characterId, "classic-1920s");
  await store.selectCatalogOccupation("accountant");
  return { store, characterId };
}

describe("skill allocation store APIs", () => {
  const rapidAccounting = { type: "standard" as const, definitionId: "accounting" };

  it("serializes rapid cross-field writes without losing either field", async () => {
    const { store } = await prepareAccountant();

    const first = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 45);
    const second = store.setSkillAllocationPoint(rapidAccounting, "interestPoints", 10);
    await Promise.all([first, second]);

    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 45,
      interestPoints: 10,
    });
  });

  it("applies the last rapid write to the same field", async () => {
    const { store } = await prepareAccountant();

    const first = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 4);
    const second = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 45);
    await Promise.all([first, second]);

    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 45,
      interestPoints: 0,
    });
  });

  it("serializes reverse rapid cross-field writes", async () => {
    const { store } = await prepareAccountant();

    const first = store.setSkillAllocationPoint(rapidAccounting, "interestPoints", 20);
    const second = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 30);
    await Promise.all([first, second]);

    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 30,
      interestPoints: 20,
    });
  });

  it("deletes a row after rapid writes reduce both fields to zero", async () => {
    const { store } = await prepareAccountant();
    await store.setSkillAllocation(rapidAccounting, 30, 20);

    const first = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 0);
    const second = store.setSkillAllocationPoint(rapidAccounting, "interestPoints", 0);
    await Promise.all([first, second]);

    expect(store.current?.data.skills?.allocations).not.toContainEqual(
      expect.objectContaining({ ref: rapidAccounting }),
    );
  });

  it("restores the final rapid-write state after reload", async () => {
    const { store, characterId } = await prepareAccountant();

    const first = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", 45);
    const second = store.setSkillAllocationPoint(rapidAccounting, "interestPoints", 10);
    await Promise.all([first, second]);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 45,
      interestPoints: 10,
    });
  });

  it("continues queued writes after a rejected mutation", async () => {
    const { store } = await prepareAccountant();

    const invalid = store.setSkillAllocationPoint(rapidAccounting, "occupationPoints", -1);
    const valid = store.setSkillAllocationPoint(rapidAccounting, "interestPoints", 15);
    await expect(invalid).rejects.toThrow("非负整数");
    await valid;

    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 0,
      interestPoints: 15,
    });
  });

  it("pending interest write 后立即 reset 会保留最新兴趣点并清空职业点，reload 一致", async () => {
    const { store, characterId } = await prepareAccountant();
    const interestOnly = { type: "standard" as const, definitionId: "history" };
    await store.setSkillAllocation(interestOnly, 5, 10);

    const pendingWrite = store.setSkillAllocationPoint(interestOnly, "interestPoints", 20);
    await store.resetCurrentOccupationAllocation();
    await pendingWrite;

    expect(store.current?.data.skills?.allocations).toEqual([{
      ref: interestOnly,
      occupationPoints: 0,
      interestPoints: 20,
    }]);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.allocations).toEqual([{
      ref: interestOnly,
      occupationPoints: 0,
      interestPoints: 20,
    }]);
  });

  it("pending allocation 后立即 navigation 保留最新值与 step，reload 一致", async () => {
    const { store, characterId } = await prepareAccountant();
    await store.setSkillAllocation(rapidAccounting, 10, 5);

    const pendingWrite = store.setSkillAllocationPoint(
      rapidAccounting,
      "interestPoints",
      20,
    );
    const navigation = store.setCurrentStep("occupation");
    await Promise.all([pendingWrite, navigation]);

    expect(store.current?.data.currentStep).toBe("occupation");
    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 10,
      interestPoints: 20,
    });

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.currentStep).toBe("occupation");
    expect(restored.current?.data.skills?.allocations).toContainEqual({
      ref: rapidAccounting,
      occupationPoints: 10,
      interestPoints: 20,
    });
  });

  it("upsert 唯一 row，0/0 删除，并保持 requirement/replacement/approval/CR override", async () => {
    const { store } = await prepareAccountant();
    const preserved = {
      requirementSelections: [{
        requirementId: "accounting",
        refs: [{ type: "standard" as const, definitionId: "accounting" }],
      }],
      occupationSkillReplacement: {
        policyId: "old-policy",
        targetRequirementId: "old-target",
      },
      creditRatingOverride: {
        occupationId: "accountant",
        approved: true as const,
        reason: "测试草稿",
      },
      keeperApprovals: [{
        reason: "fuzzy-requirement" as const,
        subjectId: "occupation:accountant:requirement:test",
        approved: true as const,
      }],
    };
    await store.setSkillCreationState({ ...preserved, allocations: [] });
    const accounting = { type: "standard" as const, definitionId: "accounting" };

    await store.setSkillAllocation(accounting, 10, 5);
    await store.setSkillAllocation(accounting, 12, 8);
    expect(store.current?.data.skills).toEqual({
      ...preserved,
      allocations: [{ ref: accounting, occupationPoints: 12, interestPoints: 8 }],
    });

    await store.setSkillAllocation(accounting, 0, 0);
    expect(store.current?.data.skills).toEqual({ ...preserved, allocations: [] });
  });

  it("刷新恢复 allocation，且暂时超预算与 interest-only occupation points 草稿仍可保存", async () => {
    const { store, characterId } = await prepareAccountant();
    const accounting = { type: "standard" as const, definitionId: "accounting" };
    const history = { type: "standard" as const, definitionId: "history" };

    await store.setSkillAllocation(accounting, 999, 0);
    await store.setSkillAllocation(history, 1, 10);
    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("缺少测试人物");
    const withCharacteristics = await characterRepository.update({
      ...character.data,
      characteristics,
    });

    const plan = store.getSkillFinalizePlan(withCharacteristics.data);
    expect(plan.errors.map(({ code }) => code)).toEqual(expect.arrayContaining([
      "occupation-budget-exceeded",
      "occupation-skill-not-eligible",
    ]));

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.allocations).toEqual([
      { ref: accounting, occupationPoints: 999, interestPoints: 0 },
      { ref: history, occupationPoints: 1, interestPoints: 10 },
    ]);
  });

  it("custom interest allocation 使用 Store UUID、保持 requirement selections 不变并刷新恢复", async () => {
    const { store, characterId } = await prepareAccountant();
    const before = store.current?.data.skills?.requirementSelections;

    const ref = await store.createCustomInterestAllocation("art-craft", "  陶艺  ", 20);
    expect(ref).toMatchObject({
      type: "custom",
      definitionId: "art-craft",
      displayName: "陶艺",
    });
    if (ref.type !== "custom") throw new Error("未创建 custom ref");
    expect(ref.specializationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(store.current?.data.skills?.requirementSelections).toEqual(before);
    expect(store.current?.data.skills?.allocations).toContainEqual({
      ref,
      occupationPoints: 0,
      interestPoints: 20,
    });

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.allocations).toContainEqual({
      ref,
      occupationPoints: 0,
      interestPoints: 20,
    });
  });

  it("Language Own 保持单实例，Language Other 允许多个 UUID 实例", async () => {
    const { store } = await prepareAccountant();

    await store.createCustomInterestAllocation("language-own", "中文", 1);
    await expect(store.createCustomInterestAllocation("language-own", "英语", 1))
      .rejects.toThrow("只允许一个技能专攻实例");

    const firstOther = await store.createCustomInterestAllocation("language-other", "西班牙语", 1);
    const secondOther = await store.createCustomInterestAllocation("language-other", "拉丁语", 1);
    if (firstOther.type !== "custom" || secondOther.type !== "custom") {
      throw new Error("未创建 Language Other custom refs");
    }
    expect(firstOther.specializationId).not.toBe(secondOther.specializationId);
    expect(store.current?.data.skills?.allocations.filter(
      ({ ref }) => ref.definitionId === "language-other",
    )).toHaveLength(2);
  });

  it("拒绝空 custom 名称、非正整数点数和不允许 custom 的 parent", async () => {
    const { store } = await prepareAccountant();

    await expect(store.createCustomInterestAllocation("art-craft", " ", 1))
      .rejects.toThrow("名称不能为空");
    await expect(store.createCustomInterestAllocation("art-craft", "陶艺", 0))
      .rejects.toThrow("必须是正整数");
    await expect(store.createCustomInterestAllocation("fighting", "拳法", 1))
      .rejects.toThrow("不允许创建自定义技能专攻");
  });

  it("Accountant 切换 Author 后显式 reset 清除 stale 职业草稿并恢复固定需求", async () => {
    const { store, characterId } = await prepareAccountant();
    await store.ensureDeterministicRequirementSelections();
    await store.setRequirementSelection("personal-or-era-specialties", [
      { type: "standard", definitionId: "medicine" },
      { type: "standard", definitionId: "first-aid" },
    ]);
    await store.setSkillAllocation(rapidAccounting, 30, 0);
    const customInterestRef = await store.createCustomInterestAllocation("art-craft", "陶艺", 10);
    const completedAccountantDraft = store.current?.data.skills;
    if (!completedAccountantDraft) throw new Error("Accountant 技能草稿未初始化");

    await store.selectCatalogOccupation("author");
    await store.setSkillCreationState({
      ...completedAccountantDraft,
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "accounting",
      },
      creditRatingOverride: { occupationId: "accountant", approved: true },
      keeperApprovals: [
        { reason: "fuzzy-requirement", subjectId: "old-requirement", approved: true },
        { reason: "occupation-skill-replacement", subjectId: "old-replacement", approved: true },
        { reason: "cthulhu-mythos-allocation", subjectId: "skill:cthulhu-mythos", approved: true },
        { reason: "skill-creation-point-policy", subjectId: "skill:art-craft", approved: true },
      ],
    });
    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("缺少测试人物");
    const withCharacteristics = await characterRepository.update({
      ...character.data,
      characteristics,
    });

    const stalePlan = store.getSkillFinalizePlan(withCharacteristics.data);
    expect(getStaleOccupationDraftErrors(stalePlan.errors).map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "stale-requirement-selection",
        "invalid-occupation-skill-replacement",
        "occupation-skill-not-eligible",
      ]),
    );
    expect(store.current?.data.skills?.requirementSelections).toEqual(
      completedAccountantDraft.requirementSelections,
    );

    await store.resetCurrentOccupationAllocation();

    const resetState = store.current?.data.skills;
    expect(resetState?.requirementSelections).toEqual(expect.arrayContaining([
      { requirementId: "history", refs: [{ type: "standard", definitionId: "history" }] },
      { requirementId: "library-use", refs: [{ type: "standard", definitionId: "library-use" }] },
      { requirementId: "psychology", refs: [{ type: "standard", definitionId: "psychology" }] },
    ]));
    expect(resetState?.allocations).toEqual([{
      ref: customInterestRef,
      occupationPoints: 0,
      interestPoints: 10,
    }]);
    expect(resetState?.occupationSkillReplacement).toBeUndefined();
    expect(resetState?.creditRatingOverride).toBeUndefined();
    expect(resetState?.keeperApprovals).toEqual([
      { reason: "cthulhu-mythos-allocation", subjectId: "skill:cthulhu-mythos", approved: true },
      { reason: "skill-creation-point-policy", subjectId: "skill:art-craft", approved: true },
    ]);
    expect(getStaleOccupationDraftErrors(
      store.getSkillFinalizePlan(withCharacteristics.data).errors,
    )).toEqual([]);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills).toEqual(resetState);
    expect((await creationSessionRepository.getByCharacterId(characterId))?.data.skills)
      .toEqual(resetState);
  });
});
