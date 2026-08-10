<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import { getSettingPackOrThrow } from "../content/registry";

const route = useRoute();
const characterStore = useCharacterStore();
const name = ref("");
const ready = ref(false);
const errorMessage = ref("");
const saveStatus = ref<"idle" | "saving" | "saved">("idle");
let saveTimer: number | undefined;
let lastSavedName = "";

const characterId = computed(() => String(route.params.id));
const settingName = computed(() =>
  characterStore.current ? getSettingPackOrThrow(characterStore.current.settingId).name : "",
);

onMounted(async () => {
  try {
    const record = await characterStore.loadById(characterId.value);
    if (!record) {
      errorMessage.value = "找不到该调查员。";
      return;
    }

    name.value = record.name;
    lastSavedName = record.name;
    ready.value = true;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取调查员失败。";
  }
});

watch(name, () => {
  if (!ready.value) {
    return;
  }

  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }

  saveStatus.value = "idle";
  saveTimer = window.setTimeout(() => {
    void persistName();
  }, 350);
});

onBeforeUnmount(() => {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }

  if (ready.value && name.value !== lastSavedName) {
    void persistName();
  }
});

async function persistName(): Promise<void> {
  const valueToSave = name.value;
  saveStatus.value = "saving";
  try {
    await characterStore.updateName(characterId.value, valueToSave);
    lastSavedName = valueToSave;
    saveStatus.value = "saved";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存姓名失败。";
  }
}
</script>

<template>
  <section class="page-stack narrow-page">
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <template v-else-if="characterStore.current">
      <div>
        <p class="eyebrow">调查员 ID：{{ characterStore.current.id }}</p>
        <h1>调查员编辑</h1>
        <p>当前设定：{{ settingName }}</p>
      </div>

      <label class="field">
        <span>姓名</span>
        <input v-model="name" type="text" autocomplete="off" />
        <small aria-live="polite">
          {{ saveStatus === "saving" ? "正在保存……" : saveStatus === "saved" ? "已保存" : "修改后自动保存" }}
        </small>
      </label>

      <div class="placeholder-grid">
        <section class="placeholder-card">
          <h2>建卡向导</h2>
          <p>尚未实现</p>
        </section>
        <section class="placeholder-card">
          <h2>人物卡</h2>
          <p>尚未实现</p>
        </section>
      </div>
    </template>
    <p v-else>正在读取本地数据……</p>
  </section>
</template>
