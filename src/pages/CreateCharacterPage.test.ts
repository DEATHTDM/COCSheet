// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CREATION_EXPERIENCE_MODE_STORAGE_KEY } from "../app/preferences/creationExperiencePreference";
import { useUiPreferenceStore } from "../app/stores/uiPreferenceStore";
import { useCreationStore } from "../creation/stores/creationStore";
import {
  defaultAttributeGenerationConfig,
  type CreationPreset,
} from "../creation/types/creationPreset";
import type { KPPresetRecord } from "../db/records";
import { usePresetStore } from "../kp/presets/presetStore";
import CreateCharacterPage from "./CreateCharacterPage.vue";

const characterId = "a0000000-0000-4000-8000-000000000020";

async function mountPage(presetRecord?: KPPresetRecord) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const creationStore = useCreationStore();
  const presetStore = usePresetStore();
  const start = vi.spyOn(creationStore, "start").mockResolvedValue(characterId);
  vi.spyOn(presetStore, "loadList").mockResolvedValue();
  if (presetRecord) presetStore.records = [presetRecord];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/create", component: CreateCharacterPage },
      { path: "/characters/:id", component: { template: "<div />" } },
    ],
  });
  await router.push("/create");
  await router.isReady();
  const wrapper = mount(CreateCharacterPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, start, uiPreferenceStore: useUiPreferenceStore() };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("CreateCharacterPage creation experience preference", () => {
  it("defaults to an accessibly labelled Guided selector and persists both choices", async () => {
    const { wrapper, uiPreferenceStore } = await mountPage();
    const group = wrapper.get("fieldset");
    const guided = wrapper.get('input[value="guided"]');
    const quick = wrapper.get('input[value="quick"]');

    expect(group.get("legend").text()).toBe("建卡体验");
    expect((guided.element as HTMLInputElement).checked).toBe(true);
    expect((quick.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.text()).toContain("建卡时显示每一步的简短说明");
    expect(wrapper.text()).toContain("隐藏步骤说明，直接使用完整建卡表单");

    await quick.trigger("change");
    expect(uiPreferenceStore.creationExperienceMode).toBe("quick");
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("quick");

    await guided.trigger("change");
    expect(uiPreferenceStore.creationExperienceMode).toBe("guided");
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("guided");
  });

  it("starts a Setting with the original arguments and never passes mode into the workflow", async () => {
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");
    const { wrapper, start } = await mountPage();
    const standardButton = wrapper.findAll(".setting-grid .setting-card")
      .find((button) => button.text().includes("Standard COC7"));

    expect(standardButton).toBeDefined();
    await standardButton?.trigger("click");

    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith("standard", undefined);
  });

  it("preserves the exact KP Preset start semantics independently of mode", async () => {
    const preset: CreationPreset = {
      version: 1,
      id: "b0000000-0000-4000-8000-000000000020",
      name: "限制预设",
      settingId: "standard",
      attributeGeneration: defaultAttributeGenerationConfig,
      allowCustomOccupation: false,
    };
    const presetRecord: KPPresetRecord = {
      id: preset.id,
      version: 1,
      name: preset.name,
      updatedAt: 1,
      data: preset,
    };
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");
    const { wrapper, start, uiPreferenceStore } = await mountPage(presetRecord);

    await wrapper.get(".preset-choice").trigger("click");

    expect(start).toHaveBeenCalledWith("standard", preset);
    expect(uiPreferenceStore.creationExperienceMode).toBe("quick");
  });
});
