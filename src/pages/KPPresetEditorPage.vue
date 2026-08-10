<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSettingStore } from "../app/stores/settingStore";
import type { SettingId } from "../coc7/types/setting";
import { usePresetStore } from "../kp/presets/presetStore";

const route = useRoute();
const router = useRouter();
const settingStore = useSettingStore();
const presetStore = usePresetStore();
const name = ref("");
const settingId = ref<SettingId>("standard");
const message = ref("");
const errorMessage = ref("");

const presetId = String(route.params.id);

onMounted(async () => {
  try {
    const record = await presetStore.loadById(presetId);
    if (!record) {
      errorMessage.value = "找不到该 KP 建卡预设。";
      return;
    }

    name.value = record.data.name;
    settingId.value = record.data.settingId;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取预设失败。";
  }
});

async function save(): Promise<void> {
  const record = presetStore.current;
  if (!record) {
    return;
  }

  try {
    await presetStore.save({
      ...record.data,
      name: name.value.trim(),
      settingId: settingId.value,
    });
    message.value = "预设已保存。";
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存预设失败。";
  }
}

async function removePreset(): Promise<void> {
  if (window.confirm(`确定删除预设“${name.value}”吗？`)) {
    await presetStore.remove(presetId);
    await router.push("/kp/presets");
  }
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div>
      <p class="eyebrow">KP 建卡预设</p>
      <h1>编辑预设</h1>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <form v-if="presetStore.current" class="form-stack" @submit.prevent="save">
      <label class="field">
        <span>名称</span>
        <input v-model="name" type="text" required />
      </label>

      <label class="field">
        <span>建卡环境</span>
        <select v-model="settingId">
          <option v-for="setting in settingStore.settings" :key="setting.id" :value="setting.id">
            {{ setting.name }}
          </option>
        </select>
      </label>

      <p class="muted">其他建卡限制字段暂时使用默认值，复杂规则界面留待后续开发。</p>
      <p v-if="message" class="success-message" aria-live="polite">{{ message }}</p>

      <div class="actions">
        <button class="button primary" type="submit">保存</button>
        <button class="button danger" type="button" @click="removePreset">删除</button>
      </div>
    </form>
  </section>
</template>
