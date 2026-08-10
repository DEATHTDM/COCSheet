import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { characteristicIds } from "../../coc7/types/attribute";
import { db } from "../../db/database";
import { creationSessionRepository } from "../../db/repositories/creationSessionRepository";
import { useCreationStore } from "./creationStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setActivePinia(createPinia());
});

afterEach(async () => {
  await db.delete();
});

describe("Manual 未完成状态", () => {
  it("从空输入开始，填满八项后才生成 Base", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.chooseGenerationMethod("manual");
    expect(store.current?.data.attributes?.generation).toEqual({ method: "manual", values: {} });

    for (const id of characteristicIds.slice(0, 7)) await store.setEnteredValue(id, 50);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toBeUndefined();

    await store.setEnteredValue("EDU", 60);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toEqual({
      STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 60,
    });
  });

  it("刷新后可恢复尚未填完的 Manual 输入", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.chooseGenerationMethod("manual");
    await store.setEnteredValue("STR", 55);
    await store.setEnteredValue("CON", 60);
    await store.setEnteredValue("SIZ", 65);

    setActivePinia(createPinia());
    const restored = useCreationStore();
    await restored.loadByCharacterId(characterId);
    const generation = restored.current?.data.attributes?.generation;
    if (generation?.method !== "manual") throw new Error("未恢复 Manual 状态");
    expect(generation?.values).toEqual({ STR: 55, CON: 60, SIZ: 65 });
    expect(generation?.baseCharacteristics).toBeUndefined();
  });
});

describe("Point Buy 未完成状态", () => {
  it("从最低合法分配开始，精确达到总点数后才生成 Base", async () => {
    const store = useCreationStore();
    await store.start("standard");
    await store.chooseGenerationMethod("point-buy");
    const initial = store.current?.data.attributes?.generation;
    if (initial?.method !== "point-buy") throw new Error("未初始化 Point Buy 状态");
    expect(initial?.values).toEqual({ STR: 15, CON: 15, SIZ: 40, DEX: 15, APP: 15, INT: 40, POW: 15, EDU: 15 });
    expect(initial?.baseCharacteristics).toBeUndefined();

    const completed = { STR: 50, CON: 50, SIZ: 60, DEX: 50, APP: 50, INT: 60, POW: 50, EDU: 90 } as const;
    for (const id of characteristicIds) await store.setEnteredValue(id, completed[id]);
    expect(store.current?.data.attributes?.generation.baseCharacteristics).toEqual(completed);
  });
});

describe("完成前语义校验", () => {
  it("拒绝被篡改的 EDU 历史与 rolled Luck", async () => {
    const store = useCreationStore();
    const characterId = await store.start("standard");
    await store.setAge(25);
    await store.chooseGenerationMethod("manual");
    for (const id of characteristicIds) await store.setEnteredValue(id, 50);

    const currentSession = store.current?.data;
    if (!currentSession?.attributes?.ageAdjustment) throw new Error("属性状态未初始化");
    await creationSessionRepository.update({
      ...currentSession,
      attributes: {
        ...currentSession.attributes,
        ageAdjustment: {
          ...currentSession.attributes.ageAdjustment,
          eduImprovements: [{ checkRoll: 70, eduBefore: 50, success: false, eduAfter: 50 }],
        },
        luck: {
          source: "rolled",
          rolls: [{ dice: [1, 2, 3], modifier: 0, total: 35 }],
          value: 35,
        },
      },
    });
    await store.loadByCharacterId(characterId);
    const errors = store.getCompletionErrors();
    expect(errors.some((error) => error.includes("成功状态"))).toBe(true);
    expect(errors.some((error) => error.includes("Luck 结果"))).toBe(true);
  });
});
