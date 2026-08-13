import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCharacterStore } from "../../app/stores/characterStore";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
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
      .rejects.toThrow("只允许一个专业化实例");

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
      .rejects.toThrow("不允许创建自定义专业化");
  });
});
