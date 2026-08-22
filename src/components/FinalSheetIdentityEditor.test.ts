// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";

import { useCharacterStore } from "../app/stores/characterStore";
import type { Character } from "../coc7/types/character";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import FinalSheetIdentityEditor from "./FinalSheetIdentityEditor.vue";

const legacyCharacter: Character = {
  version: 1,
  id: "81000000-0000-4000-8000-000000000008",
  name: "旧调查员",
  settingId: "standard",
  eraId: "classic-1920s",
  age: 35,
  occupation: {
    kind: "catalog",
    id: "accountant",
    displayNameSnapshot: { zh: "会计师", en: "Accountant" },
  },
};

const Harness = defineComponent({
  components: { FinalSheetIdentityEditor },
  setup() {
    return { characterStore: useCharacterStore() };
  },
  template: `<FinalSheetIdentityEditor v-if="characterStore.current" :character="characterStore.current.data" />`,
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

async function mountCharacter(character: Character = legacyCharacter): Promise<VueWrapper> {
  await characterRepository.create(character);
  await useCharacterStore().loadById(character.id);
  return mount(Harness);
}

describe("Final Sheet identity editor rendered interactions", () => {
  it("legacy 缺失身份只读打开零写入，并可显式补齐 name/details 后刷新保持", async () => {
    const wrapper = await mountCharacter();
    const updateSpy = vi.spyOn(characterRepository, "update");

    expect(wrapper.text()).toContain("旧调查员");
    expect(wrapper.text()).toContain("会计师");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(legacyCharacter.id))?.data.sex).toBeUndefined();

    await wrapper.get("button").trigger("click");
    await wrapper.get('input[name="name"]').setValue("  林若海  ");
    await wrapper.get('input[name="sex"]').setValue("  非二元  ");
    await wrapper.get('input[name="residence"]').setValue("  上海  ");
    await wrapper.get('input[name="birthplace"]').setValue("  杭州  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    await vi.waitFor(async () => {
      expect((await characterRepository.getById(legacyCharacter.id))?.data.name).toBe("  林若海  ");
    });

    const persisted = await characterRepository.getById(legacyCharacter.id);
    expect(persisted?.data).toMatchObject({
      name: "  林若海  ",
      sex: "非二元",
      residence: "上海",
      birthplace: "杭州",
    });
    expect(wrapper.text()).toContain("身份信息已保存");
    expect(wrapper.find("form").exists()).toBe(false);

    wrapper.unmount();
    setActivePinia(createPinia());
    expect((await useCharacterStore().loadById(legacyCharacter.id))?.data).toMatchObject({
      name: "  林若海  ",
      sex: "非二元",
      residence: "上海",
      birthplace: "杭州",
    });
  });

  it("取消不写入；空 details 显示既有 Store validation error", async () => {
    const wrapper = await mountCharacter({
      ...legacyCharacter,
      sex: "女性",
      residence: "北平",
      birthplace: "天津",
    });
    const updateSpy = vi.spyOn(characterRepository, "update");

    await wrapper.get("button").trigger("click");
    await wrapper.get('input[name="name"]').setValue("不应保存");
    const cancel = wrapper.findAll("button").find((button) => button.text() === "取消");
    if (!cancel) throw new Error("找不到取消按钮");
    await cancel.trigger("click");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(legacyCharacter.id))?.data.name).toBe("旧调查员");

    await wrapper.get("button").trigger("click");
    await wrapper.get('input[name="sex"]').setValue("   ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("性别、住所与出身地均不能为空");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
