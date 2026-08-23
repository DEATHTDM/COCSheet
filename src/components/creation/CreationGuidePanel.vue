<script setup lang="ts">
import { computed, useId } from "vue";

import {
  creationGuideSteps,
  getCreationGuideProgress,
  getCreationGuideStepContent,
} from "../../creation/presentation/creationGuide";
import type { CreationGuideReadiness } from "../../creation/presentation/creationGuideReadiness";
import type { CreationStepId } from "../../creation/types/creationSession";

const props = defineProps<{
  readonly currentStep: CreationStepId;
  readonly open: boolean;
  readonly readiness: CreationGuideReadiness;
}>();

const emit = defineEmits<{
  (event: "update:open", open: boolean): void;
}>();

const headingId = `creation-guide-${useId()}`;
const content = computed(() => getCreationGuideStepContent(props.currentStep));
const progress = computed(() => getCreationGuideProgress(props.currentStep));
const stepNumber = computed(() => creationGuideSteps.indexOf(props.currentStep) + 1);
const attentionCount = computed(() =>
  props.readiness.blockers.length + props.readiness.approvals.length,
);
const readinessSummary = computed(() => {
  if (props.currentStep === "review") {
    return "建卡流程已到检查阶段；请复核结果、返回修改或打开最终人物卡。";
  }
  switch (props.readiness.state) {
    case "needs-attention":
      return `还需要处理 ${attentionCount.value} 项。`;
    case "ready-with-warning":
      return "当前步骤没有阻断问题，但仍有需要显式确认的提醒。";
    case "ready":
      return "当前步骤已满足继续条件。";
  }
});

const progressStateLabels = {
  completed: "已走过",
  current: "当前",
  pending: "待进行",
} as const;
</script>

<template>
  <aside
    v-if="open"
    class="creation-guide-shell creation-guide-panel panel"
    :aria-labelledby="headingId"
  >
    <header class="creation-guide-heading">
      <div>
        <p class="eyebrow">新手引导 · 第 {{ stepNumber }} / {{ creationGuideSteps.length }} 步</p>
        <h2 :id="headingId">{{ content.title }}</h2>
      </div>
      <button
        class="button creation-guide-toggle"
        type="button"
        aria-expanded="true"
        :aria-controls="`${headingId}-content`"
        @click="emit('update:open', false)"
      >隐藏新手引导</button>
    </header>

    <div :id="`${headingId}-content`" class="creation-guide-content">
      <section class="creation-guide-progress" aria-label="建卡进度">
        <h3>七步进度</h3>
        <ol>
          <li
            v-for="item in progress"
            :key="item.step"
            :class="`creation-guide-progress--${item.state}`"
            :aria-current="item.state === 'current' ? 'step' : undefined"
            :data-progress-state="item.state"
          >
            <span>{{ item.label }}</span>
            <small>{{ progressStateLabels[item.state] }}</small>
          </li>
        </ol>
      </section>

      <p>{{ content.summary }}</p>
      <section aria-label="建议操作">
        <h3>建议先做</h3>
        <ol>
          <li v-for="action in content.actions" :key="action">{{ action }}</li>
        </ol>
      </section>
      <section class="creation-guide-completion" aria-label="完成提示">
        <h3>什么时候可以继续</h3>
        <p>{{ content.completionHint }}</p>
      </section>
      <section
        class="creation-guide-readiness"
        :class="`creation-guide-readiness--${readiness.state}`"
        aria-label="当前状态"
        aria-live="polite"
      >
        <h3>当前状态</h3>
        <p class="creation-guide-readiness-summary">{{ readinessSummary }}</p>
        <template v-if="readiness.blockers.length">
          <h4>仍需完成</h4>
          <ul class="creation-guide-readiness-list">
            <li v-for="message in readiness.blockers" :key="message">{{ message }}</li>
          </ul>
        </template>
        <template v-if="readiness.approvals.length">
          <h4>待批准事项</h4>
          <ul class="creation-guide-readiness-list creation-guide-readiness-approvals">
            <li v-for="message in readiness.approvals" :key="message">{{ message }}</li>
          </ul>
        </template>
        <template v-if="readiness.warnings.length">
          <h4>继续前提醒</h4>
          <ul class="creation-guide-readiness-list creation-guide-readiness-warnings">
            <li v-for="message in readiness.warnings" :key="message">{{ message }}</li>
          </ul>
        </template>
      </section>
    </div>
  </aside>
</template>
