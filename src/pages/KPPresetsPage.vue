<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { getSettingPackOrThrow } from "../content/registry";
import { usePresetStore } from "../kp/presets/presetStore";

const router = useRouter();
const presetStore = usePresetStore();

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
  }
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
          <p>{{ getSettingPackOrThrow(record.data.settingId).name }}</p>
        </div>
        <div class="actions">
          <RouterLink class="button" :to="`/kp/presets/${record.id}`">编辑</RouterLink>
          <button class="button danger" type="button" @click="removePreset(record.id, record.name)">
            删除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
