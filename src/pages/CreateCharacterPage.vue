<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useSettingStore } from "../app/stores/settingStore";
import { useUiPreferenceStore } from "../app/stores/uiPreferenceStore";
import type { SettingId } from "../coc7/types/setting";
import { useCreationStore } from "../creation/stores/creationStore";
import type { CreationPreset } from "../creation/types/creationPreset";
import { usePresetStore } from "../kp/presets/presetStore";

const router = useRouter();
const settingStore = useSettingStore();
const uiPreferenceStore = useUiPreferenceStore();
const creationStore = useCreationStore();
const presetStore = usePresetStore();

onMounted(() => void presetStore.loadList());

async function chooseSetting(settingId: SettingId, preset?: CreationPreset): Promise<void> {
  const characterId = await creationStore.start(settingId, preset);
  await router.push(`/characters/${characterId}`);
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div>
      <p class="eyebrow">第一步</p>
      <h1>创建调查员</h1>
      <p>选择建卡环境；未选择 KP 预设时使用 Standard COC7 默认属性配置。</p>
    </div>

    <fieldset class="panel creation-experience-selector">
      <legend>建卡体验</legend>
      <label class="creation-experience-option">
        <input
          type="radio"
          name="creation-experience-mode"
          value="guided"
          :checked="uiPreferenceStore.creationExperienceMode === 'guided'"
          @change="uiPreferenceStore.setCreationExperienceMode('guided')"
        />
        <span>
          <strong>新手引导</strong>
          <small>建卡时显示每一步的简短说明，适合第一次使用。</small>
        </span>
      </label>
      <label class="creation-experience-option">
        <input
          type="radio"
          name="creation-experience-mode"
          value="quick"
          :checked="uiPreferenceStore.creationExperienceMode === 'quick'"
          @change="uiPreferenceStore.setCreationExperienceMode('quick')"
        />
        <span>
          <strong>快速建卡</strong>
          <small>隐藏步骤说明，直接使用完整建卡表单。</small>
        </span>
      </label>
    </fieldset>

    <div class="setting-grid">
      <button
        v-for="setting in settingStore.settings"
        :key="setting.id"
        class="setting-card"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting(setting.id)"
      ><strong>{{ setting.name }}</strong></button>
    </div>

    <section v-if="presetStore.records.length" class="form-stack">
      <h2>或使用 KP 建卡预设</h2>
      <button
        v-for="record in presetStore.records"
        :key="record.id"
        class="setting-card preset-choice"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting(record.data.settingId, record.data)"
      >
        <strong>{{ record.name }}</strong>
        <small>{{ record.data.attributeGeneration.allowedMethods.length }} 种属性生成方式</small>
      </button>
    </section>
  </section>
</template>
