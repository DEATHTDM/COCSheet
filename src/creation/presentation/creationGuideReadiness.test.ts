import { describe, expect, it } from "vitest";

import {
  createCreationGuideReadiness,
  createSkillCreationGuideReadiness,
} from "./creationGuideReadiness";

describe("creation Guide readiness presentation", () => {
  it("keeps blockers, approvals, and warnings structurally distinct", () => {
    expect(createSkillCreationGuideReadiness({
      errors: [{ code: "missing-requirement-selection", message: "缺少职业技能选择" }],
      approvals: [{
        reason: "cthulhu-mythos-allocation",
        message: "克苏鲁神话点数需要 KP 批准",
      }],
      warnings: [{ code: "unused-interest-points", message: "仍有未使用的兴趣点" }],
    })).toEqual({
      state: "needs-attention",
      blockers: ["缺少职业技能选择"],
      approvals: ["克苏鲁神话点数需要 KP 批准"],
      warnings: ["仍有未使用的兴趣点"],
    });
  });

  it("uses ready-with-warning only when the real plan has no blockers or approvals", () => {
    expect(createSkillCreationGuideReadiness({
      errors: [],
      approvals: [],
      warnings: [{ code: "unused-occupation-points", message: "仍有未使用的职业点" }],
    })).toEqual({
      state: "ready-with-warning",
      blockers: [],
      approvals: [],
      warnings: ["仍有未使用的职业点"],
    });

    expect(createSkillCreationGuideReadiness({
      errors: [],
      approvals: [],
      warnings: [],
    })).toEqual({ state: "ready", blockers: [], approvals: [], warnings: [] });
  });

  it("performs only stable presentation cleanup", () => {
    expect(createCreationGuideReadiness({
      blockers: [" 相同问题 ", "", "相同问题", "另一个问题"],
    })).toEqual({
      state: "needs-attention",
      blockers: ["相同问题", "另一个问题"],
      approvals: [],
      warnings: [],
    });
  });
});
