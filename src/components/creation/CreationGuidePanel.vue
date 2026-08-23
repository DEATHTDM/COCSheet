<script setup lang="ts">
import { computed, useId } from "vue";

import {
  creationGuideSteps,
  getCreationGuideStepContent,
} from "../../creation/presentation/creationGuide";
import type { CreationStepId } from "../../creation/types/creationSession";

const props = defineProps<{
  readonly currentStep: CreationStepId;
  readonly open: boolean;
}>();

const emit = defineEmits<{
  (event: "update:open", open: boolean): void;
}>();

const headingId = `creation-guide-${useId()}`;
const content = computed(() => getCreationGuideStepContent(props.currentStep));
const stepNumber = computed(() => creationGuideSteps.indexOf(props.currentStep) + 1);
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
    </div>
  </aside>
</template>
