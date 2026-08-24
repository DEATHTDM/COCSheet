import { describe, expect, it } from "vitest";

import packageMetadata from "../../package.json";
import { buildMetadata, normalizeBuildSha, shortenBuildSha } from "./buildMetadata";

describe("build metadata", () => {
  it("uses package.json as the version source and a valid local fallback", () => {
    expect(buildMetadata.version).toBe(packageMetadata.version);
    expect(buildMetadata.buildSha).toBe("dev");
    expect(buildMetadata.shortBuildSha).toBe("dev");
  });

  it("normalizes and shortens an injected commit SHA", () => {
    const sha = normalizeBuildSha("ABCDEF1234567890ABCDEF1234567890ABCDEF12");
    expect(sha).toBe("abcdef1234567890abcdef1234567890abcdef12");
    expect(shortenBuildSha(sha)).toBe("abcdef123456");
    expect(normalizeBuildSha("synthetic-ref")).toBe("dev");
  });
});
