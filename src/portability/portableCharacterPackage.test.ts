import { describe, expect, it } from "vitest";

import { phase5aOccupationFixtures } from "../coc7/testing/occupationFixtures";
import type { Character } from "../coc7/types/character";
import type { OccupationDefinition } from "../coc7/types/occupation";
import type { CreationSession } from "../creation/types/creationSession";
import {
  createPortableCharacterFilename,
  createPortableCharacterPackage,
  parsePortableCharacterPackageText,
  PortableCharacterPackageError,
  serializePortableCharacterPackage,
} from "./portableCharacterPackage";
import { portableCharacterPackageV1Schema } from "./types/portableCharacterPackage";

const characterId = "90000000-0000-4000-8000-000000000009";
const backstoryId = "91000000-0000-4000-8000-000000000009";
const assetId = "92000000-0000-4000-8000-000000000009";
const possessionId = "93000000-0000-4000-8000-000000000009";
const weaponId = "94000000-0000-4000-8000-000000000009";
const specializationId = "95000000-0000-4000-8000-000000000009";
const customOccupationId = "96000000-0000-4000-8000-000000000009";
const customOccupationSnapshot: OccupationDefinition = {
  ...phase5aOccupationFixtures[0]!,
  id: customOccupationId,
  name: { zh: "便携自定义职业", en: "Portable Custom Occupation" },
};

const character: Character = {
  version: 1,
  id: characterId,
  name: "便携调查员",
  settingId: "standard",
  eraId: "classic-1920s",
  backstory: {
    entries: [{ id: backstoryId, category: "significant-people", text: "米斯卡托尼克导师" }],
    keyConnectionEntryId: backstoryId,
  },
  wealth: {
    cashMinorUnits: 1234,
    assetsMinorUnits: 5678,
    assetEntries: [{ id: assetId, description: "旧宅" }],
  },
  possessions: [{ id: possessionId, name: "笔记本" }],
  weapons: [{ id: weaponId, definitionId: "future-orphan-weapon", notes: "保留 orphan" }],
  skills: [{
    ref: { type: "custom", definitionId: "science", specializationId, displayName: "天文学" },
    currentValue: 61,
    improvementChecked: true,
  }],
  occupation: {
    kind: "custom",
    id: customOccupationId,
    displayNameSnapshot: customOccupationSnapshot.name,
  },
};

const session: CreationSession = {
  version: 1,
  characterId,
  settingId: "standard",
  currentStep: "possessions",
  draftAge: 28,
  attributes: {
    generationMethod: "manual",
    generation: { method: "manual", values: { STR: 50 } },
    ageAdjustment: { age: 28, reductionAllocation: {}, eduImprovements: [] },
    luck: { source: "manual", value: 55 },
  },
  occupation: {
    kind: "custom",
    selectedOccupationId: customOccupationId,
    definitionSnapshot: customOccupationSnapshot,
  },
  skills: {
    requirementSelections: [{
      requirementId: "appraise",
      refs: [{ type: "standard", definitionId: "appraise" }],
    }],
    allocations: [{
      ref: { type: "custom", definitionId: "science", specializationId, displayName: "天文学" },
      occupationPoints: 20,
      interestPoints: 5,
    }],
    keeperApprovals: [{
      reason: "custom-occupation",
      subjectId: customOccupationId,
      approved: true,
      note: "保留审批理由",
    }],
    existingSkillResolution: { action: "rebuild-structured", confirmed: true },
  },
  wealthInitialization: { eraId: "classic-1920s", creditRating: 40 },
};

function rawPackage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: "cocsheet-character",
    formatVersion: 1,
    exportedAt: 1_234_567_890_000,
    character,
    ...overrides,
  };
}

function expectPackageError(action: () => unknown, code: PortableCharacterPackageError["code"]): void {
  try {
    action();
    throw new Error("预期人物文件解析失败");
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(PortableCharacterPackageError);
    expect((error as PortableCharacterPackageError).code).toBe(code);
  }
}

describe("Portable Character Package v1", () => {
  it("接受 Character-only 的 strict v1 package", () => {
    const result = createPortableCharacterPackage(character, undefined, 123);
    expect(result).toEqual({
      format: "cocsheet-character",
      formatVersion: 1,
      exportedAt: 123,
      character,
    });
    expect(portableCharacterPackageV1Schema.safeParse(result).success).toBe(true);
  });

  it("接受 Character + 完整 CreationSession package", () => {
    expect(createPortableCharacterPackage(character, session, 456).creationSession).toEqual(session);
  });

  it("分别拒绝 wrong format、unsupported version 与 malformed JSON", () => {
    expectPackageError(() => parsePortableCharacterPackageText("{}"), "wrong-format");
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({ formatVersion: 2 }))),
      "unsupported-version",
    );
    expectPackageError(() => parsePortableCharacterPackageText("{not-json"), "malformed-json");
  });

  it("空文件与仅含 BOM 的文件有独立错误", () => {
    expectPackageError(() => parsePortableCharacterPackageText(""), "empty-file");
    expectPackageError(() => parsePortableCharacterPackageText("\uFEFF  \n"), "empty-file");
  });

  it("分别拒绝非法 Character 与非法 CreationSession", () => {
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({ character: { id: "bad" } }))),
      "invalid-character",
    );
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({ creationSession: { version: 1 } }))),
      "invalid-creation-session",
    );
  });

  it("拒绝 Character / Session ID mismatch", () => {
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({
        creationSession: { ...session, characterId: "96000000-0000-4000-8000-000000000009" },
      }))),
      "character-session-id-mismatch",
    );
  });

  it("拒绝 Character / Session Setting mismatch", () => {
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({
        creationSession: { ...session, settingId: "gaslight" },
      }))),
      "character-session-setting-mismatch",
    );
  });

  it("top-level strict 且 exportedAt 只接受 nonnegative integer", () => {
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({ unexpected: true }))),
      "invalid-package",
    );
    expectPackageError(
      () => parsePortableCharacterPackageText(JSON.stringify(rawPackage({ exportedAt: -1 }))),
      "invalid-package",
    );
  });

  it("serialize → BOM-safe parse 完整 round-trip，并使用 2-space 与结尾 newline", () => {
    const portablePackage = createPortableCharacterPackage(character, session, 789);
    const text = serializePortableCharacterPackage(portablePackage);
    expect(text).toContain('\n  "format": "cocsheet-character"');
    expect(text.endsWith("\n")).toBe(true);
    expect(parsePortableCharacterPackageText(`\uFEFF${text}`)).toEqual(portablePackage);
  });

  it("保留 nested stable UUID、custom SkillRef 与 orphan weapon identity", () => {
    const parsed = parsePortableCharacterPackageText(
      serializePortableCharacterPackage(createPortableCharacterPackage(character, session, 789)),
    );
    expect(parsed.character.backstory?.keyConnectionEntryId).toBe(backstoryId);
    expect(parsed.character.wealth?.assetEntries[0]?.id).toBe(assetId);
    expect(parsed.character.possessions?.[0]?.id).toBe(possessionId);
    expect(parsed.character.weapons?.[0]).toEqual(character.weapons?.[0]);
    expect(parsed.character.skills?.[0]?.ref).toEqual(character.skills?.[0]?.ref);
    expect(parsed.character.occupation?.id).toBe(customOccupationId);
    expect(parsed.creationSession?.occupation?.definitionSnapshot).toEqual(customOccupationSnapshot);
    expect(parsed.creationSession?.skills).toEqual(session.skills);
  });

  it("legacy missing optional fields 与 non-Standard Character 保持原样", () => {
    const legacy: Character = {
      version: 1,
      id: "97000000-0000-4000-8000-000000000009",
      name: "Legacy",
      settingId: "regency",
    };
    const parsed = parsePortableCharacterPackageText(
      serializePortableCharacterPackage(createPortableCharacterPackage(legacy, undefined, 1)),
    );
    expect(parsed.character).toEqual(legacy);
    expect(Object.hasOwn(parsed.character, "resources")).toBe(false);
    expect(Object.hasOwn(parsed.character, "wealth")).toBe(false);
    expect(Object.hasOwn(parsed.character, "weapons")).toBe(false);
  });

  it("生成 deterministic safe filename，不修改 Character.name", () => {
    const unsafe = { ...character, name: "  ../阿卡姆\\调查员:*?  " };
    expect(createPortableCharacterFilename(unsafe)).toBe(
      "COCSheet-..-阿卡姆-调查员--90000000.cocsheet.json",
    );
    expect(unsafe.name).toBe("  ../阿卡姆\\调查员:*?  ");
    expect(createPortableCharacterFilename({ ...character, name: "\u0000<>" })).toBe(
      "COCSheet---90000000.cocsheet.json",
    );
    expect(createPortableCharacterFilename({ ...character, name: "" })).toBe(
      "COCSheet-未命名调查员-90000000.cocsheet.json",
    );
  });
});
