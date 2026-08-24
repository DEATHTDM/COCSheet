// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import type { Character } from "../coc7/types/character";
import type { CreationPreset } from "../creation/types/creationPreset";
import type { CreationSession } from "../creation/types/creationSession";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationWorkflowRepository } from "../db/repositories/creationWorkflowRepository";
import { kpPresetRepository } from "../db/repositories/kpPresetRepository";
import { downloadJsonFile } from "../portability/browser/downloadJsonFile";
import {
  createPortableCharacterPackage,
  serializePortableCharacterPackage,
} from "../portability/portableCharacterPackage";
import {
  createPortableLibraryPackage,
  serializePortableLibraryPackage,
} from "../portability/portableLibraryPackage";
import HomePage from "./HomePage.vue";

vi.mock("../portability/browser/downloadJsonFile", () => ({ downloadJsonFile: vi.fn() }));

beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.mocked(downloadJsonFile).mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

function makeCharacter(name: string, id = crypto.randomUUID()): Character {
  return { version: 1, id, name, settingId: "standard" };
}

function makeSession(character: Character): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep: "review",
  };
}

function makePreset(name: string, id = crypto.randomUUID()): CreationPreset {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    attributeGeneration: { allowedMethods: ["manual"] },
    allowCustomOccupation: "keeper-approval",
  };
}

async function mountHome(): Promise<VueWrapper> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: HomePage },
      { path: "/create", component: { template: "<div />" } },
      { path: "/characters/:id", component: { template: "<div />" } },
      { path: "/characters/:id/sheet", component: { template: "<div />" } },
      { path: "/kp/presets", component: { template: "<div />" } },
    ],
  });
  await router.push("/");
  await router.isReady();
  const wrapper = mount(HomePage, { global: { plugins: [pinia, router] } });
  await vi.waitFor(() => expect(wrapper.text()).not.toContain("正在读取本地数据"));
  return wrapper;
}

async function selectLibraryFile(
  wrapper: VueWrapper,
  file: { readonly text: () => Promise<string> },
): Promise<HTMLInputElement> {
  const inputs = wrapper.findAll<HTMLInputElement>('input[type="file"]');
  const input = inputs[1];
  if (!input) throw new Error("找不到完整备份 file input");
  Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
  await input.trigger("change");
  await flushPromises();
  return input.element;
}

describe("HomePage full library backup integration", () => {
  it("清楚区分单人物与完整备份 controls，并说明三类 domain data", async () => {
    const character = makeCharacter("Existing");
    await characterRepository.create(character);
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("导入调查员文件");
    expect(wrapper.text()).toContain("本地数据备份");
    expect(wrapper.text()).toContain("导出完整备份");
    expect(wrapper.text()).toContain("导入完整备份");
    expect(wrapper.text()).toContain("全部调查员、对应建卡进度与 KP 建卡预设");
    expect(wrapper.findAll('input[type="file"]')).toHaveLength(2);
  });

  it("导出完整备份复用下载边界并包含 Characters、Sessions 与 Presets", async () => {
    const character = makeCharacter("Exported");
    const preset = makePreset("Exported preset");
    await creationWorkflowRepository.createCharacterWithSession(character, makeSession(character));
    await kpPresetRepository.create(preset);
    const wrapper = await mountHome();
    const button = wrapper.findAll("button").find((candidate) => candidate.text() === "导出完整备份");
    if (!button) throw new Error("找不到导出完整备份按钮");

    await button.trigger("click");
    await flushPromises();

    await vi.waitFor(() => expect(downloadJsonFile).toHaveBeenCalledTimes(1));
    const download = vi.mocked(downloadJsonFile).mock.calls[0]?.[0];
    expect(download?.filename).toMatch(/^COCSheet-Library-\d{8}-\d{6}\.cocsheet-backup\.json$/);
    const parsed = JSON.parse(download?.text ?? "{}") as {
      characterEntries?: unknown[];
      kpPresets?: unknown[];
    };
    expect(parsed.characterEntries).toHaveLength(1);
    expect(parsed.kpPresets).toHaveLength(1);
  });

  it("确认后导入并显示三类 counts；input 成功后 reset", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const character = makeCharacter("Restored");
    const preset = makePreset("Restored preset");
    const file = { text: vi.fn().mockResolvedValue(serializePortableLibraryPackage(
      createPortableLibraryPackage(
        [{ character, creationSession: makeSession(character) }],
        [preset],
        1,
      ),
    )) };
    const wrapper = await mountHome();

    const input = await selectLibraryFile(wrapper, file);

    await vi.waitFor(() => expect(wrapper.text()).toContain("已导入 1 名调查员、1 份建卡进度和 1 个 KP 建卡预设"));
    expect(wrapper.text()).toContain("Restored");
    expect(await db.kpPresets.get(preset.id)).toBeDefined();
    expect(input.value).toBe("");
  });

  it("取消确认零读取零写入，并 reset input", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const file = { text: vi.fn().mockResolvedValue("unused") };
    const wrapper = await mountHome();
    const input = await selectLibraryFile(wrapper, file);
    expect(file.text).not.toHaveBeenCalled();
    expect(await Promise.all([db.characters.count(), db.creationSessions.count(), db.kpPresets.count()]))
      .toEqual([0, 0, 0]);
    expect(input.value).toBe("");
  });

  it("误选 single-character file 时清楚拒绝，且同一文件可再次选择", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const character = makeCharacter("Single");
    const file = { text: vi.fn().mockResolvedValue(serializePortableCharacterPackage(
      createPortableCharacterPackage(character, undefined, 1),
    )) };
    const wrapper = await mountHome();

    const input = await selectLibraryFile(wrapper, file);
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("不是 COCSheet 完整备份文件"));
    expect(input.value).toBe("");

    await selectLibraryFile(wrapper, file);
    expect(file.text).toHaveBeenCalledTimes(2);
    expect(await db.characters.count()).toBe(0);
  });

  it("任一 collision 时首页显示整份取消且无 partial writes", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const existing = makeCharacter("Existing");
    const otherwiseValid = makeCharacter("Otherwise valid");
    const preset = makePreset("Would not import");
    await characterRepository.create(existing);
    const wrapper = await mountHome();
    await selectLibraryFile(wrapper, { text: vi.fn().mockResolvedValue(serializePortableLibraryPackage(
      createPortableLibraryPackage([{ character: existing }, { character: otherwiseValid }], [preset], 1),
    )) });

    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("整份完整备份未导入"));
    expect(await db.characters.count()).toBe(1);
    expect(await db.kpPresets.count()).toBe(0);
  });
});
