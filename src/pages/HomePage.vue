<script setup lang="ts">
import { onMounted, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import { getCharacterCreationStatus } from "../character-sheet/presentation/finalCharacterSheetPresentation";
import { getSettingPackOrThrow } from "../content/registry";
import { useCreationStore } from "../creation/stores/creationStore";
import { downloadJsonFile } from "../portability/browser/downloadJsonFile";
import { usePortabilityStore } from "../portability/stores/portabilityStore";

const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const portabilityStore = usePortabilityStore();
const importInput = ref<HTMLInputElement>();
const exportingCharacterId = ref("");
const exportError = ref("");
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

function selectImportFile(): void {
  portabilityStore.resetImportStatus();
  importInput.value?.click();
}

async function handleImportFile(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || portabilityStore.importStatus === "importing") {
    input.value = "";
    return;
  }
  try {
    await portabilityStore.importCharacterText(await file.text());
    await Promise.all([
      characterStore.loadList(),
      creationStore.loadSessionSteps(),
    ]);
  } catch {
    // Store exposes the user-facing error while preserving the original rejection for tests/callers.
  } finally {
    input.value = "";
  }
}

async function exportCharacter(characterId: string): Promise<void> {
  exportError.value = "";
  exportingCharacterId.value = characterId;
  try {
    downloadJsonFile(await portabilityStore.exportCharacter(characterId));
  } catch (error: unknown) {
    exportError.value = error instanceof Error ? error.message : "导出人物文件失败。";
  } finally {
    exportingCharacterId.value = "";
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
        <button
          class="button"
          type="button"
          :disabled="portabilityStore.importStatus === 'importing'"
          @click="selectImportFile"
        >{{ portabilityStore.importStatus === 'importing' ? '正在导入……' : '导入调查员文件' }}</button>
      </div>
      <input
        ref="importInput"
        class="visually-hidden"
        type="file"
        accept=".cocsheet.json,.json,application/json"
        :disabled="portabilityStore.importStatus === 'importing'"
        @change="handleImportFile"
      >
      <p class="muted portability-hint">文件只在当前浏览器本地读取，不会上传服务器。</p>
      <p
        v-if="portabilityStore.importStatus === 'success'"
        class="success-message"
        role="status"
      >{{ portabilityStore.importMessage }}</p>
      <p
        v-else-if="portabilityStore.importStatus === 'error'"
        class="error-message"
        role="alert"
      >{{ portabilityStore.importMessage }}</p>
      <p v-if="exportError" class="error-message" role="alert">{{ exportError }}</p>
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
            <button
              class="button"
              type="button"
              :disabled="exportingCharacterId === record.id"
              @click="exportCharacter(record.id)"
            >{{ exportingCharacterId === record.id ? '正在导出……' : '导出' }}</button>
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
