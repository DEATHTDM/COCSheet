<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useCharacterStore } from "../../app/stores/characterStore";
import type { ApprovalRequirement } from "../../coc7/rules/occupationSkills";
import type { Character } from "../../coc7/types/character";
import { useCreationStore } from "../../creation/stores/creationStore";
import {
  formatPlayerFacingSkillApproval,
  formatPlayerFacingSkillIssue,
} from "../../creation/presentation/creationGuideReadiness";
import type { ApprovalReasonId, KeeperApprovalGrant } from "../../creation/types/skillCreation";

const props = defineProps<{ readonly character: Character }>();
const creationStore = useCreationStore();
const characterStore = useCharacterStore();
const approvalNotes = ref<Record<string, string>>({});
const warningAcknowledged = ref(false);
const busyAction = ref("");
const actionError = ref("");

const reasonLabels: Readonly<Record<ApprovalReasonId, string>> = {
  "occupation-definition": "职业确认",
  "preset-occupation-policy": "建卡预设职业确认",
  "custom-occupation": "自定义职业确认",
  "credit-rating-override": "信用评级范围例外",
  "cthulhu-mythos-allocation": "克苏鲁神话创建期点数确认",
  "skill-creation-point-policy": "技能创建期点数确认",
  "fuzzy-requirement": "开放式本职技能确认",
  "occupation-skill-replacement": "本职技能替换确认",
};

const session = computed(() => creationStore.current?.data);
const state = computed(() => session.value?.skills);
const plan = computed(() => creationStore.getSkillFinalizePlan(props.character));
const currentCreditRatingOverride = computed(() => {
  const override = state.value?.creditRatingOverride;
  return override?.occupationId === session.value?.occupation?.selectedOccupationId
    ? override
    : undefined;
});
const canComplete = computed(() =>
  plan.value.errors.length === 0 &&
  plan.value.approvals.length === 0 &&
  (plan.value.warnings.length === 0 || warningAcknowledged.value),
);

watch(
  () => plan.value.warnings.map((warning) => `${warning.code}:${warning.message}`).join("|"),
  () => {
    warningAcknowledged.value = false;
  },
);

function approvalKey(approval: {
  readonly reason: ApprovalReasonId;
  readonly subjectId?: string | undefined;
}): string {
  return `${approval.reason}:${approval.subjectId ?? ""}`;
}

function approvalLabel(reason: ApprovalReasonId): string {
  return reasonLabels[reason];
}

async function approve(approval: ApprovalRequirement): Promise<void> {
  const key = approvalKey(approval);
  busyAction.value = `approve:${key}`;
  actionError.value = "";
  try {
    if (approval.reason === "credit-rating-override") {
      await creationStore.approveCreditRatingOverride(props.character, approvalNotes.value[key]);
    } else {
      await creationStore.approvePendingSkillApproval(
        props.character,
        approval,
        approvalNotes.value[key],
      );
    }
    delete approvalNotes.value[key];
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "保存守秘人确认失败。";
  } finally {
    busyAction.value = "";
  }
}

async function revoke(grant: KeeperApprovalGrant): Promise<void> {
  const key = approvalKey(grant);
  busyAction.value = `revoke:${key}`;
  actionError.value = "";
  try {
    await creationStore.revokeKeeperApproval(grant.reason, grant.subjectId);
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "撤销守秘人确认失败。";
  } finally {
    busyAction.value = "";
  }
}

async function revokeCreditRatingOverride(): Promise<void> {
  busyAction.value = "revoke:credit-rating";
  actionError.value = "";
  try {
    await creationStore.revokeCurrentCreditRatingOverride();
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "撤销信用评级例外失败。";
  } finally {
    busyAction.value = "";
  }
}

async function complete(): Promise<void> {
  busyAction.value = "complete";
  actionError.value = "";
  try {
    await creationStore.completeSkills(props.character, warningAcknowledged.value);
    const reloaded = await characterStore.loadById(props.character.id);
    if (!reloaded) throw new Error("技能已保存，但重新读取调查员失败");
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "完成技能建卡失败。";
  } finally {
    busyAction.value = "";
  }
}
</script>

<template>
  <section class="panel form-stack skill-finalization-panel">
    <div>
      <p class="eyebrow">守秘人确认</p>
      <h2>检查并完成技能</h2>
      <p>这里会列出尚需完成、提醒与需要守秘人确认的项目。</p>
    </div>

    <section v-if="plan.errors.length > 0" class="finalization-block errors" role="alert">
      <h3>尚需完成</h3>
      <ul class="allocation-issue-list">
        <li v-for="(issue, index) in plan.errors" :key="`${issue.code}:${index}`">
          {{ formatPlayerFacingSkillIssue(issue) }}
        </li>
      </ul>
      <p><strong>请先修正以上问题，才能完成技能建卡。</strong></p>
    </section>

    <section v-if="plan.approvals.length > 0" class="finalization-block approvals">
      <h3>待守秘人确认</h3>
      <div class="approval-card-list">
        <article
          v-for="approval in plan.approvals"
          :key="approvalKey(approval)"
          class="approval-card"
        >
          <div>
            <strong>{{ approvalLabel(approval.reason) }}</strong>
            <p>{{ formatPlayerFacingSkillApproval(approval) }}</p>
          </div>
          <label class="field compact-field">
            <span>{{ approval.reason === 'credit-rating-override' ? '确认理由（可选）' : '确认备注（可选）' }}</span>
            <input
              v-model="approvalNotes[approvalKey(approval)]"
              type="text"
              autocomplete="off"
            />
          </label>
          <button
            class="button"
            type="button"
            :disabled="busyAction !== ''"
            @click="approve(approval)"
          >守秘人确认</button>
        </article>
      </div>
    </section>

    <section v-if="state?.keeperApprovals.length" class="finalization-block">
      <h3>已保存的守秘人确认</h3>
      <div class="saved-approval-list">
        <article
          v-for="grant in state.keeperApprovals"
          :key="approvalKey(grant)"
          class="saved-approval-row"
        >
          <div>
            <strong>{{ approvalLabel(grant.reason) }}</strong>
            <small v-if="grant.note">备注：{{ grant.note }}</small>
          </div>
          <button
            class="button compact-button danger"
            type="button"
            :disabled="busyAction !== ''"
            @click="revoke(grant)"
          >撤销记录</button>
        </article>
      </div>
    </section>

    <section v-if="currentCreditRatingOverride" class="finalization-block">
      <h3>当前职业的信用评级例外</h3>
      <p>
        守秘人已确认当前职业超出信用评级范围。
        <span v-if="currentCreditRatingOverride.reason">理由：{{ currentCreditRatingOverride.reason }}</span>
      </p>
      <button
        class="button compact-button danger"
        type="button"
        :disabled="busyAction !== ''"
        @click="revokeCreditRatingOverride"
      >撤销信用评级例外</button>
    </section>

    <section v-if="plan.warnings.length > 0" class="finalization-block warnings">
      <h3>完成前确认</h3>
      <ul class="allocation-warning-list">
        <li v-for="(warning, index) in plan.warnings" :key="`${warning.code}:${index}`">
          {{ formatPlayerFacingSkillIssue(warning) }}
        </li>
      </ul>
      <label class="warning-acknowledgement">
        <input v-model="warningAcknowledged" type="checkbox" />
        <span>我确认保留当前分配，并放弃未使用的技能点。</span>
      </label>
    </section>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>
    <button
      class="button primary"
      type="button"
      :disabled="!canComplete || busyAction !== ''"
      @click="complete"
    >{{ busyAction === 'complete' ? '正在保存……' : '完成技能并进入背景' }}</button>
  </section>
</template>
