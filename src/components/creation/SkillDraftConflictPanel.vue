<script setup lang="ts">
import { computed, ref } from "vue";

import type { Character } from "../../coc7/types/character";
import { getStaleOccupationDraftErrors } from "../../creation/presentation/skillDraftConflictPresentation";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly character: Character }>();
const creationStore = useCreationStore();
const busyAction = ref("");
const actionError = ref("");

const skillState = computed(() => creationStore.current?.data.skills);
const plan = computed(() => creationStore.getSkillFinalizePlan(props.character));
const manualSkillCount = computed(() => props.character.skills?.length ?? 0);
const rebuildConfirmed = computed(() =>
  skillState.value?.existingSkillResolution?.action === "rebuild-structured" &&
  skillState.value.existingSkillResolution.confirmed,
);
const hasManualConflict = computed(() => manualSkillCount.value > 0 && !rebuildConfirmed.value);
const staleDraftErrors = computed(() => getStaleOccupationDraftErrors(plan.value.errors));
const hasConflict = computed(() => hasManualConflict.value || staleDraftErrors.value.length > 0);

async function confirmStructuredRebuild(): Promise<void> {
  busyAction.value = "manual-rebuild";
  actionError.value = "";
  try {
    await creationStore.confirmStructuredSkillRebuild(props.character);
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "保存结构化技能重建确认失败。";
  } finally {
    busyAction.value = "";
  }
}

async function resetOccupationDraft(): Promise<void> {
  const confirmed = window.confirm([
    "将重置职业相关草稿：",
    "- 清空职业 requirement selections",
    "- 清空职业点",
    "- 清除 replacement",
    "- 清除 Credit Rating override",
    "- 清除 occupation-scoped approvals",
    "",
    "兴趣技能及兴趣点会保留；仍适用于技能本身的 creation-policy approvals 也会保留。",
  ].join("\n"));
  if (!confirmed) return;

  busyAction.value = "occupation-reset";
  actionError.value = "";
  try {
    await creationStore.resetCurrentOccupationAllocation();
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "重置职业相关草稿失败。";
  } finally {
    busyAction.value = "";
  }
}
</script>

<template>
  <section v-if="hasConflict" class="panel form-stack skill-draft-conflict-panel" role="alert">
    <div>
      <p class="eyebrow">技能草稿冲突</p>
      <h2>需要明确处理的旧数据</h2>
    </div>

    <section v-if="hasManualConflict" class="skill-draft-conflict-card">
      <h3>此调查员已经存在手动技能数据。</h3>
      <p>当前已有技能数量：<strong>{{ manualSkillCount }}</strong></p>
      <p>继续结构化技能建卡后，只有在最终完成技能时才会用结构化结果重建 Character.skills。</p>
      <p>
        若要保留现有手动技能，请不要确认重建；现有 Character.skills 不会被修改。
      </p>
      <button
        class="button"
        type="button"
        :disabled="busyAction !== ''"
        @click="confirmStructuredRebuild"
      >{{ busyAction === 'manual-rebuild' ? '正在保存……' : '确认使用结构化技能重建' }}</button>
    </section>

    <section v-if="staleDraftErrors.length > 0" class="skill-draft-conflict-card">
      <h3>检测到上一个职业或旧选择留下的职业技能草稿。</h3>
      <ul class="allocation-issue-list">
        <li v-for="(issue, index) in staleDraftErrors" :key="`${issue.code}:${index}`">
          {{ issue.message }}
        </li>
      </ul>
      <p>
        重置会清空职业选择、职业点、replacement、信用评级例外与职业范围批准；兴趣技能及兴趣点会保留。
      </p>
      <button
        class="button danger"
        type="button"
        :disabled="busyAction !== ''"
        @click="resetOccupationDraft"
      >{{ busyAction === 'occupation-reset' ? '正在重置……' : '重置职业相关草稿（保留兴趣技能点）' }}</button>
    </section>

    <p v-if="actionError" class="error-message">{{ actionError }}</p>
  </section>
</template>
