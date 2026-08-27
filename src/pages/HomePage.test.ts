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

function makeCharacter(
  id: string,
  name: string,
  data: Partial<Omit<Character, "version" | "id" | "name" | "settingId">> = {},
): Character {
  return { version: 1, id, name, settingId: "standard", ...data };
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
    expect(wrapper.find('.success-message[role="status"], .error-message[role="alert"]').exists()).toBe(true);
  });
  return input.element as HTMLInputElement;
}

describe("HomePage portable Character integration", () => {
  it("keeps a historical non-Standard Character identifiable, exportable, and deletable without a continue action", async () => {
    const historical: Character = {
      version: 1,
      id: "b6000000-0000-4000-8000-00000000000b",
      name: "Gaslight Legacy",
      settingId: "gaslight",
    };
    await creationWorkflowRepository.createCharacterWithSession(
      historical,
      makeSession(historical, "occupation"),
    );
    const { wrapper } = await mountHome();
    const card = wrapper.get(".record-card");

    expect(card.text()).toContain("Cthulhu by Gaslight");
    expect(card.text()).toContain("历史建卡环境（当前不支持继续建卡）");
    expect(card.find(`a[href="/characters/${historical.id}"]`).exists()).toBe(false);
    expect(card.find(`a[href="/characters/${historical.id}/sheet"]`).exists()).toBe(true);

    const exportButton = card.findAll("button").find((button) => button.text() === "导出");
    await exportButton?.trigger("click");
    await vi.waitFor(() => expect(downloadJsonFile).toHaveBeenCalledOnce());
    expect(JSON.parse(vi.mocked(downloadJsonFile).mock.calls[0]?.[0].text ?? "{}")
      .character.settingId).toBe("gaslight");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await card.get("button.danger").trigger("click");
    await vi.waitFor(() => expect(wrapper.find(".record-card").exists()).toBe(false));
    expect(await characterRepository.getById(historical.id)).toBeUndefined();
  });

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
    expect(wrapper.get('[role="status"]').text()).toContain("恢复建卡进度");
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
    expect(wrapper.get(".record-card").text()).toContain("仅有人物卡资料");
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

  it("完整备份文件误选单人物 importer 时明确拒绝且零写入", async () => {
    const { wrapper } = await mountHome();
    await selectFile(wrapper, { text: vi.fn().mockResolvedValue(JSON.stringify({
      format: "cocsheet-library",
      formatVersion: 1,
      exportedAt: 1,
      characterEntries: [],
      kpPresets: [],
    })) });

    expect(wrapper.get('[role="alert"]').text()).toBe("这不是 COCSheet 人物文件。");
    expect(await db.characters.count()).toBe(0);
    expect(await db.creationSessions.count()).toBe(0);
    expect(await db.kpPresets.count()).toBe(0);
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

    expect(wrapper.get('[role="alert"]').text()).toContain("为保护现有资料，本次没有导入");
    expect(await db.characters.count()).toBe(1);
    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
  });

  it("长期显示备份语义，并只在明确点击后请求持久存储保护", async () => {
    const originalStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, "storage");
    const persisted = vi.fn().mockResolvedValue(false);
    const persist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persisted, persist },
    });
    try {
      const { wrapper } = await mountHome();
      await vi.waitFor(() => expect(wrapper.text()).toContain("浏览器尚未提供持久存储保护"));
      expect(wrapper.text()).toContain("人物资料、建卡进度和建卡预设不会自动上传或跨设备同步");
      expect(wrapper.text()).toContain("持久存储保护不等于完整备份");
      expect(persist).not.toHaveBeenCalled();
      await wrapper.get(".storage-persistence-status button").trigger("click");
      await vi.waitFor(() => expect(wrapper.text()).toContain("浏览器已启用持久存储保护"));
      expect(persist).toHaveBeenCalledOnce();
    } finally {
      if (originalStorageDescriptor) {
        Object.defineProperty(navigator, "storage", originalStorageDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "storage");
      }
    }
  });
});

describe("HomePage investigator library browsing", () => {
  const firstId = "c1000000-0000-4000-8000-000000000001";
  const secondId = "c2000000-0000-4000-8000-000000000002";
  const thirdId = "c3000000-0000-4000-8000-000000000003";

  it("renders search, status, and sort controls with recent modification as the default", async () => {
    await characterRepository.create(makeCharacter(firstId, "较早"));
    await characterRepository.create(makeCharacter(secondId, "较晚"));
    await db.characters.update(firstId, { updatedAt: 1 });
    await db.characters.update(secondId, { updatedAt: 2 });

    const { wrapper } = await mountHome();

    expect(wrapper.find('input[placeholder="搜索姓名、职业、住所或出身地"]').exists()).toBe(true);
    expect(wrapper.findAll("label").map((label) => label.text())).toEqual([
      "搜索调查员",
      "建卡状态全部建卡已完成建卡尚未完成仅有人物卡资料",
      "排序最近修改最早修改按姓名",
    ]);
    expect((wrapper.findAll("select")[1]?.element as HTMLSelectElement).value).toBe("updated-desc");
    expect(wrapper.findAll(".record-card strong").map((name) => name.text())).toEqual(["较晚", "较早"]);
    expect(wrapper.text()).toContain("共 2 名调查员");
  });

  it("searches the approved fields and changes the rendered cards immediately", async () => {
    await characterRepository.create(makeCharacter(firstId, "林若雪", {
      residence: "阿卡姆",
      occupation: {
        kind: "catalog",
        id: "journalist",
        displayNameSnapshot: { zh: "记者", en: "Journalist" },
      },
    }));
    await characterRepository.create(makeCharacter(secondId, "周明", { birthplace: "波士顿" }));
    const { wrapper } = await mountHome();

    await wrapper.get('input[type="search"]').setValue("JOURNALIST");

    expect(wrapper.findAll(".record-card strong").map((name) => name.text())).toEqual(["林若雪"]);
    expect(wrapper.text()).toContain("显示 1 / 2 名调查员");
  });

  it("filters by authoritative creation status", async () => {
    const complete = makeCharacter(firstId, "完成调查员");
    const incomplete = makeCharacter(secondId, "未完成调查员");
    const missingSession = makeCharacter(thirdId, "仅人物卡");
    await creationWorkflowRepository.createCharacterWithSession(complete, makeSession(complete, "review"));
    await creationWorkflowRepository.createCharacterWithSession(
      incomplete,
      makeSession(incomplete, "occupation"),
    );
    await characterRepository.create(missingSession);
    const { wrapper } = await mountHome();

    await wrapper.findAll("select")[0]?.setValue("missing-session");

    expect(wrapper.findAll(".record-card strong").map((name) => name.text())).toEqual(["仅人物卡"]);
    expect(wrapper.get(".record-card").text()).toContain("仅有人物卡资料");
    expect(wrapper.text()).toContain("显示 1 / 3 名调查员");
  });

  it("sorts cards by name without clearing other controls", async () => {
    await characterRepository.create(makeCharacter(firstId, "周明调查员"));
    await characterRepository.create(makeCharacter(secondId, "林若雪调查员"));
    await characterRepository.create(makeCharacter(thirdId, "陈安调查员"));
    const { wrapper } = await mountHome();
    const search = wrapper.get('input[type="search"]');
    const status = wrapper.findAll("select")[0];
    const sort = wrapper.findAll("select")[1];
    if (!status || !sort) throw new Error("找不到资料库选择控件");

    await search.setValue("调查员");
    await status.setValue("missing-session");
    await sort.setValue("name");

    const expected = ["周明调查员", "林若雪调查员", "陈安调查员"]
      .sort(new Intl.Collator("zh-CN", { usage: "sort", sensitivity: "base", numeric: true }).compare);
    expect(wrapper.findAll(".record-card strong").map((name) => name.text())).toEqual(expected);
    expect((search.element as HTMLInputElement).value).toBe("调查员");
    expect((status.element as HTMLSelectElement).value).toBe("missing-session");
  });

  it("keeps the true-empty state distinct from filtered-empty state", async () => {
    const { wrapper } = await mountHome();
    expect(wrapper.get(".empty-state").text()).toBe("暂无调查员");
    expect(wrapper.find(".character-library-controls").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("没有符合当前条件的调查员");
  });

  it("shows filtered-empty state and clears query plus status while preserving sort", async () => {
    const complete = makeCharacter(firstId, "林若雪");
    await creationWorkflowRepository.createCharacterWithSession(complete, makeSession(complete, "review"));
    const { wrapper } = await mountHome();
    const search = wrapper.get('input[type="search"]');
    const status = wrapper.findAll("select")[0];
    const sort = wrapper.findAll("select")[1];
    if (!status || !sort) throw new Error("找不到资料库选择控件");
    await search.setValue("不存在");
    await status.setValue("incomplete");
    await sort.setValue("name");

    expect(wrapper.text()).toContain("没有符合当前条件的调查员。");
    expect(wrapper.text()).toContain("显示 0 / 1 名调查员");
    await wrapper.get(".filtered-empty-state button").trigger("click");

    expect((search.element as HTMLInputElement).value).toBe("");
    expect((status.element as HTMLSelectElement).value).toBe("all");
    expect((sort.element as HTMLSelectElement).value).toBe("name");
    expect(wrapper.get(".record-card strong").text()).toBe("林若雪");
    expect(wrapper.text()).toContain("共 1 名调查员");
  });

  it("updates the derived filtered result after deletion without resetting controls", async () => {
    const complete = makeCharacter(firstId, "待删除");
    const incomplete = makeCharacter(secondId, "仍被筛掉");
    await creationWorkflowRepository.createCharacterWithSession(complete, makeSession(complete, "review"));
    await creationWorkflowRepository.createCharacterWithSession(
      incomplete,
      makeSession(incomplete, "skills"),
    );
    const { wrapper } = await mountHome();
    const status = wrapper.findAll("select")[0];
    if (!status) throw new Error("找不到状态筛选控件");
    await status.setValue("complete");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await wrapper.get(".record-card button.danger").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("没有符合当前条件的调查员。"));

    expect((status.element as HTMLSelectElement).value).toBe("complete");
    expect(wrapper.text()).toContain("显示 0 / 1 名调查员");
    expect(await characterRepository.getById(firstId)).toBeUndefined();
  });

  it("preserves active controls across single-Character import and derives the imported result", async () => {
    await characterRepository.create(makeCharacter(firstId, "现有人物"));
    const imported = makeCharacter(secondId, "导入目标");
    const text = serializePortableCharacterPackage(
      createPortableCharacterPackage(imported, undefined, 1),
    );
    const { wrapper } = await mountHome();
    const search = wrapper.get('input[type="search"]');
    const status = wrapper.findAll("select")[0];
    const sort = wrapper.findAll("select")[1];
    if (!status || !sort) throw new Error("找不到资料库选择控件");
    await search.setValue("导入");
    await status.setValue("missing-session");
    await sort.setValue("name");

    await selectFile(wrapper, { text: vi.fn().mockResolvedValue(text) });

    await vi.waitFor(() => expect(wrapper.findAll(".record-card strong").map((name) => name.text()))
      .toEqual(["导入目标"]));
    expect((search.element as HTMLInputElement).value).toBe("导入");
    expect((status.element as HTMLSelectElement).value).toBe("missing-session");
    expect((sort.element as HTMLSelectElement).value).toBe("name");
  });
});
