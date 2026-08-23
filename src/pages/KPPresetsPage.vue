<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { isSupportedSetting } from "../coc7/types/setting";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import type { KPPresetRecord } from "../db/records";
import { encodeKPPresetShareToken } from "../kp/presets/presetShare";
import { buildKPPresetShareUrl } from "../kp/presets/presetShareUrl";
import { usePresetStore } from "../kp/presets/presetStore";

const router = useRouter();
const presetStore = usePresetStore();
const generatingShareId = ref<string>();
const shareError = ref("");
const copyStatus = ref<"idle" | "success" | "error">("idle");
const currentShare = ref<{
  readonly presetId: string;
  readonly presetName: string;
  readonly url: string;
}>();

onMounted(() => {
  void presetStore.loadList();
});

async function createPreset(): Promise<void> {
  const record = await presetStore.createDefault();
  await router.push(`/kp/presets/${record.id}`);
}

async function removePreset(id: string, name: string): Promise<void> {
  if (window.confirm(`确定删除预设“${name}”吗？`)) {
    await presetStore.remove(id);
    if (currentShare.value?.presetId === id) currentShare.value = undefined;
  }
}

async function generateShare(record: KPPresetRecord): Promise<void> {
  generatingShareId.value = record.id;
  shareError.value = "";
  copyStatus.value = "idle";
  currentShare.value = undefined;
  try {
    const token = await encodeKPPresetShareToken(record.data);
    currentShare.value = {
      presetId: record.id,
      presetName: record.name,
      url: buildKPPresetShareUrl(token, router),
    };
  } catch (error: unknown) {
    shareError.value = error instanceof Error ? error.message : "生成预设分享链接失败。";
  } finally {
    generatingShareId.value = undefined;
  }
}

async function copyShareUrl(): Promise<void> {
  const share = currentShare.value;
  if (!share) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(share.url);
    copyStatus.value = "success";
  } catch {
    copyStatus.value = "error";
  }
}

function closeShare(): void {
  currentShare.value = undefined;
  copyStatus.value = "idle";
  shareError.value = "";
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div class="section-heading">
      <div>
        <p class="eyebrow">本地保存</p>
        <h1>KP 建卡预设</h1>
      </div>
      <button class="button primary" type="button" @click="createPreset">新建预设</button>
    </div>

    <p v-if="presetStore.records.length === 0" class="empty-state">暂无预设</p>
    <ul v-else class="record-list">
      <li v-for="record in presetStore.records" :key="record.id" class="record-card">
        <div>
          <strong>{{ record.name }}</strong>
          <p>{{ getHistoricalSettingLabel(record.data.settingId) }}</p>
          <p v-if="!isSupportedSetting(record.data.settingId)" class="warning-message">
            该建卡环境当前不再支持新建；历史预设保留为只读数据。
          </p>
        </div>
        <div class="actions">
          <RouterLink class="button" :to="`/kp/presets/${record.id}`">编辑</RouterLink>
          <button
            class="button"
            type="button"
            :disabled="generatingShareId !== undefined || !isSupportedSetting(record.data.settingId)"
            :aria-label="`生成“${record.name}”的分享链接`"
            @click="generateShare(record)"
          >
            {{ generatingShareId === record.id ? "生成中…" : "分享" }}
          </button>
          <button class="button danger" type="button" @click="removePreset(record.id, record.name)">
            删除
          </button>
        </div>
      </li>
    </ul>

    <p v-if="shareError" class="error-message" role="alert">{{ shareError }}</p>

    <section v-if="currentShare" class="panel form-stack preset-share-panel" aria-labelledby="preset-share-title">
      <div>
        <p class="eyebrow">零服务器分享</p>
        <h2 id="preset-share-title">分享“{{ currentShare.presetName }}”</h2>
      </div>
      <label class="field">
        <span>完整分享链接</span>
        <textarea
          class="preset-share-url"
          :value="currentShare.url"
          readonly
          rows="4"
          @focus="($event.target as HTMLTextAreaElement).select()"
        />
      </label>
      <p v-if="copyStatus === 'success'" class="success-message" role="status">链接已复制。</p>
      <p v-if="copyStatus === 'error'" class="error-message" role="alert">
        自动复制失败，请手动复制上方链接。
      </p>
      <div class="actions">
        <button class="button primary" type="button" @click="copyShareUrl">复制链接</button>
        <button class="button" type="button" @click="closeShare">关闭</button>
      </div>
    </section>
  </section>
</template>
