import { describe, expect, it } from "vitest";

import type { CreationStepId } from "../types/creationSession";
import {
  creationGuideSteps,
  getCreationGuideProgress,
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
      const content = getCreationGuideStepContent(step);
      expect(content.step).toBe(step);
      expect(content.label.trim()).not.toBe("");
      expect(content.title.trim()).not.toBe("");
      expect(content.summary.trim()).not.toBe("");
      expect(content.actions.length).toBeGreaterThan(0);
      expect(content.actions.every((action) => action.trim().length > 0)).toBe(true);
      expect(content.completionHint.trim()).not.toBe("");
    }
  });

  it("is deterministic and does not mutate shared metadata", () => {
    const first = getCreationGuideStepContent("attributes");
    const snapshot = structuredClone(first);
    const second = getCreationGuideStepContent("attributes");

    expect(second).toEqual(first);
    expect(first).toEqual(snapshot);
  });

  it("rejects an unknown runtime step instead of falling back", () => {
    expect(() => getCreationGuideStepContent("unknown" as CreationStepId))
      .toThrow("未知建卡步骤");
  });

  it("derives completed/current/pending progress only from currentStep order", () => {
    expect(getCreationGuideProgress("skills").map(({ step, state }) => ({ step, state })))
      .toEqual([
        { step: "basic-info", state: "completed" },
        { step: "attributes", state: "completed" },
        { step: "occupation", state: "completed" },
        { step: "skills", state: "current" },
        { step: "background", state: "pending" },
        { step: "possessions", state: "pending" },
        { step: "review", state: "pending" },
      ]);

    const returned = getCreationGuideProgress("occupation");
    expect(returned.find(({ step }) => step === "skills")?.state).toBe("pending");
    expect(Object.isFrozen(returned)).toBe(true);
    expect(returned.every(Object.isFrozen)).toBe(true);
  });
});
