import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCharacterStore } from "../../app/stores/characterStore";
import { occupationRequirementApprovalSubject } from "../../coc7/rules/occupationSkills";
import type { Character } from "../../coc7/types/character";
import { db } from "../../db/database";
import { characterRepository } from "../../db/repositories/characterRepository";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
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

async function characterWithCharacteristics(characterId: string): Promise<Character> {
  const record = await characterRepository.getById(characterId);
  if (!record) throw new Error("缺少测试人物");
  return (await characterRepository.update({
    ...record.data,
    characteristics,
    luck: 55,
    age: 25,
  })).data;
}

async function prepareAccountant(): Promise<{
  readonly store: ReturnType<typeof useCreationStore>;
  readonly character: Character;
}> {
  const store = useCreationStore();
  const characterId = await store.start("standard");
  await useCharacterStore().setEra(characterId, "classic-1920s");
  await store.selectCatalogOccupation("accountant");
  await store.ensureDeterministicRequirementSelections();
  await store.setRequirementSelection("personal-or-era-specialties", [
    { type: "standard", definitionId: "history" },
    { type: "standard", definitionId: "medicine" },
  ]);
  await store.setSkillAllocation(
    { type: "standard", definitionId: "credit-rating" },
    30,
    0,
  );
  return { store, character: await characterWithCharacteristics(characterId) };
}

describe("Keeper approval store lifecycle", () => {
  it("只批准当前真实 pending approval，保存 trimmed note，并可精确撤销", async () => {
    const { store, character } = await prepareAccountant();
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      (approval) => approval.reason === "fuzzy-requirement",
    );
    if (!pending) throw new Error("缺少 fuzzy pending approval");

    await expect(store.approvePendingSkillApproval(character, {
      reason: "occupation-definition",
      subjectId: "stale-occupation",
      message: "伪造批准",
    })).rejects.toThrow("已失效或并非当前待批准项目");

    await store.approvePendingSkillApproval(character, pending, "  已与玩家确认  ");
    expect(store.current?.data.skills?.keeperApprovals).toContainEqual({
      reason: pending.reason,
      subjectId: pending.subjectId,
      approved: true,
      note: "已与玩家确认",
    });
    expect(store.getSkillFinalizePlan(character).approvals).not.toContainEqual(
      expect.objectContaining({ reason: pending.reason, subjectId: pending.subjectId }),
    );

    await store.revokeKeeperApproval(pending.reason, pending.subjectId);
    expect(store.current?.data.skills?.keeperApprovals).not.toContainEqual(
      expect.objectContaining({ reason: pending.reason, subjectId: pending.subjectId }),
    );
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual(
      expect.objectContaining({ reason: pending.reason, subjectId: pending.subjectId }),
    );
  });

  it("fuzzy selection 的 SkillRef 集合变化会失效批准，仅调整顺序不会", async () => {
    const { store, character } = await prepareAccountant();
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      (approval) => approval.reason === "fuzzy-requirement",
    );
    if (!pending) throw new Error("缺少 fuzzy pending approval");
    await store.approvePendingSkillApproval(character, pending);

    await store.setRequirementSelection("personal-or-era-specialties", [
      { type: "standard", definitionId: "medicine" },
      { type: "standard", definitionId: "history" },
    ]);
    expect(store.current?.data.skills?.keeperApprovals).toContainEqual(
      expect.objectContaining({ reason: pending.reason, subjectId: pending.subjectId }),
    );

    await store.setRequirementSelection("personal-or-era-specialties", [
      { type: "standard", definitionId: "medicine" },
      { type: "standard", definitionId: "occult" },
    ]);
    expect(store.current?.data.skills?.keeperApprovals).not.toContainEqual(
      expect.objectContaining({ reason: pending.reason, subjectId: pending.subjectId }),
    );
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual({
      reason: "fuzzy-requirement",
      subjectId: occupationRequirementApprovalSubject(
        "accountant",
        "personal-or-era-specialties",
      ),
      message: expect.any(String),
    });
  });

  it("通过 generic API 批准 Deprogrammer replacement，target 改变后仍按既有规则失效", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setOccupationSkillReplacementTarget("history");
    const character = await characterWithCharacteristics(characterId);
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      (approval) => approval.reason === "occupation-skill-replacement",
    );
    if (!pending) throw new Error("缺少 replacement pending approval");

    await store.approvePendingSkillApproval(character, pending);
    expect(store.getSkillFinalizePlan(character).approvals).not.toContainEqual(
      expect.objectContaining({ reason: "occupation-skill-replacement" }),
    );

    await store.setOccupationSkillReplacementTarget("drive-auto");
    expect(store.current?.data.skills?.keeperApprovals).not.toContainEqual(
      expect.objectContaining({ reason: "occupation-skill-replacement" }),
    );
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual(
      expect.objectContaining({
        reason: "occupation-skill-replacement",
        subjectId: expect.stringContaining(":target:drive-auto"),
      }),
    );
  });

  it("Cthulhu Mythos 创建点使用 SkillRef key 作为 generic approval subject", async () => {
    const { store, character } = await prepareAccountant();
    await store.setSkillAllocation(
      { type: "standard", definitionId: "cthulhu-mythos" },
      0,
      10,
    );
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      (approval) => approval.reason === "cthulhu-mythos-allocation",
    );
    expect(pending?.subjectId).toBe("skill:cthulhu-mythos");
    if (!pending) throw new Error("缺少 Mythos pending approval");

    await store.approvePendingSkillApproval(character, pending, "   ");
    expect(store.current?.data.skills?.keeperApprovals).toContainEqual({
      reason: "cthulhu-mythos-allocation",
      subjectId: "skill:cthulhu-mythos",
      approved: true,
    });
    expect(store.getSkillFinalizePlan(character).approvals).not.toContainEqual(
      expect.objectContaining({ reason: "cthulhu-mythos-allocation" }),
    );
  });
});

describe("Credit Rating override store lifecycle", () => {
  it("写入独立 current-occupation override，撤销后恢复 pending，旧职业 override 不应用", async () => {
    const { store, character } = await prepareAccountant();
    await store.setSkillAllocation(
      { type: "standard", definitionId: "credit-rating" },
      80,
      0,
    );
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      (approval) => approval.reason === "credit-rating-override",
    );
    if (!pending) throw new Error("缺少 Credit Rating pending approval");

    await expect(store.approvePendingSkillApproval(character, pending))
      .rejects.toThrow("独立批准操作");
    await store.approveCreditRatingOverride(character, "  KP 同意超出范围  ");
    expect(store.current?.data.skills?.creditRatingOverride).toEqual({
      occupationId: "accountant",
      approved: true,
      reason: "KP 同意超出范围",
    });
    expect(store.current?.data.skills?.keeperApprovals).not.toContainEqual(
      expect.objectContaining({ reason: "credit-rating-override" }),
    );
    expect(store.getSkillFinalizePlan(character).approvals).not.toContainEqual(
      expect.objectContaining({ reason: "credit-rating-override" }),
    );

    await store.revokeCurrentCreditRatingOverride();
    expect(store.current?.data.skills?.creditRatingOverride).toBeUndefined();
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual(
      expect.objectContaining({ reason: "credit-rating-override" }),
    );

    await store.approveCreditRatingOverride(character);
    await store.selectCatalogOccupation("author");
    expect(store.current?.data.skills?.creditRatingOverride?.occupationId).toBe("accountant");
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual(
      expect.objectContaining({ reason: "credit-rating-override" }),
    );
    await store.revokeCurrentCreditRatingOverride();
    expect(store.current?.data.skills?.creditRatingOverride?.occupationId).toBe("accountant");
  });
});

describe("completeSkills blockers and review transition", () => {
  async function prepareCompletion(allocation: number): Promise<{
    readonly store: ReturnType<typeof useCreationStore>;
    readonly character: Character;
  }> {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "classic-1920s");
    await store.selectCustomOccupation({
      version: 1,
      id: crypto.randomUUID(),
      name: { zh: "测试职业", en: "Test Occupation" },
      category: "academic",
      sourceRefs: [{ sourceId: "custom", title: "Test Occupation" }],
      era: { type: "all" },
      creditRating: { min: 0, max: 99 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [{
        id: "accounting",
        selector: { type: "exact", ref: { type: "standard", definitionId: "accounting" } },
        cardinality: { min: 1, max: 1 },
      }],
    });
    await store.setRequirementSelection("accounting", [
      { type: "standard", definitionId: "accounting" },
    ]);
    await store.setSkillAllocation(
      { type: "standard", definitionId: "accounting" },
      allocation,
      0,
    );
    await store.setSkillAllocation(
      { type: "standard", definitionId: "history" },
      0,
      100,
    );
    return { store, character: await characterWithCharacteristics(characterId) };
  }

  it("有 errors 或 approvals 时拒绝完成", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "classic-1920s");
    await store.selectCatalogOccupation("accountant");
    const character = await characterWithCharacteristics(characterId);
    await expect(store.completeSkills(character, true)).rejects.toThrow("尚未完成职业需求");

    await store.ensureDeterministicRequirementSelections();
    await store.setRequirementSelection("personal-or-era-specialties", [
      { type: "standard", definitionId: "history" },
      { type: "standard", definitionId: "medicine" },
    ]);
    await expect(store.completeSkills(character, true)).rejects.toThrow("需要 Keeper review");
  });

  it("warning 未确认时拒绝，确认后原子写入并推进 review", async () => {
    const { store, character } = await prepareCompletion(199);
    expect(store.getSkillFinalizePlan(character).warnings).toContainEqual(
      expect.objectContaining({ code: "unused-occupation-points" }),
    );
    await expect(store.completeSkills(character, false)).rejects.toThrow("完成前必须显式确认");

    const completed = await store.completeSkills(character, true);
    expect(completed.data.occupation?.displayNameSnapshot.zh).toBe("测试职业");
    expect(completed.data.skills?.find(
      (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "accounting",
    )?.currentValue).toBe(204);
    expect(store.current?.data.currentStep).toBe("review");
    expect(store.current?.data.skills?.existingSkillResolution).toEqual({
      action: "rebuild-structured",
      confirmed: true,
    });
    expect((await creationSessionRepository.getByCharacterId(character.id))?.data.currentStep)
      .toBe("review");
  });
});
