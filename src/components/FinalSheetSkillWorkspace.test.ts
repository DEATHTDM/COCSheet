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
import FinalSheetSkillWorkspace from "./FinalSheetSkillWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "70000000-0000-4000-8000-000000000007",
  name: "技能人物卡",
  settingId: "standard",
  eraId: "classic-1920s",
  age: 30,
  characteristics: { STR: 50, CON: 60, SIZ: 70, DEX: 55, APP: 45, INT: 80, POW: 65, EDU: 75 },
  resources: { hp: { current: 10 }, mp: { current: 13 }, san: { current: 80 } },
};

const Harness = defineComponent({
  components: { FinalSheetSkillWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetSkillWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
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

function skillRow(wrapper: VueWrapper, key: string): DOMWrapper<Element> {
  return wrapper.find(`[data-skill-key="${key}"]`);
}

function skillToggle(wrapper: VueWrapper, text: string): DOMWrapper<Element> {
  const label = wrapper.findAll("label.final-skill-toggle").find((candidate) => candidate.text().includes(text));
  if (!label) throw new Error(`找不到技能开关：${text}`);
  return label.find('input[type="checkbox"]');
}

describe("Final Sheet skill workspace rendered interactions", () => {
  it("渲染未持久化 baseline 不写入，修改 current 后才实例化并刷新保持", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");
    const library = skillRow(wrapper, "skill:library-use");

    expect(library.exists()).toBe(true);
    expect(library.text()).toContain("图书馆使用");
    expect(library.text()).toContain("目录基础值");
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toBeUndefined();
    expect(updateSpy).not.toHaveBeenCalled();

    await library.find('input[aria-label="图书馆使用 当前值"]').setValue("45");
    await library.find('input[aria-label="图书馆使用 当前值"]').trigger("blur");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.skills?.[0]?.currentValue).toBe(45);
    });
    await wrapper.vm.$nextTick();

    const updatedRow = skillRow(wrapper, "skill:library-use");
    expect(updatedRow.text()).toContain("困难22");
    expect(updatedRow.text()).toContain("极难9");
    expect(updatedRow.text()).not.toContain("目录基础值");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toEqual([{
      ref: { type: "standard", definitionId: "library-use" },
      currentValue: 45,
      improvementChecked: false,
    }]);

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(baseCharacter.id))?.data.skills?.[0]?.currentValue).toBe(45);
  });

  it("baseline 成长标记用 resolved base 实例化，not-eligible 控件禁用", async () => {
    const wrapper = await mountCharacter();
    const library = skillRow(wrapper, "skill:library-use");
    await library.find('input[aria-label="图书馆使用 成长标记"]').setValue(true);
    await flushPromises();

    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toEqual([{
      ref: { type: "standard", definitionId: "library-use" },
      currentValue: 20,
      improvementChecked: true,
    }]);
    expect(skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 成长标记"]').attributes("disabled")).toBeDefined();
    expect(skillRow(wrapper, "skill:credit-rating")
      .find('input[aria-label="信用评级 成长标记"]').attributes("disabled")).toBeDefined();
  });

  it("搜索与 uncommon 开关操作真实渲染列表", async () => {
    const wrapper = await mountCharacter();
    expect(skillRow(wrapper, "skill:hypnosis").exists()).toBe(false);

    await wrapper.find(".final-skill-toggle input").setValue(true);
    expect(skillRow(wrapper, "skill:hypnosis").exists()).toBe(true);

    await wrapper.find('.final-skill-search input[type="search"]').setValue("魅惑");
    expect(skillRow(wrapper, "skill:charm").exists()).toBe(true);
    expect(skillRow(wrapper, "skill:library-use").exists()).toBe(false);
  });

  it("predefined 默认不展开；开关浏览零写入，修改后稳定持久化且关闭开关仍显示", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");
    const brawlKey = "skill:fighting:predefined:brawl";

    expect(skillRow(wrapper, brawlKey).exists()).toBe(false);
    expect(wrapper.find('[data-skill-key^="skill:science:predefined:"]').exists()).toBe(false);

    await skillToggle(wrapper, "显示技能专攻").setValue(true);
    expect(skillRow(wrapper, brawlKey).text()).toContain("格斗（斗殴）");
    expect(skillRow(wrapper, brawlKey).text()).toContain("目录基础值");
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toBeUndefined();
    expect(updateSpy).not.toHaveBeenCalled();

    await skillToggle(wrapper, "显示技能专攻").setValue(false);
    expect(skillRow(wrapper, brawlKey).exists()).toBe(false);

    await skillToggle(wrapper, "显示技能专攻").setValue(true);
    const brawl = skillRow(wrapper, brawlKey);
    await brawl.find('input[aria-label="格斗（斗殴） 当前值"]').setValue("41");
    await brawl.find('input[aria-label="格斗（斗殴） 当前值"]').trigger("blur");
    await flushPromises();
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toEqual([{
      ref: { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      currentValue: 41,
      improvementChecked: false,
    }]);

    await skillRow(wrapper, brawlKey)
      .find('input[aria-label="格斗（斗殴） 成长标记"]')
      .setValue(true);
    await flushPromises();
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toEqual([{
      ref: { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      currentValue: 41,
      improvementChecked: true,
    }]);

    await skillToggle(wrapper, "显示技能专攻").setValue(false);
    expect(skillRow(wrapper, brawlKey).text()).toContain("格斗（斗殴）");
    expect(skillRow(wrapper, brawlKey).text()).not.toContain("目录基础值");
  });

  it("Mythos 提高先确认并同步 SAN；取消零写入，降低不恢复 SAN", async () => {
    const wrapper = await mountCharacter();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').setValue("30");
    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').trigger("blur");
    await flushPromises();
    let persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.skills).toBeUndefined();
    expect(persisted?.data.resources?.san.current).toBe(80);

    confirm.mockReturnValue(true);
    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').setValue("30");
    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').trigger("blur");
    await flushPromises();
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.skills?.find((skill) => skill.ref.definitionId === "cthulhu-mythos")?.currentValue).toBe(30);
    expect(persisted?.data.resources?.san.current).toBe(69);

    confirm.mockClear();
    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').setValue("10");
    await skillRow(wrapper, "skill:cthulhu-mythos")
      .find('input[aria-label="克苏鲁神话 当前值"]').trigger("blur");
    await flushPromises();
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(confirm).not.toHaveBeenCalled();
    expect(persisted?.data.skills?.find((skill) => skill.ref.definitionId === "cthulhu-mythos")?.currentValue).toBe(10);
    expect(persisted?.data.resources?.san.current).toBe(69);
  });

  it("custom create / rename / remove 由 Store 保持 UUID，删除需要确认", async () => {
    const wrapper = await mountCharacter();
    await wrapper.find(".final-custom-skill-form select").setValue("science");
    await wrapper.find('.final-custom-skill-form input[type="text"]').setValue("天体生物学");
    await wrapper.find(".final-custom-skill-form").trigger("submit");
    await flushPromises();

    let persisted = await characterRepository.getById(baseCharacter.id);
    const created = persisted?.data.skills?.find((skill) => skill.ref.type === "custom");
    if (!created || created.ref.type !== "custom") throw new Error("custom 创建失败");
    const specializationId = created.ref.specializationId;
    const key = `skill:science:custom:${specializationId}`;
    expect(skillRow(wrapper, key).text()).toContain("科学（天体生物学）");

    await skillRow(wrapper, key)
      .find('input[aria-label="科学（天体生物学） 技能专攻名称"]')
      .setValue("宇宙学");
    await skillRow(wrapper, key)
      .find('input[aria-label="科学（天体生物学） 技能专攻名称"]')
      .trigger("blur");
    await flushPromises();
    persisted = await characterRepository.getById(baseCharacter.id);
    expect(persisted?.data.skills?.[0]?.ref).toMatchObject({
      type: "custom",
      specializationId,
      displayName: "宇宙学",
    });

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await skillRow(wrapper, key).find("button.danger").trigger("click");
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toHaveLength(1);

    confirm.mockReturnValue(true);
    await skillRow(wrapper, key).find("button.danger").trigger("click");
    await flushPromises();
    expect((await characterRepository.getById(baseCharacter.id))?.data.skills).toEqual([]);
    expect(skillRow(wrapper, key).exists()).toBe(false);
  });
});
