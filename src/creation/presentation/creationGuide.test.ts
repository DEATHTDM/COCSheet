import { describe, expect, it } from "vitest";

import type { CreationStepId } from "../types/creationSession";
import {
  creationGuideSteps,
  getCreationGuideStepContent,
} from "./creationGuide";

const expectedSteps: readonly CreationStepId[] = [
  "basic-info",
  "attributes",
  "occupation",
  "skills",
  "background",
  "possessions",
  "review",
];

describe("creation guide presentation metadata", () => {
  it("exhaustively covers the seven CreationStep values with actionable content", () => {
    expect(creationGuideSteps).toEqual(expectedSteps);

    for (const step of expectedSteps) {
      const content = getCreationGuideStepContent(step, "standard");
      expect(content.step).toBe(step);
      expect(content.title.trim()).not.toBe("");
      expect(content.summary.trim()).not.toBe("");
      expect(content.actions.length).toBeGreaterThan(0);
      expect(content.actions.every((action) => action.trim().length > 0)).toBe(true);
      expect(content.completionHint.trim()).not.toBe("");
    }
  });

  it("is deterministic and does not mutate shared metadata", () => {
    const first = getCreationGuideStepContent("attributes", "standard");
    const snapshot = structuredClone(first);
    const second = getCreationGuideStepContent("attributes", "standard");

    expect(second).toEqual(first);
    expect(first).toEqual(snapshot);
  });

  it("uses neutral non-Standard guidance without Standard catalog or wealth fallback", () => {
    for (const settingId of [
      "gaslight",
      "down-darker-trails",
      "dark-ages",
      "regency",
    ] as const) {
      const attributes = getCreationGuideStepContent("attributes", settingId);
      const occupation = getCreationGuideStepContent("occupation", settingId);
      const skills = getCreationGuideStepContent("skills", settingId);
      const possessions = getCreationGuideStepContent("possessions", settingId);
      const combined = [attributes, occupation, skills, possessions]
        .flatMap((content) => [
          content.summary,
          ...content.actions,
          content.completionHint,
          content.settingNotice ?? "",
        ])
        .join(" ");

      expect(combined).toContain("不会");
      expect(combined).toContain("Standard");
      expect(combined).not.toContain("正资产需要至少一条资产构成说明");
      expect(combined).not.toContain("分配职业点与兴趣点，并留意最终值预览");
    }
  });

  it("rejects an unknown runtime step instead of falling back", () => {
    expect(() => getCreationGuideStepContent("unknown" as CreationStepId, "standard"))
      .toThrow("未知建卡步骤");
  });
});
