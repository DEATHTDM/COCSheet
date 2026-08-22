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
import FinalSheetWeaponWorkspace from "./FinalSheetWeaponWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "88000000-0000-4000-8000-000000000008",
  name: "长期武器调查员",
  settingId: "standard",
  eraId: "classic-1920s",
  wealth: { cashMinorUnits: 5_000, assetsMinorUnits: 100_000, assetEntries: [] },
};

const Harness = defineComponent({
  components: { FinalSheetWeaponWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetWeaponWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
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

function definitionCard(wrapper: VueWrapper, definitionId: string) {
  return wrapper.get(`[data-weapon-definition-id="${definitionId}"]`);
}

describe("Final Sheet weapon workspace rendered interactions", () => {
  it("Standard 104-row same-Setting catalog 默认折叠并支持 zh/en/skill/ID 搜索与 category filter", async () => {
    const wrapper = await mountCharacter();
    expect(wrapper.get(".final-weapon-catalog").attributes("open")).toBeUndefined();
    expect(wrapper.get(".final-weapon-catalog summary").text()).toContain("104");
    expect(wrapper.findAll("[data-weapon-definition-id]")).toHaveLength(104);

    const search = wrapper.get<HTMLInputElement>('.final-weapon-catalog input[type="search"]');
    await search.setValue("FN FAL");
    expect(wrapper.findAll("[data-weapon-definition-id]")).toHaveLength(1);
    expect(definitionCard(wrapper, "fn-fal").text()).toContain("FN FAL");
    await search.setValue("突击步枪");
    expect(wrapper.findAll("[data-weapon-definition-id]").length).toBeGreaterThan(0);
    await search.setValue("步枪");
    expect(wrapper.findAll("[data-weapon-definition-id]").length).toBeGreaterThan(1);
    await search.setValue("fn-fal");
    expect(wrapper.findAll("[data-weapon-definition-id]")).toHaveLength(1);

    await search.setValue("");
    await wrapper.get(".final-weapon-catalog select").setValue("assault-rifle");
    const filtered = wrapper.findAll("[data-weapon-definition-id]");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((card) => card.text().includes("突击步枪"))).toBe(true);
  });

  it("available/rare/unavailable 均可添加，duplicate UUID 独立，notes edit/clear/remove 与 Cash 解耦", async () => {
    const wrapper = await mountCharacter();
    const available = definitionCard(wrapper, "bow");
    const rare = definitionCard(wrapper, "flintlock-pistol");
    const unavailable = definitionCard(wrapper, "fn-fal");
    expect(available.text()).toContain("可用");
    expect(rare.text()).toContain("稀有");
    expect(unavailable.text()).toContain("当前时代不可用");
    expect(unavailable.get("button").attributes("disabled")).toBeUndefined();

    await clickButton(available, "添加");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.weapons).toHaveLength(1);
    });
    await clickButton(rare, "添加");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.weapons).toHaveLength(2);
    });
    await clickButton(unavailable, "添加");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.weapons).toHaveLength(3);
    });
    await clickButton(definitionCard(wrapper, "bow"), "添加");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.weapons).toHaveLength(4);
    });
    let persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.weapons?.map((weapon) => weapon.definitionId))
      .toEqual(["bow", "flintlock-pistol", "fn-fal", "bow"]);
    expect(new Set(persisted?.data.weapons?.map((weapon) => weapon.id)).size).toBe(4);
    expect(persisted?.data.wealth).toEqual(baseCharacter.wealth);

    const first = persisted?.data.weapons?.[0];
    if (!first) throw new Error("武器未创建");
    let row = wrapper.get(`[data-weapon-instance-id="${first.id}"]`);
    await clickButton(row, "编辑备注");
    await row.get("textarea").setValue("  家传弓  ");
    await clickButton(row, "保存备注");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.weapons?.[0]).toEqual({
      id: first.id,
      definitionId: "bow",
      notes: "家传弓",
    });

    row = wrapper.get(`[data-weapon-instance-id="${first.id}"]`);
    await clickButton(row, "编辑备注");
    await row.get("textarea").setValue("   ");
    await clickButton(row, "保存备注");
    expect((await characterRepository.getById(baseCharacter.id))?.data.weapons?.[0])
      .toEqual({ id: first.id, definitionId: "bow" });

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    row = wrapper.get(`[data-weapon-instance-id="${first.id}"]`);
    await clickButton(row, "删除");
    expect((await characterRepository.getById(baseCharacter.id))?.data.weapons).toHaveLength(4);
    confirm.mockReturnValue(true);
    await clickButton(row, "删除");
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.weapons).toHaveLength(3);
    expect(persisted?.data.wealth).toEqual(baseCharacter.wealth);

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(baseCharacter.id))?.data.weapons).toHaveLength(3);
  });

  it("缺失 era 仍可 add；orphan 可编辑 notes 与删除且不自动修复 definition", async () => {
    const orphanId = crypto.randomUUID();
    const wrapper = await mountCharacter({
      version: 1,
      id: "89000000-0000-4000-8000-000000000008",
      name: "Legacy Weapon",
      settingId: "standard",
      weapons: [{ id: orphanId, definitionId: "retired-weapon", notes: "旧记录" }],
    });
    expect(definitionCard(wrapper, "fn-fal").text()).toContain("时代未指定");
    await clickButton(definitionCard(wrapper, "fn-fal"), "添加");
    let persisted = await characterRepository.getById("89000000-0000-4000-8000-000000000008");
    expect(persisted?.data.weapons?.[1]?.definitionId).toBe("fn-fal");

    let orphan = wrapper.get(`[data-weapon-instance-id="${orphanId}"]`);
    expect(orphan.text()).toContain("不会自动修复");
    await clickButton(orphan, "编辑备注");
    await orphan.get("textarea").setValue("待 Keeper 核对");
    await clickButton(orphan, "保存备注");
    persisted = await characterRepository.getById("89000000-0000-4000-8000-000000000008");
    expect(persisted?.data.weapons?.[0]).toEqual({
      id: orphanId,
      definitionId: "retired-weapon",
      notes: "待 Keeper 核对",
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);
    orphan = wrapper.get(`[data-weapon-instance-id="${orphanId}"]`);
    await clickButton(orphan, "删除");
    expect((await characterRepository.getById("89000000-0000-4000-8000-000000000008"))
      ?.data.weapons?.map((weapon) => weapon.definitionId)).toEqual(["fn-fal"]);
  });

  it("non-Standard registry 空且不 fallback Standard", async () => {
    const wrapper = await mountCharacter({
      version: 1,
      id: "8a000000-0000-4000-8000-000000000008",
      name: "Gaslight Weapon",
      settingId: "gaslight",
    });
    expect(wrapper.get(".final-weapon-catalog summary").text()).toContain("（0）");
    expect(wrapper.text()).toContain("不会回退显示 Standard 武器");
    expect(wrapper.findAll("[data-weapon-definition-id]")).toHaveLength(0);
    expect(wrapper.text()).not.toContain("FN FAL");
  });
});
