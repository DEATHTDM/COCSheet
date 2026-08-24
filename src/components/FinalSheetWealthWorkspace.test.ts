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
import FinalSheetWealthWorkspace from "./FinalSheetWealthWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "84000000-0000-4000-8000-000000000008",
  name: "长期财富调查员",
  settingId: "standard",
  eraId: "classic-1920s",
  skills: [{
    ref: { type: "standard", definitionId: "credit-rating" },
    currentValue: 40,
    improvementChecked: false,
  }],
};

const Harness = defineComponent({
  components: { FinalSheetWealthWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetWealthWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
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

describe("Final Sheet wealth workspace rendered interactions", () => {
  it("legacy Standard 缺失 wealth 只读打开零写入，显式金额建立后刷新保持且 assetEntries 为空", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect(wrapper.text()).toContain("建立当前财富记录");
    expect(wrapper.text()).toContain("消费水平");
    expect(wrapper.get('input[name="initial-cash"]').element.getAttribute("value") ?? "").toBe("");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(baseCharacter.id))?.data.wealth).toBeUndefined();

    await wrapper.get('input[name="initial-cash"]').setValue("-1");
    await wrapper.get('input[name="initial-assets"]').setValue("oops");
    await wrapper.get("form[data-wealth-initializer]").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("最多两位小数");
    expect(updateSpy).not.toHaveBeenCalled();

    await wrapper.get('input[name="initial-cash"]').setValue("42.50");
    await wrapper.get('input[name="initial-assets"]').setValue("1250");
    await wrapper.get("form[data-wealth-initializer]").trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.wealth).toEqual({
        cashMinorUnits: 4_250,
        assetsMinorUnits: 125_000,
        assetEntries: [],
      });
    });
    expect(wrapper.text()).toContain("当前长期财富记录已建立");

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(baseCharacter.id))?.data.wealth).toEqual({
      cashMinorUnits: 4_250,
      assetsMinorUnits: 125_000,
      assetEntries: [],
    });
  });

  it("编辑 Cash/Assets 与 asset add/edit/cancel/delete 保持 UUID，并与总额及派生 Spending Level 解耦", async () => {
    const wrapper = await mountCharacter({
      ...baseCharacter,
      wealth: { cashMinorUnits: 5_000, assetsMinorUnits: 100_000, assetEntries: [] },
    });
    const spendingBefore = wrapper.findAll(".final-wealth-rules dd")[2]!.text();

    await wrapper.get('input[name="current-cash"]').setValue("40.25");
    await wrapper.findAll(".final-money-editor")[0]!.trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.wealth?.cashMinorUnits)
        .toBe(4_025);
    });
    await wrapper.get('input[name="current-assets"]').setValue("1250");
    await wrapper.findAll(".final-money-editor")[1]!.trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.wealth?.assetsMinorUnits)
        .toBe(125_000);
    });

    await wrapper.get('input[placeholder="例如：波士顿公寓"]').setValue("  波士顿公寓  ");
    await wrapper.get('input[placeholder="例如：25000"]').setValue("");
    await clickButton(wrapper, "添加资产");
    let persisted = await characterRepository.getById(baseCharacter.id);
    const entry = persisted?.data.wealth?.assetEntries[0];
    if (!entry) throw new Error("资产条目未创建");
    expect(entry).toEqual({ id: entry.id, description: "波士顿公寓" });
    expect(persisted?.data.wealth).toMatchObject({ cashMinorUnits: 4_025, assetsMinorUnits: 125_000 });

    const row = wrapper.get(`[data-asset-entry-id="${entry.id}"]`);
    await clickButton(row, "编辑");
    await row.get('input[type="text"]').setValue("不保存");
    await clickButton(row, "取消");
    expect((await characterRepository.getById(baseCharacter.id))?.data.wealth?.assetEntries[0])
      .toEqual(entry);

    await clickButton(row, "编辑");
    const inputs = row.findAll("input");
    await inputs[0]!.setValue("纽伯里街公寓");
    await inputs[1]!.setValue("999.99");
    await clickButton(row, "保存");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.wealth?.assetEntries[0]).toEqual({
      id: entry.id,
      description: "纽伯里街公寓",
      valueMinorUnits: 99_999,
    });
    expect(persisted?.data.wealth?.assetsMinorUnits).toBe(125_000);
    expect(wrapper.findAll(".final-wealth-rules dd")[2]!.text()).toBe(spendingBefore);

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await clickButton(wrapper.get(`[data-asset-entry-id="${entry.id}"]`), "删除");
    expect((await characterRepository.getById(baseCharacter.id))?.data.wealth?.assetEntries).toHaveLength(1);
    confirm.mockReturnValue(true);
    await clickButton(wrapper.get(`[data-asset-entry-id="${entry.id}"]`), "删除");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.wealth?.assetEntries).toEqual([]);
    expect(persisted?.data.wealth?.assetsMinorUnits).toBe(125_000);
  });

  it("non-Standard 缺失 wealth 不显示美元 initializer/editor；legacy wealth 只读显示原始金额", async () => {
    let wrapper = await mountCharacter({
      ...baseCharacter,
      id: "85000000-0000-4000-8000-000000000008",
      settingId: "gaslight",
      eraId: undefined,
      skills: undefined,
    });
    expect(wrapper.text()).toContain("当前规则环境暂不支持编辑财富金额");
    expect(wrapper.find("[data-wealth-initializer]").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("当前现金（美元）");
    expect(wrapper.text()).not.toContain("$");
    wrapper.unmount();

    await db.delete();
    await db.open();
    setActivePinia(createPinia());
    wrapper = await mountCharacter({
      ...baseCharacter,
      id: "86000000-0000-4000-8000-000000000008",
      settingId: "gaslight",
      eraId: undefined,
      skills: undefined,
      wealth: {
        cashMinorUnits: 321,
        assetsMinorUnits: 654,
        assetEntries: [{ id: crypto.randomUUID(), description: "旧资产", valueMinorUnits: 123 }],
      },
    });
    expect(wrapper.text()).toContain("现金原始值321");
    expect(wrapper.text()).toContain("资产原始值654");
    expect(wrapper.text()).toContain("旧资产123");
    expect(wrapper.find('input[name="current-cash"]').exists()).toBe(false);
  });
});
