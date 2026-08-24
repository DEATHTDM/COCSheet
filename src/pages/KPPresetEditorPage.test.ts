// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreationPreset } from "../creation/types/creationPreset";
import { db } from "../db/database";
import { kpPresetRepository } from "../db/repositories/kpPresetRepository";
import { usePresetStore } from "../kp/presets/presetStore";
import KPPresetEditorPage from "./KPPresetEditorPage.vue";

async function mountEditor(id: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/kp/presets", component: { template: "<div />" } },
      { path: "/kp/presets/:id", component: KPPresetEditorPage },
    ],
  });
  await router.push(`/kp/presets/${id}`);
  await router.isReady();
  const wrapper = mount(KPPresetEditorPage, { global: { plugins: [pinia, router] } });
  await vi.waitFor(() => expect(usePresetStore().current?.id).toBe(id));
  return wrapper;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

describe("KPPresetEditorPage Standard-only scope", () => {
  it("shows Standard as readonly identity without a Setting selector", async () => {
    setActivePinia(createPinia());
    const record = await usePresetStore().createDefault();
    const wrapper = await mountEditor(record.id);

    expect(wrapper.text()).toContain("CoC 7版标准规则");
    expect(wrapper.find("select").exists()).toBe(false);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it("renders a historical preset read-only with delete as the only mutation", async () => {
    const historical: CreationPreset = {
      version: 1,
      id: "b5000000-0000-4000-8000-000000000001",
      name: "Regency 历史预设",
      settingId: "regency",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: false,
    };
    await kpPresetRepository.create(historical);
    const wrapper = await mountEditor(historical.id);

    expect(wrapper.text()).toContain("Regency Cthulhu");
    expect(wrapper.text()).toContain("预设会保持原样");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    expect(wrapper.find("button.danger").text()).toBe("删除");
    expect((await kpPresetRepository.getById(historical.id))?.data).toEqual(historical);
  });
});
