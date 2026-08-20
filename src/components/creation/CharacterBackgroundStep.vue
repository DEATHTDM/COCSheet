<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import { useCharacterStore } from "../../app/stores/characterStore";
import type { BackstoryEntry, Character } from "../../coc7/types/character";
import { creationBackstoryCategories } from "../../creation/presentation/backstoryPresentation";
import {
  validateCreationBackstory,
  type CreationBackstoryCategoryId,
} from "../../creation/rules/creationBackstory";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const newEntryTexts = reactive<Partial<Record<CreationBackstoryCategoryId, string>>>({});
const editingEntryId = ref<string>();
const editingText = ref("");
const actionError = ref("");

const validation = computed(() => validateCreationBackstory(props.character.backstory));
const canAdd = computed(() => validation.value.count < 6);

function entriesFor(category: CreationBackstoryCategoryId): readonly BackstoryEntry[] {
  return validation.value.creationEntries.filter((entry) => entry.category === category);
}

function reportError(error: unknown, fallback: string): void {
  actionError.value = error instanceof Error ? error.message : fallback;
}

async function addEntry(category: CreationBackstoryCategoryId): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.addBackstoryEntry(
      props.character.id,
      category,
      newEntryTexts[category] ?? "",
    );
    newEntryTexts[category] = "";
  } catch (error: unknown) {
    reportError(error, "添加背景失败。");
  }
}

function beginEditing(entry: BackstoryEntry): void {
  editingEntryId.value = entry.id;
  editingText.value = entry.text;
  actionError.value = "";
}

function cancelEditing(): void {
  editingEntryId.value = undefined;
  editingText.value = "";
}

async function saveEntry(entryId: string): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.updateBackstoryEntry(props.character.id, entryId, editingText.value);
    cancelEditing();
  } catch (error: unknown) {
    reportError(error, "保存背景失败。");
  }
}

async function removeEntry(entry: BackstoryEntry): Promise<void> {
  if (!window.confirm(`删除这条${entry.id === props.character.backstory?.keyConnectionEntryId ? "关键连接" : "背景"}？`)) return;
  actionError.value = "";
  try {
    await characterStore.removeBackstoryEntry(props.character.id, entry.id);
    if (editingEntryId.value === entry.id) cancelEditing();
  } catch (error: unknown) {
    reportError(error, "删除背景失败。");
  }
}

async function setKeyConnection(entryId: string): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.setKeyConnection(props.character.id, entryId);
  } catch (error: unknown) {
    reportError(error, "设置关键连接失败。");
  }
}

async function returnToSkills(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("skills");
  } catch (error: unknown) {
    reportError(error, "返回技能失败。");
  }
}

async function completeBackground(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.completeBackground();
  } catch (error: unknown) {
    reportError(error, "完成背景失败。");
  }
}
</script>

<template>
  <section class="page-stack background-step">
    <header class="panel form-stack compact-stack">
      <div>
        <p class="eyebrow">Background</p>
        <h2>调查员背景</h2>
      </div>
      <p>
        创建背景：已填写 <strong>{{ validation.count }} / 3～6</strong>。可以在同一类别填写多条，
        不要求覆盖全部六类。
      </p>
      <p class="key-connection-guidance">
        从已有创建背景中选择<strong>恰好一条</strong>作为关键连接；以 ★ 标记。
      </p>
      <p v-if="!canAdd" class="warning-message">已达到 6 条上限；仍可编辑或删除已有条目。</p>
    </header>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>

    <section
      v-for="category in creationBackstoryCategories"
      :key="category.id"
      class="panel form-stack background-category"
    >
      <header>
        <h3>{{ category.title }}</h3>
        <p class="muted">{{ category.description }}</p>
      </header>

      <ul v-if="entriesFor(category.id).length" class="background-entry-list">
        <li v-for="entry in entriesFor(category.id)" :key="entry.id" class="background-entry">
          <template v-if="editingEntryId === entry.id">
            <label class="field">
              <span>编辑条目</span>
              <textarea v-model="editingText" rows="3" />
            </label>
            <div class="actions">
              <button class="button primary" type="button" @click="saveEntry(entry.id)">保存</button>
              <button class="button" type="button" @click="cancelEditing">取消</button>
            </div>
          </template>
          <template v-else>
            <div class="background-entry-text">
              <strong v-if="entry.id === character.backstory?.keyConnectionEntryId" class="key-connection-mark">
                ★ 关键连接
              </strong>
              <p>{{ entry.text }}</p>
            </div>
            <div class="actions background-entry-actions">
              <button
                v-if="entry.id !== character.backstory?.keyConnectionEntryId"
                class="button"
                type="button"
                @click="setKeyConnection(entry.id)"
              >设为关键连接</button>
              <button class="button" type="button" @click="beginEditing(entry)">编辑</button>
              <button class="button danger" type="button" @click="removeEntry(entry)">删除</button>
            </div>
          </template>
        </li>
      </ul>
      <p v-else class="empty-state">此类别尚无条目。</p>

      <div class="background-add-row">
        <label class="field">
          <span>添加{{ category.title }}</span>
          <textarea
            v-model="newEntryTexts[category.id]"
            rows="2"
            :placeholder="category.placeholder"
            :disabled="!canAdd"
          />
        </label>
        <button
          class="button"
          type="button"
          :disabled="!canAdd || !(newEntryTexts[category.id] ?? '').trim()"
          @click="addEntry(category.id)"
        >添加条目</button>
      </div>
    </section>

    <footer class="panel form-stack compact-stack">
      <ul v-if="validation.errors.length" class="validation-list">
        <li v-for="error in validation.errors" :key="`${error.code}:${error.entryId ?? ''}`">
          {{ error.message }}
        </li>
      </ul>
      <div class="section-heading">
        <button class="button" type="button" @click="returnToSkills">返回技能</button>
        <button
          class="button primary"
          type="button"
          :disabled="!validation.valid"
          @click="completeBackground"
        >继续：完成建卡 / 查看调查员</button>
      </div>
    </footer>
  </section>
</template>
