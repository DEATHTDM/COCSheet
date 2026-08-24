import type {
  ApprovalRequirement,
  FinalizeSkillAllocationResult,
  SkillAllocationIssue,
} from "../../coc7/rules/occupationSkills";

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
    blockers: plan.errors.map(formatPlayerFacingSkillIssue),
    approvals: plan.approvals.map(formatPlayerFacingSkillApproval),
    warnings: plan.warnings.map(formatPlayerFacingSkillIssue),
  });
}

export function formatPlayerFacingSkillMessage(message: string): string {
  return message
    .replaceAll("最终 Credit Rating", "最终信用评级")
    .replaceAll("Credit Rating", "信用评级")
    .replaceAll("职业技能点", "本职技能点")
    .replaceAll("职业点", "本职技能点")
    .replaceAll("兴趣点", "兴趣技能点")
    .replaceAll("Keeper", "守秘人")
    .replaceAll("Preset", "建卡预设")
    .replaceAll("requirement selection", "本职技能选择")
    .replaceAll("requirement", "本职技能需求")
    .replaceAll("selector", "选择条件")
    .replaceAll("replacement", "替换");
}

export function formatPlayerFacingSkillIssue(issue: SkillAllocationIssue): string {
  switch (issue.code) {
    case "missing-requirement-selection":
      return "还有本职技能需求尚未完成。";
    case "stale-requirement-selection":
      return "职业变更后仍有旧的本职技能选择需要重置或调整。";
    case "requirement-cardinality":
    case "selector-mismatch":
    case "duplicate-skill-selection":
      return "有一项本职技能选择不符合当前职业要求。";
    case "invalid-occupation-skill-replacement":
      return "本职技能替换与当前职业不匹配，请重新选择。";
    default:
      return formatPlayerFacingSkillMessage(issue.message);
  }
}

export function formatPlayerFacingSkillApproval(approval: ApprovalRequirement): string {
  switch (approval.reason) {
    case "occupation-definition":
      return "该职业需要守秘人确认。";
    case "preset-occupation-policy":
      return "当前建卡预设要求守秘人确认该职业。";
    case "custom-occupation":
      return "该自定义职业需要守秘人确认。";
    case "credit-rating-override":
      return formatPlayerFacingSkillMessage(approval.message);
    case "cthulhu-mythos-allocation":
    case "skill-creation-point-policy":
      return "该技能的创建期点数需要守秘人确认。";
    case "fuzzy-requirement":
      return "有一项开放式本职技能选择需要守秘人确认。";
    case "occupation-skill-replacement":
      return "本职技能替换需要守秘人确认。";
  }
}
