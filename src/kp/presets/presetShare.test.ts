// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreationPreset } from "../../creation/types/creationPreset";
import {
  decodeKPPresetShareToken,
  encodeKPPresetShareToken,
  KP_PRESET_SHARE_FORMAT,
  KP_PRESET_SHARE_FORMAT_VERSION,
  KPPresetShareError,
  MAX_KP_PRESET_SHARE_COMPRESSED_BYTES,
  MAX_KP_PRESET_SHARE_JSON_BYTES,
  MAX_KP_PRESET_SHARE_TOKEN_LENGTH,
  parseKPPresetShareEnvelope,
  parseKPPresetShareEnvelopeJson,
  serializeKPPresetShareEnvelope,
} from "./presetShare";

const fullPreset: CreationPreset = {
  version: 1,
  id: "b1000000-0000-4000-8000-000000000001",
  name: "古宅之谜：调查员预设",
  settingId: "standard",
  attributeGeneration: {
    allowedMethods: ["assign-roll", "point-buy", "manual"],
    multiRoll: { count: 5 },
    assignRoll: { intMin: 45, sizMin: 50 },
    pointBuy: { total: 480, min: 20, max: 85, intMin: 45, sizMin: 50 },
  },
  skillCaps: { occupation: 75, interest: 60, overall: 85 },
  skillLimits: {
    maxOccupationSkillFinalValue: 80,
    maxInterestOnlySkillFinalValue: 65,
    maxSkillFinalValue: 90,
  },
  occupationPolicy: {
    bannedOccupationIds: ["criminal-keeper-rulebook"],
    approvalRequiredOccupationIds: ["dilettante"],
  },
  allowCustomOccupation: "keeper-approval",
  age: { min: 21, max: 55 },
};

function expectShareCode(action: () => unknown, code: KPPresetShareError["code"]): void {
  try {
    action();
    throw new Error("Expected share error");
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(KPPresetShareError);
    expect((error as KPPresetShareError).code).toBe(code);
  }
}

async function expectAsyncShareCode(
  action: () => Promise<unknown>,
  code: KPPresetShareError["code"],
): Promise<void> {
  try {
    await action();
    throw new Error("Expected share error");
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(KPPresetShareError);
    expect((error as KPPresetShareError).code).toBe(code);
  }
}

async function gzipTokenForText(text: string): Promise<string> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  const writing = (async () => {
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
  })();
  const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  await writing;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `1.${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KP Preset Share Envelope v1", () => {
  it("round-trips the full normalized CreationPreset including Unicode and every optional field", () => {
    const json = serializeKPPresetShareEnvelope(fullPreset);
    const envelope = parseKPPresetShareEnvelopeJson(json);

    expect(envelope).toEqual({
      format: KP_PRESET_SHARE_FORMAT,
      formatVersion: KP_PRESET_SHARE_FORMAT_VERSION,
      preset: fullPreset,
    });
    expect(envelope.preset.name).toBe("古宅之谜：调查员预设");
    expect(envelope.preset.skillCaps).toEqual(fullPreset.skillCaps);
    expect(envelope.preset.skillLimits).toEqual(fullPreset.skillLimits);
    expect(envelope.preset.occupationPolicy).toEqual(fullPreset.occupationPolicy);
    expect(envelope.preset.age).toEqual(fullPreset.age);
    expect(json).not.toContain("updatedAt");
    expect(json).not.toContain("createdAt");
  });

  it("rejects strict top-level unknown fields and the wrong format", () => {
    expectShareCode(
      () => parseKPPresetShareEnvelope({
        format: KP_PRESET_SHARE_FORMAT,
        formatVersion: 1,
        preset: fullPreset,
        updatedAt: 123,
      }),
      "wrong-envelope-format",
    );
    expectShareCode(
      () => parseKPPresetShareEnvelope({
        format: "cocsheet-library",
        formatVersion: 1,
        preset: fullPreset,
      }),
      "wrong-envelope-format",
    );
  });

  it("rejects future envelope versions and invalid CreationPreset data", () => {
    expectShareCode(
      () => parseKPPresetShareEnvelope({
        format: KP_PRESET_SHARE_FORMAT,
        formatVersion: 2,
        preset: fullPreset,
      }),
      "unsupported-envelope-format-version",
    );
    expectShareCode(
      () => parseKPPresetShareEnvelope({
        format: KP_PRESET_SHARE_FORMAT,
        formatVersion: 1,
        preset: { ...fullPreset, settingId: "unknown" },
      }),
      "invalid-creation-preset",
    );
  });
});

describe("KP Preset Share Token v1", () => {
  it("round-trips gzip + unpadded base64url with a stable URL-safe wire shape", async () => {
    const token = await encodeKPPresetShareToken(fullPreset);

    expect(token).toMatch(/^1\.[A-Za-z0-9_-]+$/u);
    expect(token).not.toMatch(/[+/=]/u);
    await expect(decodeKPPresetShareToken(token)).resolves.toEqual(fullPreset);
  });

  it("rejects empty, unsupported-version, malformed base64url, and oversized tokens", async () => {
    await expectAsyncShareCode(() => decodeKPPresetShareToken(""), "empty-token");
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken("2.AAAA"),
      "unsupported-token-codec-version",
    );
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken("1.a+b"),
      "malformed-base64url",
    );
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken("1.A"),
      "malformed-base64url",
    );
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken(`1.${"A".repeat(MAX_KP_PRESET_SHARE_TOKEN_LENGTH)}`),
      "token-too-large",
    );
  });

  it("rejects compressed bytes over their independent bound before decompression", async () => {
    const bytes = new Uint8Array(MAX_KP_PRESET_SHARE_COMPRESSED_BYTES + 1);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
    const token = `1.${payload}`;

    expect(token.length).toBeLessThan(MAX_KP_PRESET_SHARE_TOKEN_LENGTH);
    await expectAsyncShareCode(() => decodeKPPresetShareToken(token), "token-too-large");
  });

  it("rejects corrupt gzip and malformed decompressed JSON", async () => {
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken("1.AAAA"),
      "decompression-failed",
    );
    const malformedJsonToken = await gzipTokenForText("not JSON");
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken(malformedJsonToken),
      "malformed-json",
    );
  });

  it("bounds decompression while reading instead of buffering an unlimited gzip result", async () => {
    const oversizedJsonToken = await gzipTokenForText(
      JSON.stringify({ padding: "x".repeat(MAX_KP_PRESET_SHARE_JSON_BYTES) }),
    );
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken(oversizedJsonToken),
      "decompressed-payload-too-large",
    );
  });

  it("rejects an oversized source preset before generating a URL", async () => {
    await expectAsyncShareCode(
      () => encodeKPPresetShareToken({
        ...fullPreset,
        name: "大".repeat(MAX_KP_PRESET_SHARE_JSON_BYTES),
      }),
      "preset-payload-too-large",
    );
  });

  it("reports missing CompressionStream and DecompressionStream as readable non-fatal errors", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    await expectAsyncShareCode(
      () => encodeKPPresetShareToken(fullPreset),
      "compression-unavailable",
    );
    vi.unstubAllGlobals();

    const token = await encodeKPPresetShareToken(fullPreset);
    vi.stubGlobal("DecompressionStream", undefined);
    await expectAsyncShareCode(
      () => decodeKPPresetShareToken(token),
      "decompression-unavailable",
    );
  });
});
