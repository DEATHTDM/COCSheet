import { z } from "zod";

import { occupationDefinitionSchema } from "../../coc7/types/occupation";
import { skillRefSchema } from "../../coc7/types/skill";
import { stableMachineIdSchema } from "../../coc7/types/skill";

export const approvalReasonIds = [
  "occupation-definition",
  "preset-occupation-policy",
  "custom-occupation",
  "credit-rating-override",
  "cthulhu-mythos-allocation",
  "skill-creation-point-policy",
  "fuzzy-requirement",
  "occupation-skill-replacement",
] as const;

export const approvalReasonIdSchema = z.enum(approvalReasonIds);

export const keeperApprovalGrantSchema = z
  .object({
    reason: approvalReasonIdSchema,
    subjectId: z.string().trim().min(1).optional(),
    approved: z.literal(true),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export const creditRatingOverrideSchema = z
  .object({
    occupationId: z.union([stableMachineIdSchema, z.string().uuid()]),
    approved: z.literal(true),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const occupationRequirementSelectionSchema = z
  .object({
    requirementId: stableMachineIdSchema,
    refs: z.array(skillRefSchema),
  })
  .strict();

export const skillAllocationSchema = z
  .object({
    ref: skillRefSchema,
    occupationPoints: z.number().int().nonnegative(),
    interestPoints: z.number().int().nonnegative(),
  })
  .strict();

function getPersistedSkillRefKey(ref: z.infer<typeof skillRefSchema>): string {
  if (ref.type === "standard") return `skill:${ref.definitionId}`;
  return `skill:${ref.definitionId}:${ref.type}:${ref.specializationId}`;
}

export const skillCreationStateSchema = z
  .object({
    requirementSelections: z.array(occupationRequirementSelectionSchema),
    allocations: z.array(skillAllocationSchema),
    occupationSkillReplacement: z.object({
      policyId: stableMachineIdSchema,
      targetRequirementId: stableMachineIdSchema,
    }).strict().optional(),
    creditRatingOverride: creditRatingOverrideSchema.optional(),
    keeperApprovals: z.array(keeperApprovalGrantSchema),
    existingSkillResolution: z.object({
      action: z.literal("rebuild-structured"),
      confirmed: z.literal(true),
    }).strict().optional(),
  })
  .strict()
  .superRefine((state, context) => {
    const requirements = new Set<string>();
    state.requirementSelections.forEach((selection, index) => {
      if (requirements.has(selection.requirementId)) {
        context.addIssue({
          code: "custom",
          message: `重复的 requirement selection：${selection.requirementId}`,
          path: ["requirementSelections", index, "requirementId"],
        });
      }
      requirements.add(selection.requirementId);
    });

    const allocationKeys = new Set<string>();
    state.allocations.forEach((allocation, index) => {
      const key = getPersistedSkillRefKey(allocation.ref);
      if (allocationKeys.has(key)) {
        context.addIssue({
          code: "custom",
          message: `重复的技能分配行：${key}`,
          path: ["allocations", index, "ref"],
        });
      }
      allocationKeys.add(key);
    });

    const approvalKeys = new Set<string>();
    state.keeperApprovals.forEach((approval, index) => {
      const key = `${approval.reason}:${approval.subjectId ?? ""}`;
      if (approvalKeys.has(key)) {
        context.addIssue({
          code: "custom",
          message: `重复的 Keeper approval：${key}`,
          path: ["keeperApprovals", index],
        });
      }
      approvalKeys.add(key);
    });
  });

const catalogOccupationSelectionSchema = z
  .object({
    kind: z.literal("catalog"),
    selectedOccupationId: stableMachineIdSchema,
    definitionSnapshot: occupationDefinitionSchema,
  })
  .strict()
  .refine((selection) => selection.selectedOccupationId === selection.definitionSnapshot.id, {
    message: "目录职业 ID 与定义快照不一致",
    path: ["definitionSnapshot", "id"],
  });

const customOccupationSelectionSchema = z
  .object({
    kind: z.literal("custom"),
    selectedOccupationId: z.string().uuid(),
    definitionSnapshot: occupationDefinitionSchema,
  })
  .strict()
  .refine((selection) => selection.selectedOccupationId === selection.definitionSnapshot.id, {
    message: "自定义职业 ID 与定义快照不一致",
    path: ["definitionSnapshot", "id"],
  });

export const occupationSelectionSchema = z.discriminatedUnion("kind", [
  catalogOccupationSelectionSchema,
  customOccupationSelectionSchema,
]);

export type ApprovalReasonId = z.infer<typeof approvalReasonIdSchema>;
export type KeeperApprovalGrant = z.infer<typeof keeperApprovalGrantSchema>;
export type CreditRatingOverride = z.infer<typeof creditRatingOverrideSchema>;
export type OccupationRequirementSelection = z.infer<typeof occupationRequirementSelectionSchema>;
export type SkillAllocation = z.infer<typeof skillAllocationSchema>;
export type SkillCreationState = z.infer<typeof skillCreationStateSchema>;
export type OccupationSelection = z.infer<typeof occupationSelectionSchema>;
