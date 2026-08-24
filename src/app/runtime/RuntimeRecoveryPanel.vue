<script setup lang="ts">
import { ref } from "vue";

import { issueChooserUrl } from "../releaseLinks";

const props = defineProps<{ readonly diagnosticReport: string }>();
const emit = defineEmits<{ home: []; reload: [] }>();
const copyStatus = ref<"idle" | "copied" | "manual">("idle");

async function copyDiagnostics(): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(props.diagnosticReport);
    copyStatus.value = "copied";
  } catch {
    copyStatus.value = "manual";
  }
}
</script>

<template>
  <section class="runtime-recovery panel page-stack" role="alert" aria-labelledby="runtime-error-title">
    <div>
      <p class="eyebrow">COCSheet 恢复</p>
      <h1 id="runtime-error-title">页面运行时遇到了问题</h1>
      <p>你可以重新载入页面，或先返回首页。这个恢复界面本身不会主动删除本地人物资料。</p>
    </div>
    <div class="actions">
      <button class="button primary" type="button" @click="emit('reload')">重新载入页面</button>
      <button class="button" type="button" @click="emit('home')">返回首页</button>
      <button class="button" type="button" @click="copyDiagnostics">复制诊断信息</button>
      <a class="button" :href="issueChooserUrl" target="_blank" rel="noopener noreferrer">在 GitHub 反馈问题</a>
    </div>
    <p v-if="copyStatus === 'copied'" class="success-message" role="status">诊断信息已复制。</p>
    <div v-else-if="copyStatus === 'manual'" class="form-stack">
      <p class="muted">浏览器未允许自动复制，请手工复制下面的诊断信息。</p>
      <label class="field">
        <span>诊断信息</span>
        <textarea :value="diagnosticReport" readonly rows="8" @focus="($event.currentTarget as HTMLTextAreaElement).select()" />
      </label>
    </div>
  </section>
</template>
