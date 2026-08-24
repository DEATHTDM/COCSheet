import { describe, expect, it } from "vitest";

import { createDiagnosticReport, sanitizeDiagnosticRoute } from "./diagnostics";

const metadata = {
  version: "0.1.0",
  buildSha: "abcdef1234567890",
  shortBuildSha: "abcdef123456",
};

describe("privacy-safe diagnostics", () => {
  it("removes every query and never includes a shared Preset token", () => {
    const token = "1.secret-share-token";
    expect(sanitizeDiagnosticRoute(`#/create?kp=${token}&other=value`)).toBe("/create");
    expect(createDiagnosticReport({
      routePath: `/create?kp=${token}`,
      metadata,
      now: new Date("2026-08-24T00:00:00.000Z"),
      navigatorInfo: { userAgent: "Test Browser", language: "zh-CN" },
    })).not.toContain(token);
  });

  it("normalizes Character and Preset UUID routes", () => {
    const uuid = "12345678-1234-4123-8123-123456789abc";
    expect(sanitizeDiagnosticRoute(`/characters/${uuid}/sheet?tab=skills`))
      .toBe("/characters/:id/sheet");
    expect(sanitizeDiagnosticRoute(`/characters/${uuid}`)).toBe("/characters/:id");
    expect(sanitizeDiagnosticRoute(`/kp/presets/${uuid}`)).toBe("/kp/presets/:id");
  });

  it("contains only runtime metadata and sanitized route information", () => {
    const report = createDiagnosticReport({
      routePath: "/characters/private-id/print",
      metadata,
      now: new Date("2026-08-24T00:00:00.000Z"),
      navigatorInfo: { userAgent: "Browser/1", language: "zh-CN" },
      errorCount: 2,
    });
    expect(report).toContain("COCSheet version: 0.1.0");
    expect(report).toContain("Build SHA: abcdef1234567890");
    expect(report).toContain("Route: /characters/:id/print");
    expect(report).not.toContain("private-id");
    expect(report).not.toMatch(/CreationSession|Preset payload|IndexedDB/u);
  });
});
