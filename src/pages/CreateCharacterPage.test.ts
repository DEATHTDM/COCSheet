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

const { decodeSharedPresetMock } = vi.hoisted(() => ({
  decodeSharedPresetMock: vi.fn(),
}));

vi.mock("../kp/presets/presetShare", () => ({
  decodeKPPresetShareToken: decodeSharedPresetMock,
}));

const characterId = "a0000000-0000-4000-8000-000000000020";
const savedCopyId = "b0000000-0000-4000-8000-000000000022";

async function mountPage(presetRecord?: KPPresetRecord, initialPath = "/create") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const creationStore = useCreationStore();
  const presetStore = usePresetStore();
  const start = vi.spyOn(creationStore, "start").mockResolvedValue(characterId);
  vi.spyOn(presetStore, "loadList").mockResolvedValue();
  const createFromSharedPreset = vi.spyOn(presetStore, "createFromSharedPreset")
    .mockImplementation(async (preset) => ({
      id: savedCopyId,
      version: 1,
      name: preset.name,
      updatedAt: 2,
      data: { ...preset, id: savedCopyId },
    }));
  if (presetRecord) presetStore.records = [presetRecord];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/create", name: "create", component: CreateCharacterPage },
      { path: "/characters/:id", component: { template: "<div />" } },
      { path: "/kp/presets/:id", name: "preset", component: { template: "<div />" } },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  const wrapper = mount(CreateCharacterPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return {
    wrapper,
    router,
    start,
    createFromSharedPreset,
    presetStore,
    uiPreferenceStore: useUiPreferenceStore(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  decodeSharedPresetMock.mockReset();
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

  it("shows one Standard entry and never passes mode into the workflow", async () => {
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");
    const { wrapper, start } = await mountPage();
    const standardButton = wrapper.findAll(".setting-grid .setting-card")
      .find((button) => button.text().includes("开始创建调查员"));

    expect(standardButton).toBeDefined();
    expect(wrapper.findAll(".setting-grid .setting-card")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Cthulhu by Gaslight");
    expect(wrapper.text()).not.toContain("Down Darker Trails");
    expect(wrapper.text()).not.toContain("Cthulhu Dark Ages");
    expect(wrapper.text()).not.toContain("Regency Cthulhu");
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

describe("CreateCharacterPage shared KP Preset", () => {
  const sharedPreset: CreationPreset = {
    version: 1,
    id: "b0000000-0000-4000-8000-000000000021",
    name: "链接中的共享预设",
    settingId: "gaslight",
    attributeGeneration: { allowedMethods: ["manual", "point-buy"] },
    skillLimits: { maxSkillFinalValue: 80 },
    allowCustomOccupation: true,
    age: { min: 20, max: 60 },
  };

  it("safely identifies a valid historical shared preset but does not allow creation", async () => {
    decodeSharedPresetMock.mockResolvedValue(sharedPreset);
    const localPreset: CreationPreset = {
      ...sharedPreset,
      name: "本地同 ID 但内容不同",
      settingId: "standard",
      attributeGeneration: defaultAttributeGenerationConfig,
    };
    const localRecord: KPPresetRecord = {
      id: localPreset.id,
      version: 1,
      name: localPreset.name,
      updatedAt: 1,
      data: localPreset,
    };
    const { wrapper, start, presetStore } = await mountPage(localRecord, "/create?kp=valid-token");

    expect(wrapper.get("#shared-preset-title").text()).toBe("共享建卡预设");
    expect(wrapper.text()).toContain("链接中的共享预设");
    expect(wrapper.text()).toContain("Cthulhu by Gaslight");
    expect(wrapper.text()).toContain("手动输入、购点");
    expect(wrapper.text()).toContain("不会自动保存到你的建卡预设库");
    expect(wrapper.text()).toContain("暂不支持新建调查员");
    expect(wrapper.text()).not.toContain("KP 预设库");
    expect(wrapper.find(".shared-preset-preview .button.primary").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("保存到建卡预设库");
    expect(start).not.toHaveBeenCalled();
    expect(presetStore.records).toEqual([localRecord]);
  });

  it("creates a supported shared preset only after the explicit action and keeps mode unchanged", async () => {
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");
    const standardSharedPreset = { ...sharedPreset, settingId: "standard" as const };
    decodeSharedPresetMock.mockResolvedValue(standardSharedPreset);
    const { wrapper, start, uiPreferenceStore } = await mountPage(undefined, "/create?kp=valid-token");

    expect(wrapper.text()).toContain("保存到建卡预设库");
    await wrapper.get(".shared-preset-preview .button.primary").trigger("click");

    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith("standard", standardSharedPreset);
    expect(uiPreferenceStore.creationExperienceMode).toBe("quick");
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("quick");
  });

  it("saves exactly one fresh local copy without starting creation and exposes the ordinary editor link", async () => {
    const standardSharedPreset = { ...sharedPreset, settingId: "standard" as const };
    decodeSharedPresetMock.mockResolvedValue(standardSharedPreset);
    const { wrapper, start, createFromSharedPreset } = await mountPage(
      undefined,
      "/create?kp=valid-token",
    );

    await wrapper.findAll(".shared-preset-preview .button")
      .find((button) => button.text().includes("保存到建卡预设库"))
      ?.trigger("click");
    await flushPromises();

    expect(createFromSharedPreset).toHaveBeenCalledOnce();
    expect(createFromSharedPreset).toHaveBeenCalledWith(standardSharedPreset);
    expect(start).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("已保存到你的建卡预设库。");
    expect(wrapper.text()).not.toContain("保存到建卡预设库");
    const editorLink = wrapper.get("a.button");
    expect(editorLink.text()).toBe("查看已保存预设");
    expect(editorLink.attributes("href")).toBe(`/kp/presets/${savedCopyId}`);
  });

  it("keeps preview and direct shared creation available after a local-save failure", async () => {
    const standardSharedPreset = { ...sharedPreset, settingId: "standard" as const };
    decodeSharedPresetMock.mockResolvedValue(standardSharedPreset);
    const { wrapper, start, createFromSharedPreset } = await mountPage(
      undefined,
      "/create?kp=valid-token",
    );
    createFromSharedPreset.mockRejectedValue(new Error("IndexedDB 写入失败"));

    await wrapper.findAll(".shared-preset-preview .button")
      .find((button) => button.text().includes("保存到建卡预设库"))
      ?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("链接中的共享预设");
    expect(wrapper.get('[role="alert"]').text()).toContain("IndexedDB 写入失败");
    await wrapper.get(".shared-preset-preview .button.primary").trigger("click");
    expect(start).toHaveBeenCalledWith("standard", standardSharedPreset);
  });

  it("shows an invalid-link error while ordinary Setting creation remains available", async () => {
    decodeSharedPresetMock.mockRejectedValue(new Error("压缩内容已损坏。"));
    const { wrapper, start } = await mountPage(undefined, "/create?kp=broken");

    expect(wrapper.get('[role="alert"]').text()).toContain("无法读取共享建卡预设：压缩内容已损坏。");
    expect(wrapper.text()).not.toContain("保存到建卡预设库");
    const standardButton = wrapper.findAll(".setting-grid .setting-card")
      .find((button) => button.text().includes("开始创建调查员"));
    expect(wrapper.findAll(".setting-grid .setting-card")).toHaveLength(1);
    await standardButton?.trigger("click");
    expect(start).toHaveBeenCalledWith("standard", undefined);
  });

  it("rejects multiple kp query values without decoding either one", async () => {
    const { wrapper } = await mountPage(undefined, "/create?kp=one&kp=two");

    expect(wrapper.get('[role="alert"]').text()).toContain("多份预设信息");
    expect(wrapper.get('[role="alert"]').text()).not.toContain("kp 参数");
    expect(decodeSharedPresetMock).not.toHaveBeenCalled();
  });

  it("removes only kp with router.replace and preserves other query values", async () => {
    decodeSharedPresetMock.mockResolvedValue(sharedPreset);
    const { wrapper, router } = await mountPage(undefined, "/create?kp=valid-token&ref=keeper");

    await wrapper.findAll(".shared-preset-preview .button")
      .find((button) => button.text().includes("忽略共享预设"))
      ?.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("create");
    expect(router.currentRoute.value.query).toEqual({ ref: "keeper" });
    expect(wrapper.find(".shared-preset-preview").exists()).toBe(false);
  });

  it("keeps only the latest result when route token A resolves after token B", async () => {
    let resolveA: ((preset: CreationPreset) => void) | undefined;
    let resolveB: ((preset: CreationPreset) => void) | undefined;
    const presetB = { ...sharedPreset, name: "共享预设 B" };
    decodeSharedPresetMock.mockImplementation((token: string) => new Promise<CreationPreset>((resolve) => {
      if (token === "token-a") resolveA = resolve;
      if (token === "token-b") resolveB = resolve;
    }));
    const { wrapper, router } = await mountPage(undefined, "/create?kp=token-a");

    await router.push("/create?kp=token-b");
    await flushPromises();
    resolveB?.(presetB);
    await flushPromises();
    expect(wrapper.text()).toContain("共享预设 B");

    resolveA?.({ ...sharedPreset, name: "过期预设 A" });
    await flushPromises();
    expect(wrapper.text()).toContain("共享预设 B");
    expect(wrapper.text()).not.toContain("过期预设 A");
  });

  it("does not let an in-flight save for route A publish saved UI into route B", async () => {
    const presetA = { ...sharedPreset, name: "共享预设 A", settingId: "standard" as const };
    const presetB = { ...sharedPreset, name: "共享预设 B", settingId: "standard" as const };
    decodeSharedPresetMock.mockImplementation(async (token: string) => token === "token-a" ? presetA : presetB);
    const { wrapper, router, createFromSharedPreset } = await mountPage(undefined, "/create?kp=token-a");
    let resolveSave: ((record: KPPresetRecord) => void) | undefined;
    createFromSharedPreset.mockImplementation(() => new Promise<KPPresetRecord>((resolve) => {
      resolveSave = resolve;
    }));

    await wrapper.findAll(".shared-preset-preview .button")
      .find((button) => button.text().includes("保存到建卡预设库"))
      ?.trigger("click");
    await router.push("/create?kp=token-b");
    await flushPromises();
    expect(wrapper.text()).toContain("共享预设 B");

    resolveSave?.({
      id: savedCopyId,
      version: 1,
      name: presetA.name,
      updatedAt: 2,
      data: { ...presetA, id: savedCopyId },
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain("已保存到你的建卡预设库。");
    expect(wrapper.text()).not.toContain("查看已保存预设");
    expect(wrapper.text()).toContain("保存到建卡预设库");
  });

  it("clears a route A save error when route B becomes current", async () => {
    const presetA = { ...sharedPreset, name: "共享预设 A", settingId: "standard" as const };
    const presetB = { ...sharedPreset, name: "共享预设 B", settingId: "standard" as const };
    decodeSharedPresetMock.mockImplementation(async (token: string) => token === "token-a" ? presetA : presetB);
    const { wrapper, router, createFromSharedPreset } = await mountPage(undefined, "/create?kp=token-a");
    createFromSharedPreset.mockRejectedValue(new Error("A 保存失败"));

    await wrapper.findAll(".shared-preset-preview .button")
      .find((button) => button.text().includes("保存到建卡预设库"))
      ?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("A 保存失败");

    await router.push("/create?kp=token-b");
    await flushPromises();

    expect(wrapper.text()).toContain("共享预设 B");
    expect(wrapper.text()).not.toContain("A 保存失败");
    expect(wrapper.text()).toContain("保存到建卡预设库");
  });
});
