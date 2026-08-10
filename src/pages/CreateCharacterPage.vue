<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useSettingStore } from "../app/stores/settingStore";
import type { SettingId } from "../coc7/types/setting";
import { useCreationStore } from "../creation/stores/creationStore";
import type { CreationPreset } from "../creation/types/creationPreset";
import { usePresetStore } from "../kp/presets/presetStore";

const router = useRouter();
const settingStore = useSettingStore();
const creationStore = useCreationStore();
const presetStore = usePresetStore();

onMounted(() => void presetStore.loadList());

async function chooseSetting(settingId: SettingId, preset?: CreationPreset): Promise<void> {
  const characterId = await creationStore.start(settingId, preset);
  await router.push(`/characters/${characterId}`);
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div>
      <p class="eyebrow">第一步</p>
      <h1>创建调查员</h1>
      <p>选择建卡环境；未选择 KP 预设时使用 Standard COC7 默认属性配置。</p>
    </div>

    <div class="setting-grid">
      <button
        v-for="setting in settingStore.settings"
        :key="setting.id"
        class="setting-card"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting(setting.id)"
      ><strong>{{ setting.name }}</strong></button>
    </div>

    <section v-if="presetStore.records.length" class="form-stack">
      <h2>或使用 KP 建卡预设</h2>
      <button
        v-for="record in presetStore.records"
        :key="record.id"
        class="setting-card preset-choice"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting(record.data.settingId, record.data)"
      >
        <strong>{{ record.name }}</strong>
        <small>{{ record.data.attributeGeneration.allowedMethods.length }} 种属性生成方式</small>
      </button>
    </section>
  </section>
</template>
