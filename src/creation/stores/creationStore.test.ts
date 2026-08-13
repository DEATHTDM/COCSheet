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

describe("requirement selection store API", () => {
  it("自动补齐 deterministic exact 需求，重复调用保持相同结果", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("accountant");

    await store.ensureDeterministicRequirementSelections();
    const first = store.current?.data.skills?.requirementSelections;
    expect(first).toEqual(expect.arrayContaining([
      { requirementId: "accounting", refs: [{ type: "standard", definitionId: "accounting" }] },
      { requirementId: "law", refs: [{ type: "standard", definitionId: "law" }] },
      { requirementId: "library-use", refs: [{ type: "standard", definitionId: "library-use" }] },
      { requirementId: "listen", refs: [{ type: "standard", definitionId: "listen" }] },
      { requirementId: "persuade", refs: [{ type: "standard", definitionId: "persuade" }] },
      { requirementId: "spot-hidden", refs: [{ type: "standard", definitionId: "spot-hidden" }] },
    ]));
    expect(first).toHaveLength(6);

    await store.ensureDeterministicRequirementSelections();
    expect(store.current?.data.skills?.requirementSelections).toEqual(first);
  });

  it("Deprogrammer 的有效 History replacement target 不自动补齐且 finalizer 不报 selection 共存", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [],
      keeperApprovals: [],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
    });

    await store.ensureDeterministicRequirementSelections();
    const first = store.current?.data.skills;
    const selectedRequirementIds = first?.requirementSelections.map(({ requirementId }) => requirementId);
    expect(selectedRequirementIds).not.toContain("history");
    expect(selectedRequirementIds).toEqual(expect.arrayContaining([
      "drive-auto",
      "occult",
      "psychology",
      "stealth",
    ]));
    expect(first?.occupationSkillReplacement).toEqual({
      policyId: "keeper-approved-hypnosis",
      targetRequirementId: "history",
    });

    const character = await characterRepository.getById(characterId);
    if (!character) throw new Error("调查员不存在");
    const plan = store.getSkillFinalizePlan({
      ...character.data,
      characteristics: initialValues,
    });
    expect(plan.errors.map(({ code }) => code)).not.toContain("invalid-occupation-skill-replacement");
    expect(plan.approvals.map(({ reason }) => reason)).toContain("occupation-skill-replacement");

    await store.ensureDeterministicRequirementSelections();
    expect(store.current?.data.skills).toEqual(first);
  });

  it("Deprogrammer 的有效 Drive Auto replacement target 只跳过该 exact requirement", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [],
      keeperApprovals: [],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "drive-auto",
      },
    });

    await store.ensureDeterministicRequirementSelections();

    const selectedRequirementIds = store.current?.data.skills?.requirementSelections
      .map(({ requirementId }) => requirementId);
    expect(selectedRequirementIds).not.toContain("drive-auto");
    expect(selectedRequirementIds).toEqual(expect.arrayContaining([
      "history",
      "occult",
      "psychology",
      "stealth",
    ]));
    expect(store.current?.data.skills?.occupationSkillReplacement).toEqual({
      policyId: "keeper-approved-hypnosis",
      targetRequirementId: "drive-auto",
    });
  });

  it("错误 replacement policy 不抑制 Deprogrammer 的 deterministic exact auto-fill", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [],
      keeperApprovals: [],
      occupationSkillReplacement: {
        policyId: "old-invalid-policy",
        targetRequirementId: "history",
      },
    });

    await store.ensureDeterministicRequirementSelections();

    expect(store.current?.data.skills?.requirementSelections).toContainEqual({
      requirementId: "history",
      refs: [{ type: "standard", definitionId: "history" }],
    });
    expect(store.current?.data.skills?.occupationSkillReplacement).toEqual({
      policyId: "old-invalid-policy",
      targetRequirementId: "history",
    });
  });

  it("职业切换遗留 replacement draft 不抑制当前职业的 deterministic exact auto-fill", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [],
      keeperApprovals: [],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
    });
    await store.selectCatalogOccupation("author");

    await store.ensureDeterministicRequirementSelections();

    expect(store.current?.data.skills?.requirementSelections).toContainEqual({
      requirementId: "history",
      refs: [{ type: "standard", definitionId: "history" }],
    });
    expect(store.current?.data.skills?.occupationSkillReplacement).toEqual({
      policyId: "keeper-approved-hypnosis",
      targetRequirementId: "history",
    });
  });

  it("不覆盖已有同 requirement draft，也不删除旧职业留下的 stale selection", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("accountant");
    await store.setSkillCreationState({
      requirementSelections: [
        { requirementId: "law", refs: [{ type: "standard", definitionId: "history" }] },
        { requirementId: "old-occupation-slot", refs: [{ type: "standard", definitionId: "medicine" }] },
      ],
      allocations: [],
      keeperApprovals: [],
    });

    await store.ensureDeterministicRequirementSelections();

    expect(store.current?.data.skills?.requirementSelections).toEqual(expect.arrayContaining([
      { requirementId: "law", refs: [{ type: "standard", definitionId: "history" }] },
      { requirementId: "old-occupation-slot", refs: [{ type: "standard", definitionId: "medicine" }] },
    ]));
    expect(store.current?.data.skills?.requirementSelections.filter(
      (selection) => selection.requirementId === "law",
    )).toHaveLength(1);
  });

  it("upsert/remove 后可刷新恢复，并保持 allocations、approvals 与 replacement draft", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.selectCatalogOccupation("deprogrammer");
    const preserved = {
      allocations: [{
        ref: { type: "standard" as const, definitionId: "history" },
        occupationPoints: 20,
        interestPoints: 10,
      }],
      keeperApprovals: [{
        reason: "occupation-skill-replacement" as const,
        subjectId: "deprogrammer:keeper-approved-hypnosis:history",
        approved: true as const,
      }],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
    };
    await store.setSkillCreationState({ requirementSelections: [], ...preserved });

    await store.setRequirementSelection("brawl-or-firearms", [{
      type: "predefined",
      definitionId: "firearms",
      specializationId: "handgun",
    }]);
    expect(store.current?.data.skills).toMatchObject(preserved);
    expect(store.current?.data.skills?.requirementSelections).toEqual([{
      requirementId: "brawl-or-firearms",
      refs: [{ type: "predefined", definitionId: "firearms", specializationId: "handgun" }],
    }]);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.requirementSelections).toEqual([{
      requirementId: "brawl-or-firearms",
      refs: [{ type: "predefined", definitionId: "firearms", specializationId: "handgun" }],
    }]);
    expect(restored.current?.data.skills).toMatchObject(preserved);

    await restored.setRequirementSelection("brawl-or-firearms", []);
    expect(restored.current?.data.skills?.requirementSelections).toEqual([]);
    expect(restored.current?.data.skills).toMatchObject(preserved);
  });

  it("拒绝非当前职业 requirementId", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("accountant");

    await expect(store.setRequirementSelection("old-occupation-slot", [{
      type: "standard",
      definitionId: "history",
    }])).rejects.toThrow("该职业不存在此技能需求");
  });

  it("创建并刷新恢复 Antiquarian Other Language custom，且 outer 1/1 会替换旧 selection", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "classic-1920s");
    await store.selectCatalogOccupation("antiquarian");

    await store.createCustomRequirementSpecialization(
      "other-language",
      "language-other",
      "  西班牙语  ",
    );
    const first = store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "other-language",
    )?.refs[0];
    expect(first).toMatchObject({
      type: "custom",
      definitionId: "language-other",
      displayName: "西班牙语",
    });
    expect(first?.type === "custom" ? first.specializationId : undefined)
      .toMatch(/^[0-9a-f-]{36}$/i);

    await store.createCustomRequirementSpecialization(
      "other-language",
      "language-other",
      "法语",
    );
    const second = store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "other-language",
    )?.refs;
    expect(second).toHaveLength(1);
    expect(second?.[0]).toMatchObject({
      type: "custom",
      definitionId: "language-other",
      displayName: "法语",
    });
    expect(second?.[0]?.type === "custom" ? second[0].specializationId : undefined)
      .not.toBe(first?.type === "custom" ? first.specializationId : undefined);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "other-language",
    )?.refs).toEqual(second);
  });

  it("Clerk / Executive 可在 Own / Other custom 间切换，且 Language Own 不能绕过单实例限制", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("white-collar-worker-clerk-executive");

    await store.createCustomRequirementSpecialization("language", "language-own", "中文");
    await expect(store.createCustomRequirementSpecialization(
      "personal-or-era",
      "language-own",
      "粤语",
    )).rejects.toThrow("母语只允许一个专业化实例");

    await store.createCustomRequirementSpecialization("language", "language-other", "英语");
    expect(store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "language",
    )?.refs).toEqual([expect.objectContaining({
      type: "custom",
      definitionId: "language-other",
      displayName: "英语",
    })]);
  });

  it("Language Other 在允许多个的 any-skill 2/2 中可创建多个不同 UUID 实例", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("white-collar-worker-clerk-executive");

    await store.createCustomRequirementSpecialization("personal-or-era", "language-other", "西班牙语");
    await store.createCustomRequirementSpecialization("personal-or-era", "language-other", "法语");
    const refs = store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "personal-or-era",
    )?.refs;
    expect(refs).toHaveLength(2);
    expect(refs?.map((ref) => ref.type === "custom" ? ref.specializationId : undefined))
      .toHaveLength(new Set(refs?.map((ref) => ref.type === "custom" ? ref.specializationId : undefined)).size);
  });

  it("production named-custom 使用固定中文名称且任意名称不能满足 selector", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("engineer");

    await expect(store.createCustomRequirementSpecialization(
      "technical-drawing",
      "art-craft",
      "随意名称",
    )).rejects.toThrow("不符合当前职业技能需求");
    await store.createCustomRequirementSpecialization(
      "technical-drawing",
      "art-craft",
      "Technical Drawing",
    );
    expect(store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "technical-drawing",
    )?.refs).toEqual([expect.objectContaining({
      type: "custom",
      definitionId: "art-craft",
      displayName: "技术制图",
    })]);
  });

  it("真实 any-skill 2/2 可混合 Art/Craft custom 与 concrete ref", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("white-collar-worker-clerk-executive");
    await store.setRequirementSelection("personal-or-era", [{
      type: "standard",
      definitionId: "history",
    }]);
    await store.createCustomRequirementSpecialization("personal-or-era", "art-craft", "陶艺");
    expect(store.current?.data.skills?.requirementSelections.find(
      ({ requirementId }) => requirementId === "personal-or-era",
    )?.refs).toEqual(expect.arrayContaining([
      { type: "standard", definitionId: "history" },
      expect.objectContaining({ type: "custom", definitionId: "art-craft", displayName: "陶艺" }),
    ]));
  });

  it("Deprogrammer replacement target 切换/取消会恢复 deterministic selection 且非 deterministic 不猜测", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("deprogrammer");
    await store.ensureDeterministicRequirementSelections();
    await store.setRequirementSelection("brawl-or-firearms", [{
      type: "predefined",
      definitionId: "firearms",
      specializationId: "handgun",
    }]);

    await store.setOccupationSkillReplacementTarget("history");
    expect(store.current?.data.skills?.requirementSelections.map(({ requirementId }) => requirementId))
      .not.toContain("history");
    expect(store.current?.data.skills?.occupationSkillReplacement?.targetRequirementId).toBe("history");
    await expect(store.setRequirementSelection("history", [{
      type: "standard",
      definitionId: "history",
    }])).rejects.toThrow("已被替换的职业技能需求不能保存普通 selection");

    await store.setOccupationSkillReplacementTarget("drive-auto");
    expect(store.current?.data.skills?.requirementSelections).toEqual(expect.arrayContaining([{
      requirementId: "history",
      refs: [{ type: "standard", definitionId: "history" }],
    }]));
    expect(store.current?.data.skills?.requirementSelections.map(({ requirementId }) => requirementId))
      .not.toContain("drive-auto");

    await store.setOccupationSkillReplacementTarget("brawl-or-firearms");
    expect(store.current?.data.skills?.requirementSelections).toEqual(expect.arrayContaining([{
      requirementId: "drive-auto",
      refs: [{ type: "standard", definitionId: "drive-auto" }],
    }]));
    expect(store.current?.data.skills?.requirementSelections.map(({ requirementId }) => requirementId))
      .not.toContain("brawl-or-firearms");

    await store.setOccupationSkillReplacementTarget(undefined);
    expect(store.current?.data.skills?.occupationSkillReplacement).toBeUndefined();
    expect(store.current?.data.skills?.requirementSelections.map(({ requirementId }) => requirementId))
      .not.toContain("brawl-or-firearms");
  });

  it("replacement target 变化精确失效当前 occupation/policy approvals，同 target 为 no-op", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await useCharacterStore().setEra(characterId, "modern");
    await store.selectCatalogOccupation("deprogrammer");
    await store.setSkillCreationState({
      requirementSelections: [],
      allocations: [],
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
      keeperApprovals: [
        {
          reason: "occupation-skill-replacement",
          subjectId: "occupation:deprogrammer:replacement:keeper-approved-hypnosis:target:history",
          approved: true,
        },
        {
          reason: "occupation-skill-replacement",
          subjectId: "occupation:other:replacement:keeper-approved-hypnosis:target:history",
          approved: true,
        },
        { reason: "occupation-definition", subjectId: "deprogrammer", approved: true },
      ],
    });
    const updateSpy = vi.spyOn(creationSessionRepository, "update");

    await store.setOccupationSkillReplacementTarget("history");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(store.current?.data.skills?.keeperApprovals).toHaveLength(3);

    await store.setOccupationSkillReplacementTarget("drive-auto");
    expect(store.current?.data.skills?.keeperApprovals).toEqual([
      {
        reason: "occupation-skill-replacement",
        subjectId: "occupation:other:replacement:keeper-approved-hypnosis:target:history",
        approved: true,
      },
      { reason: "occupation-definition", subjectId: "deprogrammer", approved: true },
    ]);
    await store.setOccupationSkillReplacementTarget("history");
    expect(store.current?.data.skills?.keeperApprovals).not.toContainEqual(expect.objectContaining({
      subjectId: "occupation:deprogrammer:replacement:keeper-approved-hypnosis:target:history",
    }));
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
