import type { Character } from "../coc7/types/character";
import { characterSchema } from "../coc7/types/character";
import type { CreationSession } from "../creation/types/creationSession";
import { creationSessionSchema } from "../creation/types/creationSession";
import {
  portableCharacterPackageV1Schema,
  type PortableCharacterPackageV1,
} from "./types/portableCharacterPackage";

export type PortableCharacterPackageErrorCode =
  | "empty-file"
  | "malformed-json"
  | "wrong-format"
  | "unsupported-version"
  | "invalid-character"
  | "invalid-creation-session"
  | "character-session-id-mismatch"
  | "character-session-setting-mismatch"
  | "invalid-package";

export class PortableCharacterPackageError extends Error {
  constructor(
    readonly code: PortableCharacterPackageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PortableCharacterPackageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateIntegrity(character: Character, creationSession?: CreationSession): void {
  if (!creationSession) return;
  if (creationSession.characterId !== character.id) {
    throw new PortableCharacterPackageError(
      "character-session-id-mismatch",
      "人物文件中的调查员与建卡会话 ID 不一致。",
    );
  }
  if (creationSession.settingId !== character.settingId) {
    throw new PortableCharacterPackageError(
      "character-session-setting-mismatch",
      "人物文件中的调查员与建卡会话 Setting 不一致。",
    );
  }
}

export function createPortableCharacterPackage(
  character: Character,
  creationSession?: CreationSession,
  exportedAt = Date.now(),
): PortableCharacterPackageV1 {
  const parsedCharacter = characterSchema.safeParse(character);
  if (!parsedCharacter.success) {
    throw new PortableCharacterPackageError("invalid-character", "调查员数据无效。");
  }
  const parsedSession = creationSession === undefined
    ? undefined
    : creationSessionSchema.safeParse(creationSession);
  if (parsedSession && !parsedSession.success) {
    throw new PortableCharacterPackageError("invalid-creation-session", "建卡会话数据无效。");
  }
  const session = parsedSession?.data;
  validateIntegrity(parsedCharacter.data, session);

  const result = portableCharacterPackageV1Schema.safeParse({
    format: "cocsheet-character",
    formatVersion: 1,
    exportedAt,
    character: parsedCharacter.data,
    ...(session ? { creationSession: session } : {}),
  });
  if (!result.success) {
    throw new PortableCharacterPackageError("invalid-package", "人物文件结构无效。");
  }
  return result.data;
}

export function serializePortableCharacterPackage(
  portablePackage: PortableCharacterPackageV1,
): string {
  const parsed = portableCharacterPackageV1Schema.safeParse(portablePackage);
  if (!parsed.success) {
    throw new PortableCharacterPackageError("invalid-package", "人物文件结构无效。");
  }
  return `${JSON.stringify(parsed.data, null, 2)}\n`;
}

export function parsePortableCharacterPackageText(text: string): PortableCharacterPackageV1 {
  const normalizedText = text.replace(/^\uFEFF/, "");
  if (normalizedText.trim().length === 0) {
    throw new PortableCharacterPackageError("empty-file", "人物文件为空。");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(normalizedText) as unknown;
  } catch {
    throw new PortableCharacterPackageError("malformed-json", "文件不是合法 JSON。");
  }

  if (!isRecord(raw) || raw.format !== "cocsheet-character") {
    throw new PortableCharacterPackageError("wrong-format", "这不是 COCSheet 人物文件。");
  }
  if (raw.formatVersion !== 1) {
    throw new PortableCharacterPackageError(
      "unsupported-version",
      "当前版本 COCSheet 无法导入该人物文件版本。",
    );
  }

  const parsedCharacter = characterSchema.safeParse(raw.character);
  if (!parsedCharacter.success) {
    throw new PortableCharacterPackageError("invalid-character", "调查员数据无效。");
  }
  const hasCreationSession = Object.hasOwn(raw, "creationSession");
  const parsedSession = hasCreationSession
    ? creationSessionSchema.safeParse(raw.creationSession)
    : undefined;
  if (parsedSession && !parsedSession.success) {
    throw new PortableCharacterPackageError("invalid-creation-session", "建卡会话数据无效。");
  }
  validateIntegrity(parsedCharacter.data, parsedSession?.data);

  const result = portableCharacterPackageV1Schema.safeParse(raw);
  if (!result.success) {
    throw new PortableCharacterPackageError("invalid-package", "人物文件结构无效。");
  }
  return result.data;
}

export function createPortableCharacterFilename(character: Character): string {
  const sanitizedName = character.name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 60)
    .replace(/[. ]+$/g, "");
  const displayName = sanitizedName || "未命名调查员";
  return `COCSheet-${displayName}-${character.id.slice(0, 8)}.cocsheet.json`;
}
