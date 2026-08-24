import type { Character } from "../coc7/types/character";
import { characterSchema } from "../coc7/types/character";
import type { CreationPreset } from "../creation/types/creationPreset";
import { creationPresetSchema } from "../creation/types/creationPreset";
import type { CreationSession } from "../creation/types/creationSession";
import { creationSessionSchema } from "../creation/types/creationSession";
import {
  portableLibraryPackageV1Schema,
  type PortableCharacterEntry,
  type PortableLibraryPackageV1,
} from "./types/portableLibraryPackage";

export type PortableLibraryPackageErrorCode =
  | "empty-file"
  | "malformed-json"
  | "wrong-format"
  | "unsupported-version"
  | "invalid-character"
  | "invalid-creation-session"
  | "invalid-kp-preset"
  | "character-session-id-mismatch"
  | "character-session-setting-mismatch"
  | "duplicate-character-id"
  | "duplicate-kp-preset-id"
  | "invalid-package";

export class PortableLibraryPackageError extends Error {
  constructor(
    readonly code: PortableLibraryPackageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PortableLibraryPackageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEntryIntegrity(character: Character, creationSession?: CreationSession): void {
  if (!creationSession) return;
  if (creationSession.characterId !== character.id) {
    throw new PortableLibraryPackageError(
      "character-session-id-mismatch",
      "完整备份中的人物卡与建卡进度不属于同一名调查员。",
    );
  }
  if (creationSession.settingId !== character.settingId) {
    throw new PortableLibraryPackageError(
      "character-session-setting-mismatch",
      "完整备份中的人物卡与建卡进度使用了不同的建卡环境。",
    );
  }
}

function validateUniqueIds(
  characterEntries: readonly PortableCharacterEntry[],
  kpPresets: readonly CreationPreset[],
): void {
  const characterIds = new Set<string>();
  for (const entry of characterEntries) {
    if (characterIds.has(entry.character.id)) {
      throw new PortableLibraryPackageError(
        "duplicate-character-id",
        "完整备份中重复包含了同一张调查员人物卡。",
      );
    }
    characterIds.add(entry.character.id);
  }

  const presetIds = new Set<string>();
  for (const preset of kpPresets) {
    if (presetIds.has(preset.id)) {
      throw new PortableLibraryPackageError(
        "duplicate-kp-preset-id",
        "完整备份中重复包含了同一个建卡预设。",
      );
    }
    presetIds.add(preset.id);
  }
}

function sortPackageArrays(
  characterEntries: readonly PortableCharacterEntry[],
  kpPresets: readonly CreationPreset[],
): { characterEntries: PortableCharacterEntry[]; kpPresets: CreationPreset[] } {
  return {
    characterEntries: [...characterEntries].sort((left, right) =>
      left.character.id.localeCompare(right.character.id)),
    kpPresets: [...kpPresets].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function createPortableLibraryPackage(
  characterEntries: readonly PortableCharacterEntry[],
  kpPresets: readonly CreationPreset[],
  exportedAt = Date.now(),
): PortableLibraryPackageV1 {
  const parsedEntries = characterEntries.map((entry) => {
    const character = characterSchema.safeParse(entry.character);
    if (!character.success) {
      throw new PortableLibraryPackageError("invalid-character", "完整备份中的调查员数据无效。");
    }
    const creationSession = entry.creationSession === undefined
      ? undefined
      : creationSessionSchema.safeParse(entry.creationSession);
    if (creationSession && !creationSession.success) {
      throw new PortableLibraryPackageError(
        "invalid-creation-session",
        "完整备份中的建卡进度数据无效。",
      );
    }
    validateEntryIntegrity(character.data, creationSession?.data);
    return {
      character: character.data,
      ...(creationSession?.data ? { creationSession: creationSession.data } : {}),
    };
  });
  const parsedPresets = kpPresets.map((preset) => {
    const parsed = creationPresetSchema.safeParse(preset);
    if (!parsed.success) {
      throw new PortableLibraryPackageError("invalid-kp-preset", "完整备份中的建卡预设数据无效。");
    }
    return parsed.data;
  });
  validateUniqueIds(parsedEntries, parsedPresets);
  const ordered = sortPackageArrays(parsedEntries, parsedPresets);
  const result = portableLibraryPackageV1Schema.safeParse({
    format: "cocsheet-library",
    formatVersion: 1,
    exportedAt,
    ...ordered,
  });
  if (!result.success) {
    throw new PortableLibraryPackageError("invalid-package", "完整备份文件结构无效。");
  }
  return result.data;
}

export function serializePortableLibraryPackage(
  portablePackage: PortableLibraryPackageV1,
): string {
  const parsed = portableLibraryPackageV1Schema.safeParse(portablePackage);
  if (!parsed.success) {
    throw new PortableLibraryPackageError("invalid-package", "完整备份文件结构无效。");
  }
  const ordered = sortPackageArrays(parsed.data.characterEntries, parsed.data.kpPresets);
  return `${JSON.stringify({ ...parsed.data, ...ordered }, null, 2)}\n`;
}

export function parsePortableLibraryPackageText(text: string): PortableLibraryPackageV1 {
  const normalizedText = text.replace(/^\uFEFF/, "");
  if (normalizedText.trim().length === 0) {
    throw new PortableLibraryPackageError("empty-file", "完整备份文件为空。");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(normalizedText) as unknown;
  } catch {
    throw new PortableLibraryPackageError("malformed-json", "文件不是合法 JSON。");
  }

  if (!isRecord(raw) || raw.format !== "cocsheet-library") {
    throw new PortableLibraryPackageError("wrong-format", "这不是 COCSheet 完整备份文件。");
  }
  if (raw.formatVersion !== 1) {
    throw new PortableLibraryPackageError(
      "unsupported-version",
      "这个完整备份使用了尚不支持的文件格式版本。",
    );
  }
  if (!Array.isArray(raw.characterEntries) || !Array.isArray(raw.kpPresets)) {
    throw new PortableLibraryPackageError("invalid-package", "完整备份文件结构无效。");
  }

  const characterEntries = raw.characterEntries.map((entry) => {
    if (!isRecord(entry)) {
      throw new PortableLibraryPackageError("invalid-package", "完整备份中的人物条目结构无效。");
    }
    const character = characterSchema.safeParse(entry.character);
    if (!character.success) {
      throw new PortableLibraryPackageError("invalid-character", "完整备份中的调查员数据无效。");
    }
    const hasCreationSession = Object.hasOwn(entry, "creationSession");
    const creationSession = hasCreationSession
      ? creationSessionSchema.safeParse(entry.creationSession)
      : undefined;
    if (creationSession && !creationSession.success) {
      throw new PortableLibraryPackageError(
        "invalid-creation-session",
        "完整备份中的建卡进度数据无效。",
      );
    }
    validateEntryIntegrity(character.data, creationSession?.data);
    return {
      character: character.data,
      ...(creationSession?.data ? { creationSession: creationSession.data } : {}),
    };
  });

  const kpPresets = raw.kpPresets.map((preset) => {
    const parsed = creationPresetSchema.safeParse(preset);
    if (!parsed.success) {
      throw new PortableLibraryPackageError("invalid-kp-preset", "完整备份中的建卡预设数据无效。");
    }
    return parsed.data;
  });
  validateUniqueIds(characterEntries, kpPresets);

  const result = portableLibraryPackageV1Schema.safeParse(raw);
  if (!result.success) {
    throw new PortableLibraryPackageError("invalid-package", "完整备份文件结构无效。");
  }
  return result.data;
}

export function createPortableLibraryFilename(exportedAt: number): string {
  const stamp = new Date(exportedAt).toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `COCSheet-Library-${stamp}.cocsheet-backup.json`;
}
