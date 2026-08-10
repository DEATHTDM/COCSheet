<script setup lang="ts">
import { onMounted } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import { getSettingPackOrThrow } from "../content/registry";

const characterStore = useCharacterStore();
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

onMounted(() => {
  void characterStore.loadList();
});

async function removeCharacter(id: string, name: string): Promise<void> {
  if (window.confirm(`确定删除调查员“${name}”吗？`)) {
    await characterStore.remove(id);
  }
}
</script>

<template>
  <section class="page-stack">
    <div class="hero">
      <p class="eyebrow">中文 Call of Cthulhu 7th Edition 建卡工具</p>
      <h1>COCSheet</h1>
      <p>纯前端、本地优先，不需要账号或服务器。</p>
      <RouterLink class="button primary" to="/create">创建调查员</RouterLink>
    </div>

    <section>
      <div class="section-heading">
        <h2>我的调查员</h2>
      </div>
      <p v-if="characterStore.loading">正在读取本地数据……</p>
      <p v-else-if="characterStore.records.length === 0" class="empty-state">暂无调查员</p>
      <ul v-else class="record-list">
        <li v-for="record in characterStore.records" :key="record.id" class="record-card">
          <div>
            <strong>{{ record.name }}</strong>
            <p>{{ getSettingPackOrThrow(record.settingId).name }}</p>
            <small>最后修改：{{ dateFormatter.format(record.updatedAt) }}</small>
          </div>
          <div class="actions">
            <RouterLink class="button" :to="`/characters/${record.id}`">打开</RouterLink>
            <button class="button danger" type="button" @click="removeCharacter(record.id, record.name)">
              删除
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <div class="section-heading">
        <h2>KP 建卡预设</h2>
        <RouterLink to="/kp/presets">管理预设</RouterLink>
      </div>
    </section>
  </section>
</template>
