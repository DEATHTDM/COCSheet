<script setup lang="ts">
import { onMounted } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import { getCharacterCreationStatus } from "../character-sheet/presentation/finalCharacterSheetPresentation";
import { getSettingPackOrThrow } from "../content/registry";
import { useCreationStore } from "../creation/stores/creationStore";

const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

onMounted(() => {
  void Promise.all([
    characterStore.loadList(),
    creationStore.loadSessionSteps(),
  ]);
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
      <p v-if="characterStore.loading || !creationStore.sessionStepsLoaded">正在读取本地数据……</p>
      <p v-else-if="characterStore.records.length === 0" class="empty-state">暂无调查员</p>
      <ul v-else class="record-list">
        <li v-for="record in characterStore.records" :key="record.id" class="record-card">
          <div>
            <strong>{{ record.name }}</strong>
            <p>{{ getSettingPackOrThrow(record.settingId).name }}</p>
            <span
              class="status-badge"
              :class="getCharacterCreationStatus(creationStore.sessionSteps[record.id])"
            >
              {{ getCharacterCreationStatus(creationStore.sessionSteps[record.id]) === 'complete'
                ? '建卡已完成'
                : getCharacterCreationStatus(creationStore.sessionSteps[record.id]) === 'incomplete'
                  ? '建卡尚未完成'
                  : '无建卡会话' }}
            </span>
            <small>最后修改：{{ dateFormatter.format(record.updatedAt) }}</small>
          </div>
          <div class="actions">
            <RouterLink class="button primary" :to="`/characters/${record.id}/sheet`">打开人物卡</RouterLink>
            <RouterLink
              v-if="getCharacterCreationStatus(creationStore.sessionSteps[record.id]) !== 'missing-session'"
              class="button"
              :to="`/characters/${record.id}`"
            >
              {{ getCharacterCreationStatus(creationStore.sessionSteps[record.id]) === 'complete'
                ? '修改建卡'
                : '继续建卡' }}
            </RouterLink>
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
