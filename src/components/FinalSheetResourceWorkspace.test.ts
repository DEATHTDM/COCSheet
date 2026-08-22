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
import FinalSheetResourceWorkspace from "./FinalSheetResourceWorkspace.vue";

const baseCharacter: Character = {
  version: 1,
  id: "89000000-0000-4000-8000-000000000008",
  name: "资源人物卡",
  settingId: "standard",
  eraId: "modern",
  age: 30,
  characteristics: { STR: 50, CON: 60, SIZ: 70, DEX: 55, APP: 45, INT: 80, POW: 65, EDU: 75 },
  luck: 60,
  resources: { hp: { current: 10 }, mp: { current: 13 }, san: { current: 80 } },
  skills: [{
    ref: { type: "standard", definitionId: "cthulhu-mythos" },
    currentValue: 5,
    improvementChecked: false,
  }],
};

const Harness = defineComponent({
  components: { FinalSheetResourceWorkspace },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetResourceWorkspace v-if="characterStore.current" :character="characterStore.current.data" />`,
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

function editor(wrapper: VueWrapper, inputId: string): DOMWrapper<Element> {
  const match = wrapper.findAll(".resource-editor").find(
    (candidate) => candidate.find("input").attributes("id") === inputId,
  );
  if (!match) throw new Error(`找不到资源编辑器：${inputId}`);
  return match;
}

async function saveValue(wrapper: VueWrapper, inputId: string, value: string): Promise<void> {
  const target = editor(wrapper, inputId);
  await target.get("input").setValue(value);
  await target.get("button").trigger("click");
  await flushPromises();
  await vi.waitFor(() => {
    expect(editor(wrapper, inputId).get("button").attributes("disabled")).toBeUndefined();
  });
}

describe("Final Sheet resource workspace rendered interactions", () => {
  it("保存 HP 与高于 Initial MP 的 Current MP，并拒绝超过 Maximum HP", async () => {
    const wrapper = await mountCharacter();

    await saveValue(wrapper, "sheet-current-hp", "5");
    await saveValue(wrapper, "sheet-current-mp", "25");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(baseCharacter.id))?.data.resources).toMatchObject({
        hp: { current: 5 },
        mp: { current: 25 },
      });
    });
    expect(editor(wrapper, "sheet-current-mp").text()).toContain("Initial 13");

    await saveValue(wrapper, "sheet-current-hp", "14");
    expect(wrapper.get('[role="alert"]').text()).toContain("当前 HP 必须为 0～13");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-hp").element.value).toBe("5");
    expect((await characterRepository.getById(baseCharacter.id))?.data.resources?.hp.current).toBe(5);
  });

  it("保存 Current SAN、拒绝超过实时 Maximum SAN，并保持其他资源", async () => {
    const character: Character = {
      ...baseCharacter,
      resources: { hp: { current: 8 }, mp: { current: 20 }, san: { current: 50 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    };
    const wrapper = await mountCharacter(character);

    await saveValue(wrapper, "sheet-current-san", "59");
    expect((await characterRepository.getById(character.id))?.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 20 },
      san: { current: 59 },
    });

    await saveValue(wrapper, "sheet-current-san", "60");
    expect(wrapper.get('[role="alert"]').text()).toContain("当前 SAN 必须为 0～59");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-san").element.value).toBe("59");
  });

  it("legacy over-Max SAN 打开零写入，只有显式 reconciliation 才同步且不改变 Luck/技能/HP/MP", async () => {
    const character: Character = {
      ...baseCharacter,
      luck: 44,
      resources: { hp: { current: 8 }, mp: { current: 20 }, san: { current: 70 } },
      skills: [{
        ref: { type: "standard", definitionId: "cthulhu-mythos" },
        currentValue: 40,
        improvementChecked: false,
      }],
    };
    const wrapper = await mountCharacter(character);
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect(wrapper.text()).toContain("旧版本 SAN 数据尚未同步");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-san").element.value).toBe("70");
    expect(updateSpy).not.toHaveBeenCalled();

    const reconcile = wrapper.findAll("button").find((button) => button.text() === "同步至 59");
    if (!reconcile) throw new Error("找不到 SAN reconciliation 按钮");
    await reconcile.trigger("click");
    await flushPromises();

    const persisted = await characterRepository.getById(character.id);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(persisted?.data.resources).toEqual({
      hp: { current: 8 },
      mp: { current: 20 },
      san: { current: 59 },
    });
    expect(persisted?.data.luck).toBe(44);
    expect(persisted?.data.skills).toEqual(character.skills);
    expect(wrapper.get<HTMLInputElement>("#sheet-current-san").element.value).toBe("59");
  });

  it("外部 Mythos mutation 原子 clamp SAN 后立即同步 workspace draft", async () => {
    const wrapper = await mountCharacter();
    const store = useCharacterStore();

    await store.setSkillValue(
      baseCharacter.id,
      { type: "standard", definitionId: "cthulhu-mythos" },
      60,
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.get<HTMLInputElement>("#sheet-current-san").element.value).toBe("39");
    expect(editor(wrapper, "sheet-current-san").text()).toContain("/ 39");
  });

  it("missing Luck 打开零写入，显式保存 0 与 99 后可刷新保持", async () => {
    const character: Character = { ...baseCharacter, luck: undefined };
    const wrapper = await mountCharacter(character);
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect(wrapper.text()).toContain("尚未记录 Current Luck");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-luck").element.value).toBe("");
    expect(updateSpy).not.toHaveBeenCalled();

    await saveValue(wrapper, "sheet-current-luck", "0");
    expect((await characterRepository.getById(character.id))?.data.luck).toBe(0);
    await saveValue(wrapper, "sheet-current-luck", "99");
    expect((await characterRepository.getById(character.id))?.data.luck).toBe(99);
    expect((await characterRepository.getById(character.id))?.data.resources).toEqual(character.resources);

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(character.id))?.data.luck).toBe(99);
  });

  it("invalid Luck 显示错误；Repository failure 不制造脏持久化并恢复持久值", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");

    for (const invalid of ["-1", "100", "1.5"]) {
      await saveValue(wrapper, "sheet-current-luck", invalid);
      expect(wrapper.get('[role="alert"]').text()).toContain("Current Luck 必须为 0～99 的整数");
    }
    expect(updateSpy).not.toHaveBeenCalled();

    updateSpy.mockRejectedValueOnce(new Error("本地写入失败"));
    await saveValue(wrapper, "sheet-current-luck", "45");
    expect(wrapper.get('[role="alert"]').text()).toContain("本地写入失败");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-luck").element.value).toBe("60");
    expect((await characterRepository.getById(baseCharacter.id))?.data.luck).toBe(60);
  });

  it("保存进行中禁用所有 resource actions，并忽略重复提交", async () => {
    const wrapper = await mountCharacter();
    const store = useCharacterStore();
    const original = store.setCurrentLuck.bind(store);
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saveSpy = vi.spyOn(store, "setCurrentLuck").mockImplementation(async (id, value) => {
      await gate;
      return original(id, value);
    });
    const luckEditor = editor(wrapper, "sheet-current-luck");
    await luckEditor.get("input").setValue("45");

    await luckEditor.get("button").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".resource-editor button").every(
      (button) => button.attributes("disabled") !== undefined,
    )).toBe(true);
    await luckEditor.get("button").trigger("click");
    expect(saveSpy).toHaveBeenCalledTimes(1);

    release?.();
    await flushPromises();
    await vi.waitFor(() => expect(luckEditor.get("button").attributes("disabled")).toBeUndefined());
    expect((await characterRepository.getById(baseCharacter.id))?.data.luck).toBe(45);
  });

  it("legacy resources/Luck 四种组合与页面载入均安全且零 writeback", async () => {
    const cases: readonly Character[] = [
      baseCharacter,
      { ...baseCharacter, id: "89100000-0000-4000-8000-000000000008", luck: undefined },
      { ...baseCharacter, id: "89200000-0000-4000-8000-000000000008", resources: undefined },
      { ...baseCharacter, id: "89300000-0000-4000-8000-000000000008", resources: undefined, luck: undefined },
    ];

    for (const character of cases) {
      const wrapper = await mountCharacter(character);
      const updateSpy = vi.spyOn(characterRepository, "update");
      expect(wrapper.find("#sheet-current-hp").exists()).toBe(character.resources !== undefined);
      expect(wrapper.get<HTMLInputElement>("#sheet-current-luck").element.value)
        .toBe(character.luck === undefined ? "" : String(character.luck));
      expect(updateSpy).not.toHaveBeenCalled();
      expect((await characterRepository.getById(character.id))?.data).toEqual(character);
      updateSpy.mockRestore();
      wrapper.unmount();
    }
  });

  it("缺少 characteristics 时 HP 不可写；non-Standard/no-session 人物仍可维护 MP、SAN 与 Luck", async () => {
    const character: Character = {
      ...baseCharacter,
      id: "89400000-0000-4000-8000-000000000008",
      settingId: "gaslight",
      age: undefined,
      characteristics: undefined,
      luck: 20,
      resources: { hp: { current: 8 }, mp: { current: 7 }, san: { current: 50 } },
      skills: undefined,
    };
    const wrapper = await mountCharacter(character);

    expect(wrapper.get("#sheet-current-hp").attributes("disabled")).toBeDefined();
    expect(editor(wrapper, "sheet-current-hp").get("button").attributes("disabled")).toBeDefined();
    await saveValue(wrapper, "sheet-current-mp", "30");
    await saveValue(wrapper, "sheet-current-san", "70");
    await saveValue(wrapper, "sheet-current-luck", "88");

    expect((await characterRepository.getById(character.id))?.data).toEqual({
      ...character,
      luck: 88,
      resources: { hp: { current: 8 }, mp: { current: 30 }, san: { current: 70 } },
    });
  });

  it("同一 workspace 切换到另一人物时同步全部 drafts，不保留上一个人物输入", async () => {
    const wrapper = await mountCharacter();
    const second: Character = {
      ...baseCharacter,
      id: "89500000-0000-4000-8000-000000000008",
      luck: 9,
      resources: { hp: { current: 3 }, mp: { current: 40 }, san: { current: 22 } },
    };
    await characterRepository.create(second);

    await wrapper.get("#sheet-current-hp").setValue("12");
    await useCharacterStore().loadById(second.id);
    await wrapper.vm.$nextTick();

    expect(wrapper.get<HTMLInputElement>("#sheet-current-hp").element.value).toBe("3");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-mp").element.value).toBe("40");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-san").element.value).toBe("22");
    expect(wrapper.get<HTMLInputElement>("#sheet-current-luck").element.value).toBe("9");
  });
});
