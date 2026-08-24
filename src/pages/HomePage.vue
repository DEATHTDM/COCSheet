<script setup lang="ts">
import { onMounted, ref } from "vue";

import {
  checkBrowserStoragePersistence,
  requestBrowserStoragePersistence,
  type BrowserStoragePersistenceStatus,
} from "../app/storage/browserStoragePersistence";
import { useCharacterStore } from "../app/stores/characterStore";
import { getCharacterCreationStatus } from "../character-sheet/presentation/finalCharacterSheetPresentation";
import { isSupportedSetting } from "../coc7/types/setting";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import { useCreationStore } from "../creation/stores/creationStore";
import { downloadJsonFile } from "../portability/browser/downloadJsonFile";
import { useLibraryPortabilityStore } from "../portability/stores/libraryPortabilityStore";
import { usePortabilityStore } from "../portability/stores/portabilityStore";

const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const portabilityStore = usePortabilityStore();
const libraryPortabilityStore = useLibraryPortabilityStore();
const importInput = ref<HTMLInputElement>();
const libraryImportInput = ref<HTMLInputElement>();
const exportingCharacterId = ref("");
const exportingLibrary = ref(false);
const exportError = ref("");
const libraryExportError = ref("");
const storagePersistenceStatus = ref<BrowserStoragePersistenceStatus | "checking" | "requesting">("checking");
const storagePersistenceRequestAttempted = ref(false);
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

onMounted(() => {
  void Promise.all([
    characterStore.loadList(),
    creationStore.loadSessionSteps(),
  ]);
  void checkBrowserStoragePersistence().then((status) => {
    storagePersistenceStatus.value = status;
  });
});

async function requestPersistentStorage(): Promise<void> {
  if (storagePersistenceStatus.value === "requesting") return;
  storagePersistenceRequestAttempted.value = true;
  storagePersistenceStatus.value = "requesting";
  storagePersistenceStatus.value = await requestBrowserStoragePersistence();
}

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

function selectLibraryImportFile(): void {
  libraryPortabilityStore.resetImportStatus();
  libraryImportInput.value?.click();
}

async function handleLibraryImportFile(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || libraryPortabilityStore.importStatus === "importing") {
    input.value = "";
    return;
  }
  try {
    const confirmed = window.confirm(
      "将把完整备份中的数据追加到当前浏览器。\n已有的同一份资料不会被覆盖；发现任一冲突时整份导入取消。\n继续？",
    );
    if (!confirmed) return;
    await libraryPortabilityStore.importLibraryText(await file.text());
  } catch {
    // Store exposes the user-facing error while preserving the original rejection for tests/callers.
  } finally {
    input.value = "";
  }
}

async function exportLibrary(): Promise<void> {
  libraryExportError.value = "";
  exportingLibrary.value = true;
  try {
    downloadJsonFile(await libraryPortabilityStore.exportLibrary());
  } catch (error: unknown) {
    libraryExportError.value = error instanceof Error ? error.message : "导出完整备份失败。";
  } finally {
    exportingLibrary.value = false;
  }
}
</script>

<template>
  <section class="page-stack">
    <div class="hero">
      <p class="eyebrow">中文 CoC 7版调查员建卡工具</p>
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
            <p>{{ getHistoricalSettingLabel(record.settingId) }}</p>
            <span v-if="!isSupportedSetting(record.settingId)" class="status-badge">
              历史建卡环境（当前不支持继续建卡）
            </span>
            <span
              class="status-badge"
              :class="getCharacterCreationStatus(creationStore.sessionSteps[record.id])"
            >
              {{ getCharacterCreationStatus(creationStore.sessionSteps[record.id]) === 'complete'
                ? '建卡已完成'
                : getCharacterCreationStatus(creationStore.sessionSteps[record.id]) === 'incomplete'
                  ? '建卡尚未完成'
                  : '仅有人物卡资料' }}
            </span>
            <small>最后修改：{{ dateFormatter.format(record.updatedAt) }}</small>
          </div>
          <div class="actions">
            <RouterLink class="button primary" :to="`/characters/${record.id}/sheet`">打开人物卡</RouterLink>
            <RouterLink
              v-if="isSupportedSetting(record.settingId) && getCharacterCreationStatus(creationStore.sessionSteps[record.id]) !== 'missing-session'"
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

    <section class="panel page-stack library-backup-panel">
      <div class="data-safety-note">
        <p class="eyebrow">本地数据安全</p>
        <h2>资料只保存在这个浏览器中</h2>
        <p>
          人物资料、建卡进度和建卡预设不会自动上传或跨设备同步。清理网站数据、更换设备、卸载或重置浏览器资料，
          都可能让本地资料无法继续使用；无痕或隐私浏览不适合长期保存。建议定期导出完整备份。
        </p>
        <div class="storage-persistence-status" role="status" aria-live="polite">
          <p v-if="storagePersistenceStatus === 'checking' || storagePersistenceStatus === 'requesting'">
            {{ storagePersistenceStatus === 'checking' ? '正在检查浏览器存储保护……' : '正在请求浏览器持久保存……' }}
          </p>
          <template v-else-if="storagePersistenceStatus === 'persisted'">
            <p><strong>浏览器已启用持久存储保护。</strong></p>
            <p class="muted">这只会降低浏览器自动回收本站数据的可能，持久存储保护不等于完整备份；主动清理网站数据仍会删除资料。</p>
          </template>
          <template v-else-if="storagePersistenceStatus === 'not-persisted'">
            <p>
              <strong>{{ storagePersistenceRequestAttempted ? '浏览器暂未批准持久存储保护。' : '浏览器尚未提供持久存储保护。' }}</strong>
            </p>
            <p class="muted">持久存储保护不等于完整备份，无论是否获批，仍建议定期导出完整备份。</p>
            <button class="button" type="button" @click="requestPersistentStorage">请求持久保存</button>
          </template>
          <p v-else-if="storagePersistenceStatus === 'unsupported'" class="muted">
            当前浏览器无法检查这项保护，请定期导出完整备份。
          </p>
          <p v-else class="muted">
            暂时无法检查浏览器存储保护，其他功能仍可继续使用；请定期导出完整备份。
          </p>
        </div>
      </div>

      <div class="section-heading">
        <div>
          <p class="eyebrow">完整资料库文件</p>
          <h2>本地数据备份</h2>
        </div>
        <div class="actions">
          <button
            class="button"
            type="button"
            :disabled="exportingLibrary"
            @click="exportLibrary"
          >{{ exportingLibrary ? '正在导出……' : '导出完整备份' }}</button>
          <button
            class="button"
            type="button"
            :disabled="libraryPortabilityStore.importStatus === 'importing'"
            @click="selectLibraryImportFile"
          >{{ libraryPortabilityStore.importStatus === 'importing' ? '正在导入……' : '导入完整备份' }}</button>
        </div>
      </div>
      <input
        ref="libraryImportInput"
        class="visually-hidden"
        type="file"
        accept=".cocsheet-backup.json,.json,application/json"
        :disabled="libraryPortabilityStore.importStatus === 'importing'"
        @change="handleLibraryImportFile"
      >
      <p class="muted">
        完整备份包含全部调查员、对应建卡进度与建卡预设，仅在当前浏览器本地处理。
        它与单个人物文件不同，导入只会安全追加且不会覆盖已有数据。
      </p>
      <p
        v-if="libraryPortabilityStore.importStatus === 'success'"
        class="success-message"
        role="status"
      >{{ libraryPortabilityStore.importMessage }}</p>
      <p
        v-else-if="libraryPortabilityStore.importStatus === 'error'"
        class="error-message"
        role="alert"
      >{{ libraryPortabilityStore.importMessage }}</p>
      <p v-if="libraryExportError" class="error-message" role="alert">{{ libraryExportError }}</p>
    </section>

    <section>
      <div class="section-heading">
        <h2>建卡预设</h2>
        <RouterLink to="/kp/presets">管理预设</RouterLink>
      </div>
    </section>
  </section>
</template>
