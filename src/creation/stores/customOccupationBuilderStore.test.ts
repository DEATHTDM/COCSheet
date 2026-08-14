import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import type { Character } from "../../coc7/types/character";
import type { OccupationDefinition } from "../../coc7/types/occupation";
import { useCharacterStore } from "../../app/stores/characterStore";
import { db } from "../../db/database";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import type { CreationPreset } from "../types/creationPreset";
import { useCreationStore } from "./creationStore";

const occupationId = "22222222-2222-4222-8222-222222222222";
const characteristics = {
  STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50,
} as const;

function customOccupation(name = "自定义调查员"): OccupationDefinition {
  return {
    version: 1,
    id: occupationId,
    name: { zh: name, en: "Custom Investigator" },
    category: "investigation-security",
    sourceRefs: [{ sourceId: "custom", title: "用户自定义职业" }],
    era: { type: "all" },
    creditRating: { min: 10, max: 60 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    skillRequirements: [{
      id: "slot-history",
      selector: { type: "exact", ref: { type: "standard", definitionId: "history" } },
      cardinality: { min: 1, max: 1 },
    }],
  };
}

function preset(allowCustomOccupation: CreationPreset["allowCustomOccupation"]): CreationPreset {
  return {
    version: 1,
    id: "33333333-3333-4333-8333-333333333333",
    name: "测试预设",
    settingId: "standard",
    attributeGeneration: { allowedMethods: ["manual"] },
    allowCustomOccupation,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  await db.delete();
});

describe("custom occupation builder store integration", () => {
  it("保存 custom snapshot 后可刷新，编辑保持 occupation UUID 与已有结构化技能草稿", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.selectCustomOccupation(customOccupation());
    const skillDraft = {
      requirementSelections: [{
        requirementId: "slot-history",
        refs: [{ type: "standard" as const, definitionId: "history" }],
      }],
      allocations: [{
        ref: { type: "standard" as const, definitionId: "history" },
        occupationPoints: 20,
        interestPoints: 10,
      }],
      keeperApprovals: [],
    };
    await store.setSkillCreationState(skillDraft);
    await store.selectCustomOccupation(customOccupation("编辑后的职业"));

    expect(store.current?.data.occupation).toMatchObject({
      kind: "custom",
      selectedOccupationId: occupationId,
      definitionSnapshot: { id: occupationId, name: { zh: "编辑后的职业" } },
    });
    expect(store.current?.data.skills).toEqual(skillDraft);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    expect(restored.current?.data.occupation?.selectedOccupationId).toBe(occupationId);
    expect(restored.current?.data.occupation?.definitionSnapshot.name.zh).toBe("编辑后的职业");
    expect(restored.current?.data.skills).toEqual(skillDraft);
    expect((await creationSessionRepository.getByCharacterId(characterId))?.data.skills)
      .toEqual(skillDraft);
  });

  it("catalog → custom 保留 skill draft 供既有 4A stale/conflict semantics 处理", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.selectCatalogOccupation("accountant");
    const skillDraft = {
      requirementSelections: [{
        requirementId: "accounting",
        refs: [{ type: "standard" as const, definitionId: "accounting" }],
      }],
      allocations: [{
        ref: { type: "standard" as const, definitionId: "accounting" },
        occupationPoints: 40,
        interestPoints: 0,
      }],
      keeperApprovals: [],
    };
    await store.setSkillCreationState(skillDraft);

    await store.selectCustomOccupation(customOccupation());

    expect(store.current?.data.skills).toEqual(skillDraft);
  });

  it("allowCustomOccupation=false 在 Store 边界阻断保存，已有 custom 仍由 finalizer 阻断", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard", preset(false));
    await useCharacterStore().setEra(characterId, "classic-1920s");

    await expect(store.selectCustomOccupation(customOccupation()))
      .rejects.toThrow("当前 KP 预设禁止自定义职业");

    const session = store.current?.data;
    if (!session) throw new Error("会话不存在");
    await creationSessionRepository.update({
      ...session,
      occupation: {
        kind: "custom",
        selectedOccupationId: occupationId,
        definitionSnapshot: customOccupation(),
      },
      skills: { requirementSelections: [], allocations: [], keeperApprovals: [] },
    });
    await store.loadByCharacterId(characterId);
    const character: Character = {
      version: 1,
      id: characterId,
      name: "测试调查员",
      settingId: "standard",
      eraId: "classic-1920s",
      characteristics,
    };
    expect(store.getSkillFinalizePlan(character).errors.map(({ code }) => code))
      .toContain("preset-occupation-banned");
  });

  it("keeper-approval 可以选择并产生既有 custom-occupation pending approval", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard", preset("keeper-approval"));
    await useCharacterStore().setEra(characterId, "classic-1920s");
    await store.selectCustomOccupation({ ...customOccupation(), skillRequirements: [] });
    const character: Character = {
      version: 1,
      id: characterId,
      name: "测试调查员",
      settingId: "standard",
      eraId: "classic-1920s",
      characteristics,
    };

    expect(store.getSkillFinalizePlan(character).errors.map(({ code }) => code))
      .not.toContain("preset-occupation-banned");
    expect(store.getSkillFinalizePlan(character).approvals).toContainEqual(expect.objectContaining({
      reason: "custom-occupation",
      subjectId: occupationId,
    }));
  });

  it("custom occupation 完整走过 requirement、allocation、approval、completeSkills 到 Review", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard", preset("keeper-approval"));
    await useCharacterStore().setEra(characterId, "classic-1920s");
    await store.selectCustomOccupation({
      ...customOccupation(),
      creditRating: { min: 0, max: 99 },
    });
    await store.ensureDeterministicRequirementSelections();
    await store.setSkillAllocation(
      { type: "standard", definitionId: "history" },
      195,
      0,
    );
    const character: Character = {
      version: 1,
      id: characterId,
      name: "测试调查员",
      settingId: "standard",
      eraId: "classic-1920s",
      characteristics,
    };
    const pending = store.getSkillFinalizePlan(character).approvals.find(
      ({ reason }) => reason === "custom-occupation",
    );
    if (!pending) throw new Error("未产生 custom occupation approval");
    await store.approvePendingSkillApproval(character, pending, "KP 已确认");

    const completed = await store.completeSkills(character, true);

    expect(store.current?.data.currentStep).toBe("review");
    expect(completed.data.occupation).toMatchObject({ kind: "custom", id: occupationId });
    expect(completed.data.skills).toContainEqual({
      ref: { type: "standard", definitionId: "history" },
      currentValue: 200,
      improvementChecked: false,
    });
  });
});
