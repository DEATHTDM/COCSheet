import { describe, expect, it } from "vitest";

import type { Character } from "../coc7/types/character";
import type { CreationPreset } from "../creation/types/creationPreset";
import type { CreationSession } from "../creation/types/creationSession";
import {
  createPortableLibraryFilename,
  createPortableLibraryPackage,
  parsePortableLibraryPackageText,
  PortableLibraryPackageError,
  serializePortableLibraryPackage,
} from "./portableLibraryPackage";
import { portableLibraryPackageV1Schema } from "./types/portableLibraryPackage";

function makeCharacter(id: string, name = id): Character {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    possessions: [
      { id: "71000000-0000-4000-8000-000000000001", name: "第二项" },
      { id: "71000000-0000-4000-8000-000000000002", name: "第一项" },
    ],
    skills: [{
      ref: {
        type: "custom",
        definitionId: "science",
        specializationId: "72000000-0000-4000-8000-000000000001",
        displayName: "未来学",
      },
      currentValue: 42,
      improvementChecked: false,
    }],
    weapons: [{
      id: "73000000-0000-4000-8000-000000000001",
      definitionId: "orphan-weapon",
    }],
  };
}

function makeSession(character: Character, step: CreationSession["currentStep"] = "skills"): CreationSession {
  return {
    version: 1,
    characterId: character.id,
    settingId: character.settingId,
    currentStep: step,
    presetSnapshot: makePreset("74000000-0000-4000-8000-000000000001", "历史快照"),
  };
}

function makePreset(id: string, name = id): CreationPreset {
  return {
    version: 1,
    id,
    name,
    settingId: "standard",
    attributeGeneration: { allowedMethods: ["manual"] },
    allowCustomOccupation: "keeper-approval",
  };
}

function expectPackageError(action: () => unknown, code: PortableLibraryPackageError["code"]): void {
  try {
    action();
    throw new Error("预期完整备份解析失败");
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(PortableLibraryPackageError);
    expect((error as PortableLibraryPackageError).code).toBe(code);
  }
}

const characterA = makeCharacter("70000000-0000-4000-8000-000000000002", "A");
const characterB = makeCharacter("70000000-0000-4000-8000-000000000001", "B");
const presetA = makePreset("75000000-0000-4000-8000-000000000002", "Preset A");
const presetB = makePreset("75000000-0000-4000-8000-000000000001", "Preset B");

describe("Full Library Backup v1", () => {
  it("接受空资料库并生成独立 strict format", () => {
    const result = createPortableLibraryPackage([], [], 123);
    expect(result).toEqual({
      format: "cocsheet-library",
      formatVersion: 1,
      exportedAt: 123,
      characterEntries: [],
      kpPresets: [],
    });
    expect(portableLibraryPackageV1Schema.safeParse(result).success).toBe(true);
  });

  it("接受 Character-only、Character + Session、多人物与 global KP Presets", () => {
    const result = createPortableLibraryPackage([
      { character: characterA },
      { character: characterB, creationSession: makeSession(characterB, "review") },
    ], [presetA, presetB], 456);
    expect(result.characterEntries).toHaveLength(2);
    expect(result.characterEntries.find((entry) => entry.character.id === characterA.id))
      .not.toHaveProperty("creationSession");
    expect(result.characterEntries.find((entry) => entry.character.id === characterB.id)?.creationSession?.currentStep)
      .toBe("review");
    expect(result.kpPresets).toHaveLength(2);
    expect(serializePortableLibraryPackage(result)).not.toContain("creationExperienceMode");
  });

  it("分别拒绝空文件、malformed JSON、wrong format 与 unsupported version", () => {
    expectPackageError(() => parsePortableLibraryPackageText("\uFEFF \n"), "empty-file");
    expectPackageError(() => parsePortableLibraryPackageText("{broken"), "malformed-json");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      format: "cocsheet-character",
      formatVersion: 1,
    })), "wrong-format");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      format: "cocsheet-library",
      formatVersion: 2,
    })), "unsupported-version");
  });

  it("分别拒绝非法 Character、CreationSession 与 KPPreset", () => {
    const base = createPortableLibraryPackage([], [], 1);
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      characterEntries: [{ character: { id: "bad" } }],
    })), "invalid-character");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      characterEntries: [{ character: characterA, creationSession: { version: 1 } }],
    })), "invalid-creation-session");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      kpPresets: [{ version: 1, id: "bad" }],
    })), "invalid-kp-preset");
  });

  it("拒绝 Character / Session ID mismatch 与 Setting mismatch", () => {
    const base = createPortableLibraryPackage([], [], 1);
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      characterEntries: [{
        character: characterA,
        creationSession: { ...makeSession(characterA), characterId: characterB.id },
      }],
    })), "character-session-id-mismatch");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      characterEntries: [{
        character: characterA,
        creationSession: { ...makeSession(characterA), settingId: "gaslight" },
      }],
    })), "character-session-setting-mismatch");
  });

  it("拒绝 package 内重复 Character ID 与重复 global KPPreset ID", () => {
    expectPackageError(() => createPortableLibraryPackage([
      { character: characterA },
      { character: characterA, creationSession: makeSession(characterA) },
    ], [], 1), "duplicate-character-id");
    expectPackageError(() => createPortableLibraryPackage([], [presetA, presetA], 1), "duplicate-kp-preset-id");
  });

  it("top-level 与 entry 都 strict，exportedAt 必须是 nonnegative integer", () => {
    const base = createPortableLibraryPackage([{ character: characterA }], [], 1);
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({ ...base, extra: true })), "invalid-package");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({
      ...base,
      characterEntries: [{ character: characterA, extra: true }],
    })), "invalid-package");
    expectPackageError(() => parsePortableLibraryPackageText(JSON.stringify({ ...base, exportedAt: -1 })), "invalid-package");
  });

  it("serialize → BOM-safe parse 完整 round-trip，使用 2-space 与 trailing newline", () => {
    const backup = createPortableLibraryPackage(
      [{ character: characterA, creationSession: makeSession(characterA) }],
      [presetA],
      789,
    );
    const text = serializePortableLibraryPackage(backup);
    expect(text).toContain('\n  "format": "cocsheet-library"');
    expect(text.endsWith("\n")).toBe(true);
    expect(parsePortableLibraryPackageText(`\uFEFF${text}`)).toEqual(backup);
  });

  it("仅稳定排序外层数组，不改变 nested domain array 顺序", () => {
    const backup = createPortableLibraryPackage(
      [{ character: characterA }, { character: characterB }],
      [presetA, presetB],
      1,
    );
    expect(backup.characterEntries.map((entry) => entry.character.id)).toEqual([
      characterB.id,
      characterA.id,
    ]);
    expect(backup.kpPresets.map((preset) => preset.id)).toEqual([presetB.id, presetA.id]);
    expect(backup.characterEntries[1]?.character.possessions).toEqual(characterA.possessions);
  });

  it("Session presetSnapshot 与同 ID global KPPreset 合法且保持独立", () => {
    const session = makeSession(characterA);
    const snapshot = session.presetSnapshot;
    if (!snapshot) throw new Error("测试 Session 缺少 snapshot");
    const globalPreset = { ...snapshot, name: "当前全局版本" };
    const parsed = parsePortableLibraryPackageText(serializePortableLibraryPackage(
      createPortableLibraryPackage([{ character: characterA, creationSession: session }], [globalPreset], 1),
    ));
    expect(parsed.characterEntries[0]?.creationSession?.presetSnapshot?.name).toBe("历史快照");
    expect(parsed.kpPresets[0]?.name).toBe("当前全局版本");
  });

  it("生成 UTC、安全且明显区别于人物文件的 filename", () => {
    expect(createPortableLibraryFilename(Date.UTC(2026, 7, 23, 14, 20, 0))).toBe(
      "COCSheet-Library-20260823-142000.cocsheet-backup.json",
    );
  });
});
