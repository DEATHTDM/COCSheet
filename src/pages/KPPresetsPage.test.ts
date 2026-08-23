// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { createWebHashHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreationPreset } from "../creation/types/creationPreset";
import type { KPPresetRecord } from "../db/records";
import { encodeKPPresetShareToken } from "../kp/presets/presetShare";
import { usePresetStore } from "../kp/presets/presetStore";
import KPPresetsPage from "./KPPresetsPage.vue";

vi.mock("../kp/presets/presetShare", () => ({
  encodeKPPresetShareToken: vi.fn(),
}));

const token = "1.H4sIA_url-safe";
const preset: CreationPreset = {
  version: 1,
  id: "b2000000-0000-4000-8000-000000000001",
  name: "已保存的完整预设",
  settingId: "standard",
  attributeGeneration: { allowedMethods: ["manual", "point-buy"] },
  skillCaps: { occupation: 70 },
  skillLimits: { maxSkillFinalValue: 85 },
  occupationPolicy: { bannedOccupationIds: ["criminal-keeper-rulebook"] },
  allowCustomOccupation: false,
  age: { min: 20 },
};
const record: KPPresetRecord = {
  id: preset.id,
  version: 1,
  name: preset.name,
  updatedAt: 123,
  data: preset,
};

async function mountPage() {
  window.history.replaceState({}, "", "/COCSheet/#/kp/presets");
  const pinia = createPinia();
  setActivePinia(pinia);
  const presetStore = usePresetStore();
  presetStore.records = [record];
  vi.spyOn(presetStore, "loadList").mockResolvedValue();
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: "/create", name: "create", component: { template: "<div />" } },
      { path: "/kp/presets", name: "presets", component: KPPresetsPage },
      { path: "/kp/presets/:id", name: "preset", component: { template: "<div />" } },
    ],
  });
  await router.push("/kp/presets");
  await router.isReady();
  const wrapper = mount(KPPresetsPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, presetStore };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(encodeKPPresetShareToken).mockReset().mockResolvedValue(token);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("KPPresetsPage share UI", () => {
  it("generates one URL from persisted record.data without changing or creating records", async () => {
    const originalRecord = structuredClone(record);
    const { wrapper, presetStore } = await mountPage();

    await wrapper.get(`[aria-label="生成“${preset.name}”的分享链接"]`).trigger("click");
    await flushPromises();

    expect(encodeKPPresetShareToken).toHaveBeenCalledOnce();
    expect(encodeKPPresetShareToken).toHaveBeenCalledWith(record.data);
    expect(presetStore.records).toEqual([originalRecord]);
    expect(presetStore.records).toHaveLength(1);
    expect(wrapper.get("#preset-share-title").text()).toContain(preset.name);
    const textarea = wrapper.get("textarea[readonly]");
    expect((textarea.element as HTMLTextAreaElement).value)
      .toBe(`http://localhost:3000/COCSheet/#/create?kp=${token}`);
  });

  it("copies the generated URL and reports success", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get(`[aria-label="生成“${preset.name}”的分享链接"]`).trigger("click");
    await flushPromises();

    await wrapper.get(".preset-share-panel .button.primary").trigger("click");
    await flushPromises();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `http://localhost:3000/COCSheet/#/create?kp=${token}`,
    );
    expect(wrapper.text()).toContain("链接已复制。");
  });

  it("keeps the readonly URL when clipboard writing fails and supports closing the panel", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("denied"));
    const { wrapper } = await mountPage();
    await wrapper.get(`[aria-label="生成“${preset.name}”的分享链接"]`).trigger("click");
    await flushPromises();

    await wrapper.get(".preset-share-panel .button.primary").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("自动复制失败，请手动复制上方链接。");
    expect(wrapper.find("textarea[readonly]").exists()).toBe(true);
    await wrapper.findAll(".preset-share-panel .button")[1]?.trigger("click");
    expect(wrapper.find(".preset-share-panel").exists()).toBe(false);
  });

  it("shows a readable compression error without removing local presets", async () => {
    vi.mocked(encodeKPPresetShareToken).mockRejectedValue(
      new Error("当前浏览器不支持压缩预设分享链接。"),
    );
    const { wrapper, presetStore } = await mountPage();

    await wrapper.get(`[aria-label="生成“${preset.name}”的分享链接"]`).trigger("click");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("当前浏览器不支持压缩预设分享链接");
    expect(presetStore.records).toEqual([record]);
  });
});
