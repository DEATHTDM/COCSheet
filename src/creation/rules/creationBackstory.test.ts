import { describe, expect, it } from "vitest";

import type { BackstoryCategoryId, BackstoryEntry, CharacterBackstory } from "../../coc7/types/character";
import { validateCreationBackstory } from "./creationBackstory";

function entry(category: BackstoryCategoryId, text = "背景"): BackstoryEntry {
  return { id: crypto.randomUUID(), category, text };
}

function withKey(entries: BackstoryEntry[], key = entries[0]?.id): CharacterBackstory {
  return { entries, ...(key ? { keyConnectionEntryId: key } : {}) };
}

describe("创建阶段背景验证", () => {
  it("2 条创建背景失败", () => {
    const entries = [entry("traits"), entry("personal-description")];
    const result = validateCreationBackstory(withKey(entries));
    expect(result.valid).toBe(false);
    expect(result.count).toBe(2);
    expect(result.errors.map((error) => error.code)).toContain("too-few-entries");
  });

  it("3 条创建背景加 key 成功，且不要求覆盖六个类别", () => {
    const entries = [entry("traits", "谨慎"), entry("traits", "固执"), entry("traits", "守时")];
    expect(validateCreationBackstory(withKey(entries))).toMatchObject({ valid: true, count: 3 });
  });

  it("6 条创建背景加 key 成功", () => {
    const entries = [
      entry("personal-description"),
      entry("ideology-beliefs"),
      entry("significant-people"),
      entry("meaningful-locations"),
      entry("treasured-possessions"),
      entry("traits"),
    ];
    expect(validateCreationBackstory(withKey(entries))).toMatchObject({ valid: true, count: 6 });
  });

  it("7 条创建背景失败", () => {
    const entries = Array.from({ length: 7 }, () => entry("traits"));
    const result = validateCreationBackstory(withKey(entries));
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("too-many-entries");
  });

  it("四个游戏期类别不计入创建阶段 3～6 条", () => {
    const creationEntries = [entry("traits"), entry("traits"), entry("traits")];
    const gameTimeEntries = [
      entry("injuries-scars"),
      entry("phobias-manias"),
      entry("arcane-tomes-spells-artifacts"),
      entry("encounters"),
    ];
    const result = validateCreationBackstory(withKey([...creationEntries, ...gameTimeEntries]));
    expect(result).toMatchObject({ valid: true, count: 3 });
    expect(result.creationEntries).toEqual(creationEntries);
  });

  it("游戏期类别不能作为初始 key connection", () => {
    const creationEntries = [entry("traits"), entry("traits"), entry("traits")];
    const encounter = entry("encounters");
    const result = validateCreationBackstory(withKey([...creationEntries, encounter], encounter.id));
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("key-connection-not-creation-entry");
  });

  it("缺少 key connection 时失败", () => {
    const result = validateCreationBackstory({
      entries: [entry("traits"), entry("traits"), entry("traits")],
    });
    expect(result.errors.map((error) => error.code)).toContain("missing-key-connection");
  });
});
