// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Character } from "../coc7/types/character";
import { useCreationStore } from "../creation/stores/creationStore";
import type { CreationSession, CreationStepId } from "../creation/types/creationSession";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationSessionRepository } from "../db/repositories/creationSessionRepository";
import { kpPresetRepository } from "../db/repositories/kpPresetRepository";
import CharacterEditorPage from "./CharacterEditorPage.vue";

const characterId = "a0000000-0000-4000-8000-000000000010";

function makeCharacter(settingId: Character["settingId"] = "standard"): Character {
  return {
    version: 1,
    id: characterId,
    name: "Guide Tester",
    settingId,
    ...(settingId === "standard" ? { eraId: "classic-1920s" as const } : {}),
    age: 30,
    sex: "测试",
    residence: "上海",
    birthplace: "香港",
    characteristics: {
      STR: 50,
      CON: 50,
      SIZ: 50,
      DEX: 50,
      APP: 50,
      INT: 50,
      POW: 50,
      EDU: 50,
    },
    luck: 50,
    resources: { hp: { current: 10 }, mp: { current: 10 }, san: { current: 50 } },
  };
}

function makeSession(
  settingId: CreationSession["settingId"] = "standard",
  currentStep: CreationStepId = "basic-info",
): CreationSession {
  return {
    version: 1,
    characterId,
    settingId,
    currentStep,
    draftAge: 30,
  };
}

async function mountPage(
  character: Character,
  session: CreationSession,
): Promise<{ wrapper: VueWrapper; router: Router }> {
  await characterRepository.create(character);
  await creationSessionRepository.create(session);
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/characters/:id", component: CharacterEditorPage },
      { path: "/characters/:id/sheet", component: { template: "<div />" } },
    ],
  });
  await router.push(`/characters/${character.id}`);
  await router.isReady();
  const wrapper = mount(CharacterEditorPage, { global: { plugins: [pinia, router] } });
  await vi.waitFor(() => expect(wrapper.find(".creation-guide-panel").exists()).toBe(true));
  return { wrapper, router };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

describe("CharacterEditorPage guided creation integration", () => {
  it("opens and toggles the guide with zero Character, Session, or KPPreset writes", async () => {
    const character = makeCharacter();
    const session = makeSession();
    await characterRepository.create(character);
    await creationSessionRepository.create(session);
    const characterUpdate = vi.spyOn(characterRepository, "update");
    const sessionUpdate = vi.spyOn(creationSessionRepository, "update");
    const presetUpdate = vi.spyOn(kpPresetRepository, "update");
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: CharacterEditorPage },
        { path: "/characters/:id/sheet", component: { template: "<div />" } },
      ],
    });
    await router.push(`/characters/${character.id}`);
    await router.isReady();
    const wrapper = mount(CharacterEditorPage, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.text()).toContain("完善调查员基本信息"));

    expect(characterUpdate).not.toHaveBeenCalled();
    expect(sessionUpdate).not.toHaveBeenCalled();
    expect(presetUpdate).not.toHaveBeenCalled();
    expect(wrapper.findAll('.stepper [aria-current="step"]')).toHaveLength(1);
    expect(wrapper.get('.stepper [aria-current="step"]').text()).toBe("基本信息");

    await wrapper.get(".creation-guide-toggle").trigger("click");
    expect(wrapper.find(".creation-guide-panel").exists()).toBe(false);
    expect(wrapper.get(".creation-guide-toggle").text()).toBe("显示新手引导");
    await wrapper.get(".creation-guide-toggle").trigger("click");
    expect(wrapper.get(".creation-guide-panel h2").text()).toBe("完善调查员基本信息");

    expect(characterUpdate).not.toHaveBeenCalled();
    expect(sessionUpdate).not.toHaveBeenCalled();
    expect(presetUpdate).not.toHaveBeenCalled();
    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
    expect((await creationSessionRepository.getByCharacterId(character.id))?.data).toEqual(session);
  });

  it("follows the real currentStep forward/back and renders every existing step component", async () => {
    const { wrapper } = await mountPage(makeCharacter(), makeSession());

    await wrapper.get(".creation-guide-toggle").trigger("click");
    await wrapper.get(".creation-guide-toggle").trigger("click");
    await wrapper.get("button.primary").trigger("click");
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.get(".creation-guide-panel h2").text()).toBe("生成并确认属性"));
    expect(wrapper.get('.stepper [aria-current="step"]').text()).toBe("属性");
    expect(wrapper.findAll('.stepper [aria-current="step"]')).toHaveLength(1);
    expect(wrapper.find(".method-grid").exists()).toBe(true);

    await wrapper.get(".creation-step-focus button.button").trigger("click");
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.get(".creation-guide-panel h2").text()).toBe("完善调查员基本信息"));

    const creationStore = useCreationStore();
    const cases: readonly [CreationStepId, string, string][] = [
      ["occupation", "选择调查员职业", ".occupation-browser"],
      ["skills", "完成技能选择与分配", ".skill-requirement-step"],
      ["background", "建立背景与关键连接", ".background-step"],
      ["possessions", "复核财富、物品与武器", ".possessions-step"],
      ["review", "检查并完成建卡", ".review-panel"],
    ];
    for (const [step, title, selector] of cases) {
      await creationStore.setCurrentStep(step);
      await flushPromises();
      expect(wrapper.get(".creation-guide-panel h2").text()).toBe(title);
      expect(wrapper.get('.stepper [aria-current="step"]').attributes("aria-current")).toBe("step");
      expect(wrapper.findAll('.stepper [aria-current="step"]')).toHaveLength(1);
      expect(wrapper.find(selector).exists()).toBe(true);
    }
  });

  it("shows non-Standard-safe guidance without Standard-specific wealth instructions", async () => {
    const { wrapper } = await mountPage(
      makeCharacter("gaslight"),
      makeSession("gaslight", "possessions"),
    );

    const guide = wrapper.get(".creation-guide-panel");
    expect(guide.text()).toContain("当前建卡环境的财富与装备内容尚未实现");
    expect(guide.text()).toContain("不会回退到 Standard 规则");
    expect(guide.text()).not.toContain("正资产需要至少一条资产构成说明");
    expect(wrapper.find(".possessions-step").exists()).toBe(true);
  });
});
