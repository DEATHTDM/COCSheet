// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from "@vue/test-utils";

import { useCharacterStore } from "../app/stores/characterStore";
import type { Character } from "../coc7/types/character";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationSessionRepository } from "../db/repositories/creationSessionRepository";
import FinalSheetPossessionsWorkspace from "./FinalSheetPossessionsWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "87000000-0000-4000-8000-000000000008",
  name: "长期物品调查员",
  settingId: "standard",
  wealth: { cashMinorUnits: 5_000, assetsMinorUnits: 100_000, assetEntries: [] },
};

const Harness = defineComponent({
  components: { FinalSheetPossessionsWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetPossessionsWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
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

async function clickButton(
  scope: { findAll(selector: string): DOMWrapper<Element>[] },
  label: string,
): Promise<void> {
  const button = scope.findAll("button").find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  await button.trigger("click");
  await flushPromises();
}

describe("Final Sheet possessions workspace rendered interactions", () => {
  it("missing possessions 打开零写入；无 session 可 add duplicate/edit/cancel/remove，并保持财富与 UUID", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");
    expect(wrapper.text()).toContain("打开页面不会自动生成空数组");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(baseCharacter.id))?.data.possessions).toBeUndefined();
    expect(await creationSessionRepository.getByCharacterId(baseCharacter.id)).toBeUndefined();

    await wrapper.get('input[name="possession-name"]').setValue("  莱卡相机  ");
    await wrapper.get('textarea[name="possession-notes"]').setValue("  随身携带  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.possessions).toHaveLength(1);
    });
    await wrapper.get('input[name="possession-name"]').setValue("莱卡相机");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.possessions).toHaveLength(2);
    });

    let persisted = await characterRepository.getById(baseCharacter.id);
    const [first, second] = persisted?.data.possessions ?? [];
    if (!first || !second) throw new Error("重复随身物品未创建");
    expect(first).toEqual({ id: first.id, name: "莱卡相机", notes: "随身携带" });
    expect(second).toEqual({ id: second.id, name: "莱卡相机" });
    expect(first.id).not.toBe(second.id);
    expect(persisted?.data.wealth).toEqual(baseCharacter.wealth);

    const firstRow = wrapper.get(`[data-possession-entry-id="${first.id}"]`);
    await clickButton(firstRow, "编辑");
    await firstRow.get('input[type="text"]').setValue("不保存");
    await clickButton(firstRow, "取消");
    expect((await characterRepository.getById(baseCharacter.id))?.data.possessions?.[0]).toEqual(first);

    await clickButton(firstRow, "编辑");
    await firstRow.get('input[type="text"]').setValue("相机");
    await firstRow.get("textarea").setValue("   ");
    await clickButton(firstRow, "保存");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.possessions?.[0]).toEqual({ id: first.id, name: "相机" });
    expect(persisted?.data.wealth).toEqual(baseCharacter.wealth);

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await clickButton(wrapper.get(`[data-possession-entry-id="${first.id}"]`), "删除");
    expect((await characterRepository.getById(baseCharacter.id))?.data.possessions).toHaveLength(2);
    confirm.mockReturnValue(true);
    await clickButton(wrapper.get(`[data-possession-entry-id="${first.id}"]`), "删除");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.possessions).toEqual([second]);
    expect(persisted?.data.wealth).toEqual(baseCharacter.wealth);
    expect(await creationSessionRepository.getByCharacterId(baseCharacter.id)).toBeUndefined();

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(baseCharacter.id))?.data.possessions).toEqual([second]);
  });

  it("blank name 显示 Store validation 且不写入", async () => {
    const wrapper = await mountCharacter({ ...baseCharacter, id: crypto.randomUUID() });
    const updateSpy = vi.spyOn(characterRepository, "update");
    await wrapper.get('input[name="possession-name"]').setValue("   ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("随身物品名称不能为空");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
