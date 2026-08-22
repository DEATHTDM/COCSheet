// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import type { Character } from "../coc7/types/character";
import { db } from "../db/database";
import { characterRepository } from "../db/repositories/characterRepository";
import { creationSessionRepository } from "../db/repositories/creationSessionRepository";
import FinalCharacterSheetPage from "./FinalCharacterSheetPage.vue";

const character: Character = {
  version: 1,
  id: "80000000-0000-4000-8000-000000000008",
  name: "Final Sheet Mythos",
  settingId: "standard",
  eraId: "modern",
  age: 30,
  characteristics: { STR: 50, CON: 60, SIZ: 70, DEX: 55, APP: 45, INT: 80, POW: 65, EDU: 75 },
  resources: { hp: { current: 10 }, mp: { current: 13 }, san: { current: 80 } },
  skills: [{
    ref: { type: "standard", definitionId: "cthulhu-mythos" },
    currentValue: 5,
    improvementChecked: false,
  }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

describe("FinalCharacterSheetPage rendered integrations", () => {
  it("缺失 wealth/possessions/weapons 的页面加载零写入并安全显示长期编辑入口", async () => {
    const legacy: Character = {
      version: 1,
      id: "8b000000-0000-4000-8000-000000000008",
      name: "Legacy Inventory",
      settingId: "standard",
    };
    await characterRepository.create(legacy);
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
      ],
    });
    await router.push(`/characters/${legacy.id}/sheet`);
    await router.isReady();
    const updateSpy = vi.spyOn(characterRepository, "update");

    const wrapper = mount(FinalCharacterSheetPage, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.text()).toContain("建立当前财富记录"));
    expect(wrapper.text()).toContain("打开页面不会自动生成空数组");
    expect(wrapper.text()).toContain("缺失字段不会在打开页面时自动生成");
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await characterRepository.getById(legacy.id))?.data).toEqual(legacy);
  });

  it("Final Sheet inventory mutation 只更新 Character，不改变 session step/provenance 或隐式联动 totals", async () => {
    const inventoryCharacter: Character = {
      ...character,
      id: "8c000000-0000-4000-8000-000000000008",
      eraId: "classic-1920s",
      wealth: { cashMinorUnits: 5_000, assetsMinorUnits: 100_000, assetEntries: [] },
      skills: [{
        ref: { type: "standard", definitionId: "credit-rating" },
        currentValue: 40,
        improvementChecked: false,
      }],
    };
    await characterRepository.create(inventoryCharacter);
    await creationSessionRepository.create({
      version: 1,
      characterId: inventoryCharacter.id,
      settingId: "standard",
      currentStep: "review",
      wealthInitialization: { eraId: "classic-1920s", creditRating: 40 },
    });
    const sessionBefore = await creationSessionRepository.getByCharacterId(inventoryCharacter.id);
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
      ],
    });
    await router.push(`/characters/${inventoryCharacter.id}/sheet`);
    await router.isReady();
    const wrapper = mount(FinalCharacterSheetPage, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.find('input[name="current-cash"]').exists()).toBe(true));

    await wrapper.get('input[name="current-cash"]').setValue("40.00");
    await wrapper.findAll(".final-money-editor")[0]!.trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(inventoryCharacter.id))?.data.wealth?.cashMinorUnits)
        .toBe(4_000);
    });

    await wrapper.get('input[placeholder="例如：波士顿公寓"]').setValue("公寓");
    const addAsset = wrapper.findAll("button").find((button) => button.text() === "添加资产");
    if (!addAsset) throw new Error("找不到资产添加按钮");
    await addAsset.trigger("click");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(inventoryCharacter.id))?.data.wealth?.assetEntries)
        .toHaveLength(1);
    });

    await wrapper.get('input[name="possession-name"]').setValue("绳索");
    await wrapper.get(".final-possessions-workspace form").trigger("submit");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(inventoryCharacter.id))?.data.possessions)
        .toHaveLength(1);
    });

    const bow = wrapper.get('[data-weapon-definition-id="bow"]');
    await bow.get("button").trigger("click");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(inventoryCharacter.id))?.data.weapons)
        .toHaveLength(1);
    });

    const persisted = await characterRepository.getById(inventoryCharacter.id);
    expect(persisted?.data.wealth).toMatchObject({
      cashMinorUnits: 4_000,
      assetsMinorUnits: 100_000,
    });
    expect(persisted?.data.wealth?.assetEntries).toHaveLength(1);
    expect(persisted?.data.possessions?.[0]?.name).toBe("绳索");
    expect(persisted?.data.weapons?.[0]?.definitionId).toBe("bow");
    expect(await creationSessionRepository.getByCharacterId(inventoryCharacter.id)).toEqual(sessionBefore);
  });

  it("确认 Mythos 提高后，Store 的原子 SAN clamp 立即同步回资源输入", async () => {
    await characterRepository.create(character);
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
      ],
    });
    await router.push(`/characters/${character.id}/sheet`);
    await router.isReady();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const wrapper = mount(FinalCharacterSheetPage, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.find('[data-skill-key="skill:cthulhu-mythos"]').exists()).toBe(true));
    const mythos = wrapper.find<HTMLInputElement>('[aria-label="克苏鲁神话 当前值"]');
    await mythos.setValue("60");
    await mythos.trigger("blur");
    await flushPromises();
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(character.id))?.data.resources?.san.current).toBe(39);
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find<HTMLInputElement>("#sheet-current-san").element.value).toBe("39");
    expect(wrapper.find('label[for="sheet-current-san"]').text()).toContain("/ 39");
    expect(wrapper.find<HTMLInputElement>('[aria-label="克苏鲁神话 当前值"]').element.value).toBe("60");
  });

  it("无 CreationSession 的 legacy Character 可从页面补齐身份与长期背景并刷新保持", async () => {
    const legacy: Character = {
      version: 1,
      id: "83000000-0000-4000-8000-000000000008",
      name: "Legacy Narrative",
      settingId: "standard",
    };
    await characterRepository.create(legacy);
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
      ],
    });
    await router.push(`/characters/${legacy.id}/sheet`);
    await router.isReady();
    let wrapper = mount(FinalCharacterSheetPage, { global: { plugins: [pinia, router] } });
    await vi.waitFor(() => expect(wrapper.text()).toContain("此人物没有建卡会话"));

    const editIdentity = wrapper.findAll("button").find((button) => button.text() === "编辑身份");
    if (!editIdentity) throw new Error("找不到编辑身份按钮");
    await editIdentity.trigger("click");
    await wrapper.get('input[name="name"]').setValue("长期叙事调查员");
    await wrapper.get('input[name="sex"]').setValue("女性");
    await wrapper.get('input[name="residence"]').setValue("上海");
    await wrapper.get('input[name="birthplace"]').setValue("苏州");
    await wrapper.get(".final-identity-form").trigger("submit");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(legacy.id))?.data.name).toBe("长期叙事调查员");
    });

    const injuries = wrapper.get('[data-backstory-category="injuries-scars"]');
    await injuries.get("textarea").setValue("左眉留下了一道旧疤");
    const add = injuries.findAll("button").find((button) => button.text() === "添加条目");
    if (!add) throw new Error("找不到添加背景按钮");
    await add.trigger("click");
    await vi.waitFor(async () => {
      expect((await characterRepository.getById(legacy.id))?.data.backstory?.entries[0])
        .toMatchObject({ category: "injuries-scars", text: "左眉留下了一道旧疤" });
    });

    wrapper.unmount();
    const refreshedPinia = createPinia();
    setActivePinia(refreshedPinia);
    const refreshedRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/characters/:id", component: { template: "<div />" } },
        { path: "/characters/:id/sheet", component: FinalCharacterSheetPage },
      ],
    });
    await refreshedRouter.push(`/characters/${legacy.id}/sheet`);
    await refreshedRouter.isReady();
    wrapper = mount(FinalCharacterSheetPage, {
      global: { plugins: [refreshedPinia, refreshedRouter] },
    });
    await vi.waitFor(() => expect(wrapper.get("h1").text()).toBe("长期叙事调查员"));
    expect(wrapper.text()).toContain("左眉留下了一道旧疤");
    expect(wrapper.text()).toContain("此人物没有建卡会话");
  });
});
