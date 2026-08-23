// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import type { Character } from "../coc7/types/character";
import type { CreationSession } from "../creation/types/creationSession";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationWorkflowRepository } from "../db/repositories/creationWorkflowRepository";
import { downloadJsonFile } from "../portability/browser/downloadJsonFile";
import {
  createPortableCharacterPackage,
  serializePortableCharacterPackage,
} from "../portability/portableCharacterPackage";
import HomePage from "./HomePage.vue";

vi.mock("../portability/browser/downloadJsonFile", () => ({
  downloadJsonFile: vi.fn(),
}));

beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.mocked(downloadJsonFile).mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

function makeCharacter(id: string, name: string): Character {
  return { version: 1, id, name, settingId: "standard" };
}

function makeSession(character: Character, currentStep: CreationSession["currentStep"]): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep,
  };
}

async function mountHome(): Promise<{ wrapper: VueWrapper; router: Router }> {
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
  return { wrapper, router };
}

async function selectFile(
  wrapper: VueWrapper,
  file: { readonly text: () => Promise<string> },
): Promise<HTMLInputElement> {
  const input = wrapper.get('input[type="file"]');
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: [file],
  });
  await input.trigger("change");
  await flushPromises();
  await vi.waitFor(() => {
    expect(wrapper.find('[role="status"], [role="alert"]').exists()).toBe(true);
  });
  return input.element as HTMLInputElement;
}

describe("HomePage portable Character integration", () => {
  it("导入 complete Session 后立即刷新人物列表与建卡完成 badge", async () => {
    const importedCharacter = makeCharacter(
      "b0000000-0000-4000-8000-00000000000b",
      "导入完成调查员",
    );
    const text = serializePortableCharacterPackage(createPortableCharacterPackage(
      importedCharacter,
      makeSession(importedCharacter, "review"),
      1,
    ));
    const { wrapper } = await mountHome();

    await selectFile(wrapper, { text: vi.fn().mockResolvedValue(text) });

    await vi.waitFor(() => expect(wrapper.text()).toContain("导入完成调查员"));
    const card = wrapper.get(".record-card");
    expect(card.text()).toContain("建卡已完成");
    expect(wrapper.get('[role="status"]').text()).toContain("及建卡会话");
  });

  it("导入 no-session Character 后立即显示无建卡会话且不创建假的 Session", async () => {
    const importedCharacter = makeCharacter(
      "b1000000-0000-4000-8000-00000000000b",
      "无会话调查员",
    );
    const text = serializePortableCharacterPackage(
      createPortableCharacterPackage(importedCharacter, undefined, 1),
    );
    const { wrapper } = await mountHome();

    await selectFile(wrapper, { text: vi.fn().mockResolvedValue(text) });

    await vi.waitFor(() => expect(wrapper.text()).toContain("无会话调查员"));
    expect(wrapper.get(".record-card").text()).toContain("无建卡会话");
    expect(wrapper.find(`a[href="/characters/${importedCharacter.id}"]`).exists()).toBe(false);
    expect(await db.creationSessions.get(importedCharacter.id)).toBeUndefined();
  });

  it("非法文件显示可读错误并 reset input，使同一文件可再次选择", async () => {
    const { wrapper } = await mountHome();
    const file = { text: vi.fn().mockResolvedValue("{broken") };

    const input = await selectFile(wrapper, file);
    expect(wrapper.get('[role="alert"]').text()).toBe("文件不是合法 JSON。");
    expect(input.value).toBe("");

    await selectFile(wrapper, file);
    expect(file.text).toHaveBeenCalledTimes(2);
    expect(await db.characters.count()).toBe(0);
  });

  it("complete、incomplete 与 no-session 三类人物都提供导出 control", async () => {
    const complete = makeCharacter("b2000000-0000-4000-8000-00000000000b", "Complete");
    const incomplete = makeCharacter("b3000000-0000-4000-8000-00000000000b", "Incomplete");
    const noSession = makeCharacter("b4000000-0000-4000-8000-00000000000b", "No Session");
    await creationWorkflowRepository.createCharacterWithSession(complete, makeSession(complete, "review"));
    await creationWorkflowRepository.createCharacterWithSession(
      incomplete,
      makeSession(incomplete, "occupation"),
    );
    await characterRepository.create(noSession);
    const { wrapper } = await mountHome();

    const cards = wrapper.findAll(".record-card");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.findAll("button").some((button) => button.text() === "导出")).toBe(true);
    }

    const completeCard = cards.find((card) => card.get("strong").text() === "Complete");
    const exportButton = completeCard?.findAll("button").find((button) => button.text() === "导出");
    if (!exportButton) throw new Error("找不到 complete Character 导出按钮");
    await exportButton.trigger("click");
    await flushPromises();

    await vi.waitFor(() => expect(downloadJsonFile).toHaveBeenCalledTimes(1));
    const download = vi.mocked(downloadJsonFile).mock.calls[0]?.[0];
    expect(download?.filename).toBe("COCSheet-Complete-b2000000.cocsheet.json");
    expect(JSON.parse(download?.text ?? "{}").creationSession.currentStep).toBe("review");
  });

  it("collision 在首页显示保守策略错误且不改变第一次导入的数据", async () => {
    const character = makeCharacter("b5000000-0000-4000-8000-00000000000b", "重复导入");
    const text = serializePortableCharacterPackage(
      createPortableCharacterPackage(character, undefined, 1),
    );
    const { wrapper } = await mountHome();
    const file = { text: vi.fn().mockResolvedValue(text) };
    await selectFile(wrapper, file);

    await selectFile(wrapper, file);

    expect(wrapper.get('[role="alert"]').text()).toContain("不会自动覆盖或合并");
    expect(await db.characters.count()).toBe(1);
    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
  });
});
