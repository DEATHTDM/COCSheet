<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  finalSheetCreationBackstoryCategories,
  finalSheetGameTimeBackstoryCategories,
} from "../character-sheet/presentation/finalSheetNarrativePresentation";
import type {
  BackstoryCategoryId,
  BackstoryEntry,
  Character,
} from "../coc7/types/character";
import { backstoryCategoryLabels } from "../creation/presentation/backstoryPresentation";
import { isCreationBackstoryCategory } from "../creation/rules/creationBackstory";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const newEntryTexts = reactive<Partial<Record<BackstoryCategoryId, string>>>({});
const editingEntryId = ref<string>();
const editingText = ref("");
const busyAction = ref<string>();
const actionError = ref("");
const actionStatus = ref("");

const keyConnection = computed(() => {
  const keyId = props.character.backstory?.keyConnectionEntryId;
  return keyId
    ? props.character.backstory?.entries.find((entry) => entry.id === keyId)
    : undefined;
});

function entriesFor(category: BackstoryCategoryId): readonly BackstoryEntry[] {
  return props.character.backstory?.entries.filter((entry) => entry.category === category) ?? [];
}

function resetMessages(): void {
  actionError.value = "";
  actionStatus.value = "";
}

function reportError(error: unknown, fallback: string): void {
  actionError.value = error instanceof Error ? error.message : fallback;
}

async function runAction(action: string, operation: () => Promise<void>, success: string): Promise<void> {
  resetMessages();
  busyAction.value = action;
  try {
    await operation();
    actionStatus.value = success;
  } catch (error: unknown) {
    reportError(error, "保存背景失败。");
  } finally {
    busyAction.value = undefined;
  }
}

async function addEntry(category: BackstoryCategoryId): Promise<void> {
  await runAction(`add:${category}`, async () => {
    await characterStore.addBackstoryEntry(
      props.character.id,
      category,
      newEntryTexts[category] ?? "",
    );
    newEntryTexts[category] = "";
  }, `已添加${backstoryCategoryLabels[category]}条目。`);
}

function beginEditing(entry: BackstoryEntry): void {
  resetMessages();
  editingEntryId.value = entry.id;
  editingText.value = entry.text;
}

function cancelEditing(): void {
  editingEntryId.value = undefined;
  editingText.value = "";
  resetMessages();
}

async function saveEntry(entry: BackstoryEntry): Promise<void> {
  await runAction(`edit:${entry.id}`, async () => {
    await characterStore.updateBackstoryEntry(props.character.id, entry.id, editingText.value);
    editingEntryId.value = undefined;
    editingText.value = "";
  }, `已保存${backstoryCategoryLabels[entry.category]}条目。`);
}

async function removeEntry(entry: BackstoryEntry): Promise<void> {
  const isKey = entry.id === props.character.backstory?.keyConnectionEntryId;
  if (!window.confirm(`删除这条${isKey ? "关键连接" : "背景"}？`)) return;
  await runAction(`remove:${entry.id}`, async () => {
    await characterStore.removeBackstoryEntry(props.character.id, entry.id);
    if (editingEntryId.value === entry.id) {
      editingEntryId.value = undefined;
      editingText.value = "";
    }
  }, isKey ? "背景已删除，关键连接引用已清除。" : "背景条目已删除。");
}

async function setKeyConnection(entryId: string): Promise<void> {
  await runAction(`key:${entryId}`, async () => {
    await characterStore.setKeyConnection(props.character.id, entryId);
  }, "关键连接已更新。");
}

async function clearKeyConnection(): Promise<void> {
  await runAction("key:clear", async () => {
    await characterStore.setKeyConnection(props.character.id, undefined);
  }, "关键连接已清除。");
}
</script>

<template>
  <section class="panel final-backstory-workspace">
    <div class="section-heading final-narrative-heading">
      <div>
        <p class="eyebrow">Backstory</p>
        <h2>背景故事</h2>
      </div>
      <span class="status-badge">{{ character.backstory?.entries.length ?? 0 }} 条长期记录</span>
    </div>

    <aside class="final-key-connection" :class="{ empty: !keyConnection }">
      <div>
        <strong>Key Connection</strong>
        <p v-if="keyConnection">
          {{ backstoryCategoryLabels[keyConnection.category] }} · {{ keyConnection.text }}
        </p>
        <p v-else>当前没有关键连接；长期人物数据允许保持为空。</p>
      </div>
      <button
        v-if="keyConnection"
        class="button"
        type="button"
        :disabled="busyAction !== undefined"
        @click="clearKeyConnection"
      >清除关键连接</button>
    </aside>

    <p v-if="actionError" class="error-message final-narrative-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message final-narrative-message" role="status">{{ actionStatus }}</p>

    <section class="final-backstory-region" aria-labelledby="final-creation-backstory-heading">
      <header>
        <h3 id="final-creation-backstory-heading">人物背景</h3>
        <p class="muted">长期编辑不受创建期 3～6 条与必须选择关键连接的完成条件限制。</p>
      </header>
      <div class="final-backstory-category-grid">
        <details
          v-for="category in finalSheetCreationBackstoryCategories"
          :key="category.id"
          class="final-backstory-category"
          :data-backstory-category="category.id"
          :open="entriesFor(category.id).length > 0"
        >
          <summary>
            <span>{{ category.title }}</span>
            <span class="status-badge">{{ entriesFor(category.id).length }}</span>
          </summary>
          <p class="muted final-backstory-description">{{ category.description }}</p>
          <ul v-if="entriesFor(category.id).length" class="final-backstory-entry-list">
            <li
              v-for="entry in entriesFor(category.id)"
              :key="entry.id"
              class="final-backstory-entry"
              :data-backstory-entry-id="entry.id"
            >
              <template v-if="editingEntryId === entry.id">
                <label class="field">
                  <span>编辑{{ category.title }}</span>
                  <textarea v-model="editingText" rows="3" />
                </label>
                <div class="actions background-entry-actions">
                  <button class="button primary" type="button" :disabled="busyAction !== undefined" @click="saveEntry(entry)">保存</button>
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="cancelEditing">取消</button>
                </div>
              </template>
              <template v-else>
                <div class="final-backstory-entry-text">
                  <strong v-if="entry.id === character.backstory?.keyConnectionEntryId" class="key-connection-mark">★ 关键连接</strong>
                  <p>{{ entry.text }}</p>
                </div>
                <div class="actions background-entry-actions">
                  <button
                    v-if="isCreationBackstoryCategory(entry.category) && entry.id !== character.backstory?.keyConnectionEntryId"
                    class="button"
                    type="button"
                    :disabled="busyAction !== undefined"
                    @click="setKeyConnection(entry.id)"
                  >设为关键连接</button>
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="beginEditing(entry)">编辑</button>
                  <button class="button danger" type="button" :disabled="busyAction !== undefined" @click="removeEntry(entry)">删除</button>
                </div>
              </template>
            </li>
          </ul>
          <p v-else class="compact-empty-state">此类别尚无条目。</p>
          <div class="final-backstory-add-row">
            <label class="field">
              <span>添加{{ category.title }}</span>
              <textarea v-model="newEntryTexts[category.id]" rows="2" :aria-label="`添加${category.title}`" />
            </label>
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="addEntry(category.id)">添加条目</button>
          </div>
        </details>
      </div>
    </section>

    <section class="final-backstory-region" aria-labelledby="final-game-time-backstory-heading">
      <header>
        <h3 id="final-game-time-backstory-heading">游戏过程记录</h3>
        <p class="muted">这里只维护长期叙事文本，不自动改变 SAN、伤势、疯狂或其他规则状态。</p>
      </header>
      <div class="final-backstory-category-grid">
        <details
          v-for="category in finalSheetGameTimeBackstoryCategories"
          :key="category.id"
          class="final-backstory-category"
          :data-backstory-category="category.id"
          :open="entriesFor(category.id).length > 0"
        >
          <summary>
            <span>{{ category.title }}</span>
            <span class="status-badge">{{ entriesFor(category.id).length }}</span>
          </summary>
          <p class="muted final-backstory-description">{{ category.description }}</p>
          <ul v-if="entriesFor(category.id).length" class="final-backstory-entry-list">
            <li
              v-for="entry in entriesFor(category.id)"
              :key="entry.id"
              class="final-backstory-entry"
              :data-backstory-entry-id="entry.id"
            >
              <template v-if="editingEntryId === entry.id">
                <label class="field">
                  <span>编辑{{ category.title }}</span>
                  <textarea v-model="editingText" rows="3" />
                </label>
                <div class="actions background-entry-actions">
                  <button class="button primary" type="button" :disabled="busyAction !== undefined" @click="saveEntry(entry)">保存</button>
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="cancelEditing">取消</button>
                </div>
              </template>
              <template v-else>
                <div class="final-backstory-entry-text"><p>{{ entry.text }}</p></div>
                <div class="actions background-entry-actions">
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="beginEditing(entry)">编辑</button>
                  <button class="button danger" type="button" :disabled="busyAction !== undefined" @click="removeEntry(entry)">删除</button>
                </div>
              </template>
            </li>
          </ul>
          <p v-else class="compact-empty-state">此类别尚无条目。</p>
          <div class="final-backstory-add-row">
            <label class="field">
              <span>添加{{ category.title }}</span>
              <textarea v-model="newEntryTexts[category.id]" rows="2" :aria-label="`添加${category.title}`" />
            </label>
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="addEntry(category.id)">添加条目</button>
          </div>
        </details>
      </div>
    </section>
  </section>
</template>
