<script setup lang="ts">
import { ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import type { Character, CharacterPossessionEntry } from "../coc7/types/character";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const newName = ref("");
const newNotes = ref("");
const editingId = ref<string>();
const editingName = ref("");
const editingNotes = ref("");
const busyAction = ref<string>();
const actionError = ref("");
const actionStatus = ref("");

function clearMessages(): void {
  actionError.value = "";
  actionStatus.value = "";
}

async function run(actionId: string, action: () => Promise<unknown>, success: string): Promise<void> {
  if (busyAction.value) return;
  clearMessages();
  busyAction.value = actionId;
  try {
    await action();
    actionStatus.value = success;
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "保存随身物品失败。";
  } finally {
    busyAction.value = undefined;
  }
}

async function addEntry(): Promise<void> {
  await run("add", async () => {
    await characterStore.addPossessionEntry(props.character.id, {
      name: newName.value,
      notes: newNotes.value,
    });
    newName.value = "";
    newNotes.value = "";
  }, "随身物品已添加；Cash 与 Assets 未改变。");
}

function beginEditing(entry: CharacterPossessionEntry): void {
  clearMessages();
  editingId.value = entry.id;
  editingName.value = entry.name;
  editingNotes.value = entry.notes ?? "";
}

function cancelEditing(): void {
  editingId.value = undefined;
  editingName.value = "";
  editingNotes.value = "";
  clearMessages();
}

async function saveEntry(entryId: string): Promise<void> {
  await run(`edit:${entryId}`, async () => {
    await characterStore.updatePossessionEntry(props.character.id, entryId, {
      name: editingName.value,
      notes: editingNotes.value,
    });
    editingId.value = undefined;
    editingName.value = "";
    editingNotes.value = "";
  }, "随身物品已保存；Cash 与 Assets 未改变。");
}

async function removeEntry(entry: CharacterPossessionEntry): Promise<void> {
  if (!window.confirm(`删除随身物品“${entry.name}”？`)) return;
  await run(`remove:${entry.id}`, async () => {
    await characterStore.removePossessionEntry(props.character.id, entry.id);
    if (editingId.value === entry.id) cancelEditing();
  }, "随身物品已删除；Cash 与 Assets 未改变。");
}
</script>

<template>
  <section class="panel final-inventory-workspace final-possessions-workspace">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Possessions</p>
        <h2>随身物品</h2>
        <p class="muted">自由记录长期物品；不建立商品目录、价格、数量或自动扣款。</p>
      </div>
      <span class="status-badge">{{ character.possessions?.length ?? 0 }} 件</span>
    </div>
    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message" role="status">{{ actionStatus }}</p>

    <ul v-if="character.possessions?.length" class="final-inventory-entry-list">
      <li v-for="entry in character.possessions" :key="entry.id" :data-possession-entry-id="entry.id">
        <template v-if="editingId === entry.id">
          <div class="wealth-edit-grid">
            <label class="field"><span>名称</span><input v-model="editingName" type="text" /></label>
            <label class="field"><span>备注（可选）</span><textarea v-model="editingNotes" rows="2" /></label>
          </div>
          <div class="actions final-inventory-actions">
            <button class="button primary" type="button" :disabled="busyAction !== undefined" @click="saveEntry(entry.id)">保存</button>
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="cancelEditing">取消</button>
          </div>
        </template>
        <template v-else>
          <div class="final-inventory-entry-copy"><strong>{{ entry.name }}</strong><span v-if="entry.notes">{{ entry.notes }}</span></div>
          <div class="actions final-inventory-actions">
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="beginEditing(entry)">编辑</button>
            <button class="button danger" type="button" :disabled="busyAction !== undefined" @click="removeEntry(entry)">删除</button>
          </div>
        </template>
      </li>
    </ul>
    <p v-else class="empty-state">尚未记录普通随身物品；打开页面不会自动生成空数组。</p>

    <form class="final-inventory-form" @submit.prevent="addEntry">
      <div class="wealth-edit-grid">
        <label class="field"><span>名称</span><input v-model="newName" name="possession-name" type="text" placeholder="例如：莱卡相机" /></label>
        <label class="field"><span>备注（可选）</span><textarea v-model="newNotes" name="possession-notes" rows="2" /></label>
      </div>
      <button class="button" type="submit" :disabled="busyAction !== undefined">添加随身物品</button>
    </form>
  </section>
</template>
