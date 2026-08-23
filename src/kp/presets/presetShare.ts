import { z } from "zod";

import {
  creationPresetSchema,
  type CreationPreset,
} from "../../creation/types/creationPreset";

export const KP_PRESET_SHARE_FORMAT = "cocsheet-kp-preset-share";
export const KP_PRESET_SHARE_FORMAT_VERSION = 1;
export const KP_PRESET_SHARE_TOKEN_CODEC_VERSION = "1";
export const MAX_KP_PRESET_SHARE_TOKEN_LENGTH = 12_000;
export const MAX_KP_PRESET_SHARE_COMPRESSED_BYTES = 8 * 1024;
export const MAX_KP_PRESET_SHARE_JSON_BYTES = 64 * 1024;

export const kpPresetShareEnvelopeSchema = z
  .object({
    format: z.literal(KP_PRESET_SHARE_FORMAT),
    formatVersion: z.literal(KP_PRESET_SHARE_FORMAT_VERSION),
    preset: creationPresetSchema,
  })
  .strict();

export type KPPresetShareEnvelope = z.infer<typeof kpPresetShareEnvelopeSchema>;

export type KPPresetShareErrorCode =
  | "empty-token"
  | "unsupported-token-codec-version"
  | "malformed-base64url"
  | "token-too-large"
  | "compression-unavailable"
  | "compression-failed"
  | "preset-payload-too-large"
  | "decompression-unavailable"
  | "decompression-failed"
  | "decompressed-payload-too-large"
  | "malformed-json"
  | "wrong-envelope-format"
  | "unsupported-envelope-format-version"
  | "invalid-creation-preset";

const errorMessages: Readonly<Record<KPPresetShareErrorCode, string>> = {
  "empty-token": "分享链接缺少预设内容。",
  "unsupported-token-codec-version": "分享链接使用了当前不支持的编码版本。",
  "malformed-base64url": "分享链接的编码内容格式不正确。",
  "token-too-large": "分享链接内容过大。",
  "compression-unavailable": "当前浏览器不支持压缩预设分享链接。",
  "compression-failed": "生成压缩预设分享链接失败。",
  "preset-payload-too-large": "预设内容过大，无法生成分享链接。",
  "decompression-unavailable": "当前浏览器不支持读取压缩预设分享链接。",
  "decompression-failed": "共享预设的压缩内容已损坏。",
  "decompressed-payload-too-large": "共享预设解压后的内容过大。",
  "malformed-json": "共享预设不是有效的 JSON 数据。",
  "wrong-envelope-format": "共享预设的封装格式不正确。",
  "unsupported-envelope-format-version": "共享预设使用了当前不支持的格式版本。",
  "invalid-creation-preset": "共享内容不是有效的 KP 建卡预设。",
};

export class KPPresetShareError extends Error {
  readonly code: KPPresetShareErrorCode;

  constructor(code: KPPresetShareErrorCode, cause?: unknown) {
    super(errorMessages[code], cause === undefined ? undefined : { cause });
    this.name = "KPPresetShareError";
    this.code = code;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactEnvelopeKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === 3 &&
    keys[0] === "format" &&
    keys[1] === "formatVersion" &&
    keys[2] === "preset";
}

export function createKPPresetShareEnvelope(
  preset: CreationPreset,
): KPPresetShareEnvelope {
  const parsedPreset = creationPresetSchema.safeParse(preset);
  if (!parsedPreset.success) {
    throw new KPPresetShareError("invalid-creation-preset", parsedPreset.error);
  }
  return kpPresetShareEnvelopeSchema.parse({
    format: KP_PRESET_SHARE_FORMAT,
    formatVersion: KP_PRESET_SHARE_FORMAT_VERSION,
    preset: parsedPreset.data,
  });
}

export function parseKPPresetShareEnvelope(value: unknown): KPPresetShareEnvelope {
  if (!isPlainRecord(value) || !hasExactEnvelopeKeys(value)) {
    throw new KPPresetShareError("wrong-envelope-format");
  }
  if (value.format !== KP_PRESET_SHARE_FORMAT) {
    throw new KPPresetShareError("wrong-envelope-format");
  }
  if (value.formatVersion !== KP_PRESET_SHARE_FORMAT_VERSION) {
    throw new KPPresetShareError("unsupported-envelope-format-version");
  }
  const parsedPreset = creationPresetSchema.safeParse(value.preset);
  if (!parsedPreset.success) {
    throw new KPPresetShareError("invalid-creation-preset", parsedPreset.error);
  }
  return kpPresetShareEnvelopeSchema.parse({
    format: KP_PRESET_SHARE_FORMAT,
    formatVersion: KP_PRESET_SHARE_FORMAT_VERSION,
    preset: parsedPreset.data,
  });
}

export function serializeKPPresetShareEnvelope(preset: CreationPreset): string {
  return JSON.stringify(createKPPresetShareEnvelope(preset));
}

export function parseKPPresetShareEnvelopeJson(json: string): KPPresetShareEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch (error: unknown) {
    throw new KPPresetShareError("malformed-json", error);
  }
  return parseKPPresetShareEnvelope(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw new KPPresetShareError("malformed-base64url");
  }
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch (error: unknown) {
    throw new KPPresetShareError("malformed-base64url", error);
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== value) {
    throw new KPPresetShareError("malformed-base64url");
  }
  return bytes;
}

async function readStreamWithLimit(
  stream: ReadableStream<Uint8Array>,
  limit: number,
  sizeErrorCode: KPPresetShareErrorCode,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new KPPresetShareError(sizeErrorCode);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function runCompressionTransform(
  input: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  limit: number,
  sizeErrorCode: KPPresetShareErrorCode,
  failureErrorCode: KPPresetShareErrorCode,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  const ownedInput = new Uint8Array(input.byteLength);
  ownedInput.set(input);
  const writing = (async () => {
    await writer.write(ownedInput);
    await writer.close();
  })();
  try {
    const output = await readStreamWithLimit(transform.readable, limit, sizeErrorCode);
    await writing;
    return output;
  } catch (error: unknown) {
    await writer.abort(error).catch(() => undefined);
    await writing.catch(() => undefined);
    if (error instanceof KPPresetShareError) throw error;
    throw new KPPresetShareError(failureErrorCode, error);
  }
}

export async function encodeKPPresetShareToken(preset: CreationPreset): Promise<string> {
  if (typeof CompressionStream !== "function") {
    throw new KPPresetShareError("compression-unavailable");
  }
  const jsonBytes = new TextEncoder().encode(serializeKPPresetShareEnvelope(preset));
  if (jsonBytes.byteLength > MAX_KP_PRESET_SHARE_JSON_BYTES) {
    throw new KPPresetShareError("preset-payload-too-large");
  }
  let transform: CompressionStream;
  try {
    transform = new CompressionStream("gzip");
  } catch (error: unknown) {
    throw new KPPresetShareError("compression-unavailable", error);
  }
  const compressed = await runCompressionTransform(
    jsonBytes,
    transform,
    MAX_KP_PRESET_SHARE_COMPRESSED_BYTES,
    "token-too-large",
    "compression-failed",
  );
  const token = `${KP_PRESET_SHARE_TOKEN_CODEC_VERSION}.${bytesToBase64Url(compressed)}`;
  if (token.length > MAX_KP_PRESET_SHARE_TOKEN_LENGTH) {
    throw new KPPresetShareError("token-too-large");
  }
  return token;
}

export async function decodeKPPresetShareToken(token: string): Promise<CreationPreset> {
  if (token.length === 0) throw new KPPresetShareError("empty-token");
  if (token.length > MAX_KP_PRESET_SHARE_TOKEN_LENGTH) {
    throw new KPPresetShareError("token-too-large");
  }
  const separatorIndex = token.indexOf(".");
  if (separatorIndex < 1) throw new KPPresetShareError("malformed-base64url");
  const codecVersion = token.slice(0, separatorIndex);
  if (codecVersion !== KP_PRESET_SHARE_TOKEN_CODEC_VERSION) {
    throw new KPPresetShareError("unsupported-token-codec-version");
  }
  const compressed = base64UrlToBytes(token.slice(separatorIndex + 1));
  if (compressed.byteLength > MAX_KP_PRESET_SHARE_COMPRESSED_BYTES) {
    throw new KPPresetShareError("token-too-large");
  }
  if (typeof DecompressionStream !== "function") {
    throw new KPPresetShareError("decompression-unavailable");
  }
  let transform: DecompressionStream;
  try {
    transform = new DecompressionStream("gzip");
  } catch (error: unknown) {
    throw new KPPresetShareError("decompression-unavailable", error);
  }
  const jsonBytes = await runCompressionTransform(
    compressed,
    transform,
    MAX_KP_PRESET_SHARE_JSON_BYTES,
    "decompressed-payload-too-large",
    "decompression-failed",
  );
  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes);
  } catch (error: unknown) {
    throw new KPPresetShareError("malformed-json", error);
  }
  return parseKPPresetShareEnvelopeJson(json).preset;
}
