<script setup lang="ts">
import { useRouter } from "vue-router";

import { useSettingStore } from "../app/stores/settingStore";
import type { SettingId } from "../coc7/types/setting";
import { useCreationStore } from "../creation/stores/creationStore";

const router = useRouter();
const settingStore = useSettingStore();
const creationStore = useCreationStore();

async function chooseSetting(settingId: SettingId): Promise<void> {
  const characterId = await creationStore.start(settingId);
  await router.push(`/characters/${characterId}`);
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div>
      <p class="eyebrow">第一步</p>
      <h1>创建调查员</h1>
      <p>选择建卡环境：</p>
    </div>

    <div class="setting-grid">
      <button
        v-for="setting in settingStore.settings"
        :key="setting.id"
        class="setting-card"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting(setting.id)"
      >
        <strong>{{ setting.name }}</strong>
      </button>
    </div>
  </section>
</template>
