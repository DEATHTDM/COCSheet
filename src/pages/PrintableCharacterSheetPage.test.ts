// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import { CREATION_EXPERIENCE_MODE_STORAGE_KEY } from "../app/preferences/creationExperiencePreference";
import type { Character } from "../coc7/types/character";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationSessionRepository } from "../db/repositories/creationSessionRepository";
import { kpPresetRepository } from "../db/repositories/kpPresetRepository";
import FinalCharacterSheetPage from "./FinalCharacterSheetPage.vue";
import PrintableCharacterSheetPage from "./PrintableCharacterSheetPage.vue";

const character: Character = {
  version: 1,
  id: "13000000-0000-4000-8000-000000000013",
  name: "Printable Investigator",
  settingId: "standard",
  eraId: "classic-1920s",
  age: 31,
  sex: "女性",
  residence: "上海",
  birthplace: "苏州",
  characteristics: { STR: 55, CON: 60, SIZ: 65, DEX: 70, APP: 45, INT: 80, POW: 75, EDU: 65 },
  luck: 48,
  resources: { hp: { current: 9 }, mp: { current: 17 }, san: { current: 61 } },
  occupation: {
    kind: "catalog",
    id: "private-investigator",
    displayNameSnapshot: { zh: "私人侦探快照", en: "Private Investigator Snapshot" },
  },
  skills: [
    {
      ref: { type: "standard", definitionId: "library-use" },
      currentValue: 63,
      improvementChecked: true,
    },
    {
      ref: { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      currentValue: 52,
      improvementChecked: false,
    },
    {
      ref: { type: "standard", definitionId: "retired-skill" },
      currentValue: 37,
      improvementChecked: false,
    },
  ],
  backstory: {
    entries: [{
      id: "13000000-0000-4000-8000-000000000014",
      category: "significant-people",
      text: "失踪的导师。",
    }],
    keyConnectionEntryId: "13000000-0000-4000-8000-000000000014",
  },
  wealth: {
    cashMinorUnits: 12_345,
    assetsMinorUnits: 2_500_000,
    assetEntries: [{
      id: "13000000-0000-4000-8000-000000000015",
      description: "上海公寓",
      valueMinorUnits: 2_000_000,
    }],
  },
  possessions: [
    { id: "13000000-0000-4000-8000-000000000016", name: "笔记本", notes: "红色封面" },
    { id: "13000000-0000-4000-8000-000000000017", name: "笔记本" },
  ],
  weapons: [
    { id: "13000000-0000-4000-8000-000000000018", definitionId: "bow", notes: "白蜡木弓" },
    { id: "13000000-0000-4000-8000-000000000019", definitionId: "bow" },
    { id: "13000000-0000-4000-8000-000000000020", definitionId: "retired-weapon", notes: "旧资料" },
  ],
};

async function mountPrintable(id: string): Promise<{
  wrapper: VueWrapper;
  router: Router;
}> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/characters/:id/sheet", component: { template: "<div>sheet</div>" } },
      { path: "/characters/:id/print", component: PrintableCharacterSheetPage },
    ],
  });
  await router.push(`/characters/${id}/print`);
  await router.isReady();
  const wrapper = mount(PrintableCharacterSheetPage, { global: { plugins: [pinia, router] } });
  return { wrapper, router };
}

beforeEach(async () => {
  document.title = "COCSheet Test";
  window.localStorage.clear();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  document.title = "";
  window.localStorage.clear();
  await db.delete();
});

describe("PrintableCharacterSheetPage rendered integrations", () => {
  it("只 load Character、零写入，并渲染完整只读 Standard 人物卡", async () => {
    await characterRepository.create(character);
    const getCharacter = vi.spyOn(characterRepository, "getById");
    const updateCharacter = vi.spyOn(characterRepository, "update");
    const loadSession = vi.spyOn(creationSessionRepository, "getByCharacterId");
    const createSession = vi.spyOn(creationSessionRepository, "create");
    const updateSession = vi.spyOn(creationSessionRepository, "update");
    const removeSession = vi.spyOn(creationSessionRepository, "remove");
    const createPreset = vi.spyOn(kpPresetRepository, "create");
    const updatePreset = vi.spyOn(kpPresetRepository, "update");
    const removePreset = vi.spyOn(kpPresetRepository, "remove");
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");

    const { wrapper } = await mountPrintable(character.id);
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe("Printable Investigator"));

    expect(wrapper.text()).toContain("私人侦探快照");
    expect(wrapper.text()).toContain("古典（1920年代）");
    expect(wrapper.text()).toContain("Current HP");
    expect(wrapper.text()).toContain("Maximum 12");
    expect(wrapper.text()).toContain("Initial 15");
    expect(wrapper.findAll(".print-characteristic-card")).toHaveLength(8);
    expect(wrapper.get('[data-skill-key="skill:library-use"]').text()).toContain("✓ 成长");
    expect(wrapper.get('[data-skill-key="skill:retired-skill"]').text()).toContain("Orphan");
    expect(wrapper.text()).toContain("★ 关键联结");
    expect(wrapper.text()).toContain("$123.45");
    expect(wrapper.findAll(".print-possession-list li")).toHaveLength(2);
    expect(wrapper.findAll('[data-weapon-instance-id]')).toHaveLength(3);
    expect(wrapper.text()).toContain("白蜡木弓");
    expect(wrapper.text()).not.toContain("浏览当前 Setting 武器目录");

    const printable = wrapper.get(".printable-sheet");
    expect(printable.findAll("input")).toHaveLength(0);
    expect(printable.findAll("textarea")).toHaveLength(0);
    expect(printable.findAll("select")).toHaveLength(0);
    expect(printable.findAll("button")).toHaveLength(0);
    expect(wrapper.get(".print-preview-toolbar").element.contains(printable.element)).toBe(false);

    expect(getCharacter).toHaveBeenCalledTimes(1);
    expect(getCharacter).toHaveBeenCalledWith(character.id);
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(loadSession).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
    expect(removeSession).not.toHaveBeenCalled();
    expect(createPreset).not.toHaveBeenCalled();
    expect(updatePreset).not.toHaveBeenCalled();
    expect(removePreset).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe("quick");
    expect((await characterRepository.getById(character.id))?.data).toEqual(character);
    expect(document.title).toBe("Printable Investigator - 人物卡");
  });

  it("打印按钮只调用 window.print 一次，失败时保持页面可用", async () => {
    await characterRepository.create(character);
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { wrapper } = await mountPrintable(character.id);
    await vi.waitFor(() => expect(wrapper.text()).toContain("打印 / 保存 PDF"));

    await wrapper.get(".print-preview-toolbar button").trigger("click");
    expect(print).toHaveBeenCalledTimes(1);

    print.mockImplementation(() => {
      throw new Error("unavailable");
    });
    await wrapper.get(".print-preview-toolbar button").trigger("click");
    expect(wrapper.get('[role="alert"]').text()).toContain("请使用浏览器菜单中的打印功能");
    expect(wrapper.find(".printable-sheet").exists()).toBe(true);
  });

  it("missing Character 显示错误且不出现打印按钮", async () => {
    const { wrapper } = await mountPrintable("13000000-0000-4000-8000-000000000099");
    await vi.waitFor(() => expect(wrapper.text()).toContain("找不到该调查员。"));

    expect(wrapper.find(".printable-sheet").exists()).toBe(false);
    expect(wrapper.find(".print-preview-toolbar button").exists()).toBe(false);
    expect(wrapper.get(".print-preview-toolbar a").text()).toBe("返回人物卡");
  });

  it("route A → B 在同一实例重新载入，并同步更新 title", async () => {
    const second: Character = {
      ...character,
      id: "13000000-0000-4000-8000-000000000021",
      name: "Route B Printable",
      luck: 7,
      resources: { hp: { current: 3 }, mp: { current: 4 }, san: { current: 5 } },
    };
    await characterRepository.create(character);
    await characterRepository.create(second);
    const { wrapper, router } = await mountPrintable(character.id);
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe(character.name));

    await router.push(`/characters/${second.id}/print`);
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe(second.name));

    expect(wrapper.get("#print-resources-heading").element.nextElementSibling?.textContent)
      .toContain("Current HP3");
    expect(wrapper.text()).toContain("Current Luck7");
    expect(document.title).toBe("Route B Printable - 人物卡");
    wrapper.unmount();
    expect(document.title).toBe("COCSheet Test");
  });

  it("legacy/no-session 缺失资源仍可打印且没有 writeback", async () => {
    const legacy: Character = {
      version: 1,
      id: "13000000-0000-4000-8000-000000000022",
      name: "Legacy Printable",
      settingId: "standard",
    };
    await characterRepository.create(legacy);
    const update = vi.spyOn(characterRepository, "update");
    const { wrapper } = await mountPrintable(legacy.id);
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe(legacy.name));

    expect(wrapper.text()).toContain("最终属性未记录");
    expect(wrapper.text()).toContain("财富未记录");
    expect(wrapper.text()).toContain("Maximum 99");
    expect(update).not.toHaveBeenCalled();
    expect((await characterRepository.getById(legacy.id))?.data).toEqual(legacy);
  });

  it("non-Standard 不派生 Standard 数值，也不回退 Standard 技能或武器目录", async () => {
    const { eraId: _eraId, ...withoutEra } = character;
    const gaslight: Character = {
      ...withoutEra,
      id: "13000000-0000-4000-8000-000000000023",
      name: "Gaslight Printable",
      settingId: "gaslight",
      skills: [{
        ref: { type: "standard", definitionId: "library-use" },
        currentValue: 58,
        improvementChecked: false,
      }],
      wealth: { cashMinorUnits: 123, assetsMinorUnits: 456, assetEntries: [] },
      weapons: [{
        id: "13000000-0000-4000-8000-000000000024",
        definitionId: "bow",
      }],
    };
    await characterRepository.create(gaslight);
    const { wrapper } = await mountPrintable(gaslight.id);
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe(gaslight.name));

    expect(wrapper.text()).toContain("Cthulhu by Gaslight");
    expect(wrapper.text()).toContain("当前 Setting 暂无可可靠派生数据");
    expect(wrapper.find('[data-skill-key="skill:library-use"]').text()).toContain("未知技能");
    expect(wrapper.text()).toContain("123 raw minor units");
    expect(wrapper.text()).toContain("未知武器（bow）");
    expect(wrapper.findAll(".print-skill-row")).toHaveLength(1);
  });

  it("Final Sheet 未保存 draft 不进入打印页，入口链接指向当前 Character", async () => {
    await characterRepository.create(character);
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
        { path: "/characters/:id/print", component: PrintableCharacterSheetPage },
      ],
    });
    await router.push(`/characters/${character.id}/sheet`);
    await router.isReady();
    const wrapper = mount({ template: "<RouterView />" }, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.find("#sheet-current-hp").exists()).toBe(true));

    await wrapper.get("#sheet-current-hp").setValue("4");
    const entry = wrapper.findAll("a").find((link) => link.text() === "打印 / PDF");
    if (!entry) throw new Error("找不到打印入口");
    expect(entry.attributes("href")).toContain(`/characters/${character.id}/print`);
    await entry.trigger("click");
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.find(".printable-sheet").exists()).toBe(true));

    const resources = wrapper.get("#print-resources-heading").element.nextElementSibling?.textContent;
    expect(resources).toContain("Current HP9");
    expect(resources).not.toContain("Current HP4");
    expect((await characterRepository.getById(character.id))?.data.resources?.hp.current).toBe(9);
  });
});
