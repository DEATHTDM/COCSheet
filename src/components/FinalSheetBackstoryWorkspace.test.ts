// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from "@vue/test-utils";

import { useCharacterStore } from "../app/stores/characterStore";
import { finalSheetBackstoryCategories } from "../character-sheet/presentation/finalSheetNarrativePresentation";
import type { BackstoryEntry, Character } from "../coc7/types/character";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import FinalSheetBackstoryWorkspace from "./FinalSheetBackstoryWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "82000000-0000-4000-8000-000000000008",
  name: "长期背景调查员",
  settingId: "standard",
};

const Harness = defineComponent({
  components: { FinalSheetBackstoryWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetBackstoryWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
});

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

async function mountCharacter(character: Character = baseCharacter): Promise<VueWrapper> {
  await characterRepository.create(character);
  await useCharacterStore().loadById(character.id);
  return mount(Harness);
}

function categorySection(wrapper: VueWrapper, category: string) {
  return wrapper.get(`[data-backstory-category="${category}"]`);
}

function entryRow(wrapper: VueWrapper, entryId: string) {
  return wrapper.get(`[data-backstory-entry-id="${entryId}"]`);
}

async function clickButton(
  scope: { findAll(selector: string): DOMWrapper<Element>[] },
  label: string,
): Promise<void> {
  const button = scope.findAll("button").find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  await vi.waitFor(() => expect(button.attributes("disabled")).toBeUndefined());
  await button.trigger("click");
  await flushPromises();
}

function makeEntry(category: BackstoryEntry["category"], text: string): BackstoryEntry {
  return { id: crypto.randomUUID(), category, text };
}

describe("Final Sheet backstory workspace rendered interactions", () => {
  it("空 backstory 打开零写入，十个 closed categories 均可在无 CreationSession 时新增并刷新保持", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect(wrapper.findAll("[data-backstory-category]")).toHaveLength(10);
    expect(wrapper.text()).toContain("当前没有关键连接");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(baseCharacter.id))?.data.backstory).toBeUndefined();

    for (const [index, category] of finalSheetBackstoryCategories.entries()) {
      const section = categorySection(wrapper, category.id);
      await section.get("textarea").setValue(`长期条目 ${index + 1}`);
      await clickButton(section, "添加条目");
      await vi.waitFor(async () => {
        expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.entries)
          .toHaveLength(index + 1);
      });
    }

    const persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.backstory?.entries.map((entry) => entry.category))
      .toEqual(finalSheetBackstoryCategories.map((category) => category.id));
    expect(new Set(persisted?.data.backstory?.entries.map((entry) => entry.id)).size).toBe(10);
    expect(persisted?.data.backstory?.keyConnectionEntryId).toBeUndefined();

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(baseCharacter.id))?.data.backstory?.entries).toHaveLength(10);
  });

  it("已有六条创建背景仍可新增第七条；edit 保持 UUID，cancel 与 blank validation 均安全", async () => {
    const entries = finalSheetBackstoryCategories.slice(0, 6).map((category, index) =>
      makeEntry(category.id, `创建背景 ${index + 1}`));
    const wrapper = await mountCharacter({
      ...baseCharacter,
      backstory: { entries, keyConnectionEntryId: entries[0]?.id },
    });

    const traits = categorySection(wrapper, "traits");
    await traits.get('textarea[aria-label="添加特质"]').setValue("第七条长期背景");
    await clickButton(traits, "添加条目");
    let persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.backstory?.entries).toHaveLength(7);
    const seventh = persisted?.data.backstory?.entries[6];
    if (!seventh) throw new Error("第七条背景未创建");

    const seventhRow = entryRow(wrapper, seventh.id);
    await clickButton(seventhRow, "编辑");
    await seventhRow.get("textarea").setValue("修改后的第七条");
    await clickButton(seventhRow, "保存");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.backstory?.entries[6]).toMatchObject({
      id: seventh.id,
      text: "修改后的第七条",
    });

    const updateSpy = vi.spyOn(characterRepository, "update");
    const firstRow = entryRow(wrapper, entries[0]!.id);
    await clickButton(firstRow, "编辑");
    await firstRow.get("textarea").setValue("取消的修改");
    await clickButton(firstRow, "取消");
    expect(updateSpy).not.toHaveBeenCalled();

    await traits.get('textarea[aria-label="添加特质"]').setValue("   ");
    await clickButton(traits, "添加条目");
    expect(wrapper.get('[role="alert"]').text()).toContain("背景条目不能为空");
    expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.entries).toHaveLength(7);
  });

  it("Key Connection 可设定/清除，game-time 类别无设置入口，删除语义按稳定 ID 保持引用安全", async () => {
    const first = makeEntry("traits", "第一条创建背景");
    const ordinary = makeEntry("significant-people", "普通创建背景");
    const encounter = makeEntry("encounters", "游戏期遭遇");
    const wrapper = await mountCharacter({
      ...baseCharacter,
      backstory: { entries: [first, ordinary, encounter], keyConnectionEntryId: first.id },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    expect(entryRow(wrapper, encounter.id).findAll("button").map((button) => button.text()))
      .not.toContain("设为关键连接");

    await clickButton(entryRow(wrapper, ordinary.id), "设为关键连接");
    expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.keyConnectionEntryId)
      .toBe(ordinary.id);
    await clickButton(wrapper, "清除关键连接");
    expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.keyConnectionEntryId)
      .toBeUndefined();

    await clickButton(entryRow(wrapper, first.id), "设为关键连接");
    await clickButton(entryRow(wrapper, ordinary.id), "删除");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.entries
        .some((entry) => entry.id === ordinary.id)).toBe(false);
    });
    let persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.backstory?.keyConnectionEntryId).toBe(first.id);
    expect(persisted?.data.backstory?.entries.some((entry) => entry.id === ordinary.id)).toBe(false);

    await clickButton(entryRow(wrapper, first.id), "删除");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.backstory?.entries)
        .toEqual([encounter]);
    });
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.backstory?.keyConnectionEntryId).toBeUndefined();
    expect(persisted?.data.backstory?.entries).toEqual([encounter]);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
