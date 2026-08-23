import type { FinalizeSkillAllocationResult } from "../../coc7/rules/occupationSkills";

export type CreationGuideReadinessState =
  | "needs-attention"
  | "ready"
  | "ready-with-warning";

export interface CreationGuideReadiness {
  readonly state: CreationGuideReadinessState;
  readonly blockers: readonly string[];
  readonly approvals: readonly string[];
  readonly warnings: readonly string[];
}

export interface CreationGuideReadinessInput {
  readonly blockers?: readonly string[];
  readonly approvals?: readonly string[];
  readonly warnings?: readonly string[];
}

function normalizeMessages(messages: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...new Set(
    (messages ?? []).map((message) => message.trim()).filter(Boolean),
  )]);
}

export function createCreationGuideReadiness(
  input: CreationGuideReadinessInput = {},
): CreationGuideReadiness {
  const blockers = normalizeMessages(input.blockers);
  const approvals = normalizeMessages(input.approvals);
  const warnings = normalizeMessages(input.warnings);
  const state: CreationGuideReadinessState = blockers.length > 0 || approvals.length > 0
    ? "needs-attention"
    : warnings.length > 0
      ? "ready-with-warning"
      : "ready";
  return Object.freeze({ state, blockers, approvals, warnings });
}

export function createSkillCreationGuideReadiness(
  plan: Pick<FinalizeSkillAllocationResult, "errors" | "approvals" | "warnings">,
): CreationGuideReadiness {
  return createCreationGuideReadiness({
    blockers: plan.errors.map((issue) => issue.message),
    approvals: plan.approvals.map((approval) => approval.message),
    warnings: plan.warnings.map((issue) => issue.message),
  });
}
