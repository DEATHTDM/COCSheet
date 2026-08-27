import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import type { CreationStepId } from "../../creation/types/creationSession";
import type { CharacterRecord } from "../../db/records";
import {
  presentCharacterLibrary,
  type CharacterLibraryOptions,
  type CharacterLibrarySortMode,
  type CharacterLibraryStatusFilter,
} from "./characterLibraryPresentation";

const ids = {
  alpha: "10000000-0000-4000-8000-000000000001",
  beta: "20000000-0000-4000-8000-000000000002",
  gamma: "30000000-0000-4000-8000-000000000003",
} as const;

function makeRecord(
  id: string,
  name: string,
  updatedAt: number,
  data: Partial<Character> = {},
): CharacterRecord {
  const character: Character = {
    version: 1,
    id,
    name,
    settingId: data.settingId ?? "standard",
    ...data,
  };
  return {
    id,
    version: 1,
    name,
    settingId: character.settingId,
    createdAt: 1,
    updatedAt,
    data: character,
  };
}

function present(
  records: readonly CharacterRecord[],
  options: Partial<CharacterLibraryOptions> = {},
  sessionSteps: Readonly<Partial<Record<string, CreationStepId>>> = {},
) {
  return presentCharacterLibrary(records, sessionSteps, {
    query: options.query ?? "",
    statusFilter: options.statusFilter ?? "all",
    sortMode: options.sortMode ?? "updated-desc",
  });
}

function names(result: ReturnType<typeof present>): string[] {
  return result.items.map((item) => item.record.name);
}

describe("character library presentation", () => {
  it("returns every record for an empty query", () => {
    const records = [makeRecord(ids.alpha, "甲", 1), makeRecord(ids.beta, "乙", 2)];
    expect(present(records).visibleCount).toBe(2);
  });

  it("trims the search query", () => {
    const records = [makeRecord(ids.alpha, "阿卡姆记者", 1)];
    expect(names(present(records, { query: "  阿卡姆  " }))).toEqual(["阿卡姆记者"]);
  });

  it("matches English without case sensitivity", () => {
    const records = [makeRecord(ids.alpha, "Harvey Walters", 1)];
    expect(names(present(records, { query: "hARVEY" }))).toEqual(["Harvey Walters"]);
  });

  it("matches a Chinese name substring", () => {
    const records = [
      makeRecord(ids.alpha, "林若雪", 1),
      makeRecord(ids.beta, "周明", 2),
    ];
    expect(names(present(records, { query: "若雪" }))).toEqual(["林若雪"]);
  });

  it("matches the occupation Chinese display-name snapshot", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1, {
      occupation: {
        kind: "catalog",
        id: "journalist",
        displayNameSnapshot: { zh: "记者", en: "Journalist" },
      },
    })];
    expect(names(present(records, { query: "记者" }))).toEqual(["林若雪"]);
  });

  it("matches the occupation English display-name snapshot", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1, {
      occupation: {
        kind: "catalog",
        id: "journalist",
        displayNameSnapshot: { zh: "记者", en: "Journalist" },
      },
    })];
    expect(names(present(records, { query: "JOURNALIST" }))).toEqual(["林若雪"]);
  });

  it("matches residence", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1, { residence: "阿卡姆大学街" })];
    expect(names(present(records, { query: "大学街" }))).toEqual(["林若雪"]);
  });

  it("matches birthplace", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1, { birthplace: "波士顿" })];
    expect(names(present(records, { query: "波士" }))).toEqual(["林若雪"]);
  });

  it("does not match a Character UUID", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1)];
    expect(present(records, { query: ids.alpha }).visibleCount).toBe(0);
  });

  it("does not match an occupation machine ID", () => {
    const records = [makeRecord(ids.alpha, "林若雪", 1, {
      occupation: {
        kind: "catalog",
        id: "secret-machine-id",
        displayNameSnapshot: { zh: "记者", en: "Journalist" },
      },
    })];
    expect(present(records, { query: "secret-machine-id" }).visibleCount).toBe(0);
  });

  it("filters complete creation sessions", () => {
    const records = [makeRecord(ids.alpha, "完成", 1), makeRecord(ids.beta, "未完成", 2)];
    expect(names(present(records, { statusFilter: "complete" }, {
      [ids.alpha]: "review",
      [ids.beta]: "skills",
    }))).toEqual(["完成"]);
  });

  it("filters incomplete creation sessions", () => {
    const records = [makeRecord(ids.alpha, "完成", 1), makeRecord(ids.beta, "未完成", 2)];
    expect(names(present(records, { statusFilter: "incomplete" }, {
      [ids.alpha]: "review",
      [ids.beta]: "skills",
    }))).toEqual(["未完成"]);
  });

  it("filters Characters that have no CreationSession", () => {
    const records = [makeRecord(ids.alpha, "无会话", 1), makeRecord(ids.beta, "有会话", 2)];
    expect(names(present(records, { statusFilter: "missing-session" }, {
      [ids.beta]: "basic-info",
    }))).toEqual(["无会话"]);
  });

  it("keeps every status when the filter is all", () => {
    const records = [
      makeRecord(ids.alpha, "完成", 3),
      makeRecord(ids.beta, "未完成", 2),
      makeRecord(ids.gamma, "无会话", 1),
    ];
    expect(present(records, { statusFilter: "all" }, {
      [ids.alpha]: "review",
      [ids.beta]: "skills",
    }).visibleCount).toBe(3);
  });

  it("keeps historical Setting compatibility independent from creation status", () => {
    const historical = makeRecord(ids.alpha, "历史调查员", 1, { settingId: "gaslight" });
    const result = present([historical], { statusFilter: "complete" }, { [ids.alpha]: "review" });
    expect(result.items[0]).toMatchObject({
      creationStatus: "complete",
      record: { settingId: "gaslight" },
    });
  });

  it("sorts by updatedAt descending", () => {
    const records = [makeRecord(ids.alpha, "较早", 1), makeRecord(ids.beta, "较晚", 2)];
    expect(names(present(records, { sortMode: "updated-desc" }))).toEqual(["较晚", "较早"]);
  });

  it("sorts by updatedAt ascending", () => {
    const records = [makeRecord(ids.alpha, "较早", 1), makeRecord(ids.beta, "较晚", 2)];
    expect(names(present(records, { sortMode: "updated-asc" }))).toEqual(["较早", "较晚"]);
  });

  it("sorts names with the zh-CN collator", () => {
    const records = [
      makeRecord(ids.alpha, "周明", 1),
      makeRecord(ids.beta, "林若雪", 2),
      makeRecord(ids.gamma, "陈安", 3),
    ];
    const expected = records
      .map((record) => record.name)
      .sort(new Intl.Collator("zh-CN", { usage: "sort", sensitivity: "base", numeric: true }).compare);
    expect(names(present(records, { sortMode: "name" }))).toEqual(expected);
  });

  it.each<CharacterLibrarySortMode>(["updated-desc", "updated-asc", "name"])(
    "uses record ID as a deterministic tie-break for %s",
    (sortMode) => {
      const records = [
        makeRecord(ids.beta, "同名", 1),
        makeRecord(ids.alpha, "同名", 1),
      ];
      expect(present(records, { sortMode }).items.map((item) => item.record.id))
        .toEqual([ids.alpha, ids.beta]);
    },
  );

  it("does not mutate the input record order", () => {
    const records = [makeRecord(ids.alpha, "较早", 1), makeRecord(ids.beta, "较晚", 2)];
    const original = [...records];
    present(records, { sortMode: "updated-desc" });
    expect(records).toEqual(original);
    expect(records[0]).toBe(original[0]);
  });

  it("combines query, status filter, and sort", () => {
    const records = [
      makeRecord(ids.alpha, "记者甲", 3),
      makeRecord(ids.beta, "记者乙", 1),
      makeRecord(ids.gamma, "医生", 2),
    ];
    expect(names(present(records, {
      query: "记者",
      statusFilter: "incomplete",
      sortMode: "updated-asc",
    }, {
      [ids.alpha]: "skills",
      [ids.beta]: "occupation",
      [ids.gamma]: "occupation",
    }))).toEqual(["记者乙", "记者甲"]);
  });

  it("reports total and visible counts plus normalized active-filter state", () => {
    const records = [makeRecord(ids.alpha, "记者", 1), makeRecord(ids.beta, "医生", 2)];
    expect(present(records, { query: "  记者 " })).toMatchObject({
      totalCount: 2,
      visibleCount: 1,
      hasActiveFilters: true,
    });
    expect(present(records, { query: "   " })).toMatchObject({
      totalCount: 2,
      visibleCount: 2,
      hasActiveFilters: false,
    });
  });

  it.each<CharacterLibraryStatusFilter>(["all", "complete", "incomplete", "missing-session"])(
    "accepts the %s status filter without changing the record objects",
    (statusFilter) => {
      const record = makeRecord(ids.alpha, "调查员", 1);
      present([record], { statusFilter });
      expect(record.data.name).toBe("调查员");
    },
  );
});
