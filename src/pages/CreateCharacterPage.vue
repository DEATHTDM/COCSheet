<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useUiPreferenceStore } from "../app/stores/uiPreferenceStore";
import { isSupportedSetting, type SettingId } from "../coc7/types/setting";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import { useCreationStore } from "../creation/stores/creationStore";
import {
  type AttributeGenerationMethod,
  type CreationPreset,
} from "../creation/types/creationPreset";
import { decodeKPPresetShareToken } from "../kp/presets/presetShare";
import { usePresetStore } from "../kp/presets/presetStore";

const route = useRoute();
const router = useRouter();
const uiPreferenceStore = useUiPreferenceStore();
const creationStore = useCreationStore();
const presetStore = usePresetStore();
type SharedPresetState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "valid"; readonly preset: CreationPreset }
  | { readonly status: "error"; readonly message: string };
const sharedPresetState = ref<SharedPresetState>({ status: "idle" });
const creationError = ref("");
let sharedPresetRequestSequence = 0;
const sharedPresetSupported = computed(() => sharedPresetState.value.status === "valid" &&
  isSupportedSetting(sharedPresetState.value.preset.settingId));
const methodLabels: Readonly<Record<AttributeGenerationMethod, string>> = {
  "standard-roll": "标准掷骰",
  "low-roll-boost": "低骰补强",
  "assign-roll": "自由分配骰值",
  "multi-roll": "多组选择",
  "point-buy": "购点",
  manual: "手动输入",
};

onMounted(() => void presetStore.loadList());

watch(
  () => route.query.kp,
  async (queryValue) => {
    const requestSequence = ++sharedPresetRequestSequence;
    if (queryValue === undefined) {
      sharedPresetState.value = { status: "idle" };
      return;
    }
    if (Array.isArray(queryValue)) {
      sharedPresetState.value = {
        status: "error",
        message: "链接包含多个 kp 参数，无法确定要使用的共享预设。",
      };
      return;
    }
    sharedPresetState.value = { status: "loading" };
    try {
      const preset = await decodeKPPresetShareToken(queryValue ?? "");
      if (requestSequence !== sharedPresetRequestSequence) return;
      sharedPresetState.value = { status: "valid", preset };
    } catch (error: unknown) {
      if (requestSequence !== sharedPresetRequestSequence) return;
      sharedPresetState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "共享预设内容不正确。",
      };
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  sharedPresetRequestSequence += 1;
});

async function chooseSetting(settingId: SettingId, preset?: CreationPreset): Promise<void> {
  creationError.value = "";
  try {
    const characterId = await creationStore.start(settingId, preset);
    await router.push(`/characters/${characterId}`);
  } catch (error: unknown) {
    creationError.value = error instanceof Error ? error.message : "创建调查员失败。";
  }
}

async function useSharedPreset(): Promise<void> {
  const state = sharedPresetState.value;
  if (state.status !== "valid") return;
  await chooseSetting(state.preset.settingId, state.preset);
}

async function removeSharedPreset(): Promise<void> {
  const query = { ...route.query };
  delete query.kp;
  await router.replace({ name: "create", query });
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div>
      <p class="eyebrow">第一步</p>
      <h1>创建调查员</h1>
      <p>当前正式支持 Standard CoC 7E；未选择 KP 预设时使用默认属性配置。</p>
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

    <section
      v-if="sharedPresetState.status !== 'idle'"
      class="panel form-stack shared-preset-preview"
      aria-labelledby="shared-preset-title"
    >
      <div>
        <p class="eyebrow">来自链接</p>
        <h2 id="shared-preset-title">共享 KP 建卡预设</h2>
      </div>
      <p v-if="sharedPresetState.status === 'loading'" role="status">正在读取共享预设…</p>
      <template v-else-if="sharedPresetState.status === 'valid'">
        <dl class="shared-preset-facts">
          <div><dt>预设名称</dt><dd>{{ sharedPresetState.preset.name }}</dd></div>
          <div><dt>建卡环境</dt><dd>{{ getHistoricalSettingLabel(sharedPresetState.preset.settingId) }}</dd></div>
          <div>
            <dt>属性生成方式</dt>
            <dd>{{ sharedPresetState.preset.attributeGeneration.allowedMethods.map((method) => methodLabels[method]).join("、") }}</dd>
          </div>
        </dl>
        <p>此预设来自分享链接，不会自动保存到你的 KP 预设库。</p>
        <p v-if="!sharedPresetSupported" class="warning-message" role="alert">
          该分享链接使用的建卡环境当前版本不支持，不能用于新建调查员。
        </p>
        <div class="actions">
          <button
            v-if="sharedPresetSupported"
            class="button primary"
            type="button"
            :disabled="creationStore.creating"
            @click="useSharedPreset"
          >使用共享预设创建调查员</button>
          <button class="button" type="button" @click="removeSharedPreset">忽略共享预设</button>
        </div>
      </template>
      <template v-else-if="sharedPresetState.status === 'error'">
        <p class="error-message" role="alert">无法读取共享 KP 预设：{{ sharedPresetState.message }}</p>
        <button class="button" type="button" @click="removeSharedPreset">移除共享预设</button>
      </template>
    </section>

    <p v-if="creationError" class="error-message" role="alert">{{ creationError }}</p>

    <div class="setting-grid">
      <button
        class="setting-card"
        type="button"
        :disabled="creationStore.creating"
        @click="chooseSetting('standard')"
      ><strong>开始创建 Standard CoC 7E 调查员</strong></button>
    </div>

    <section v-if="presetStore.records.length" class="form-stack">
      <h2>或使用 KP 建卡预设</h2>
      <button
        v-for="record in presetStore.records"
        :key="record.id"
        class="setting-card preset-choice"
        type="button"
        :disabled="creationStore.creating || !isSupportedSetting(record.data.settingId)"
        @click="chooseSetting(record.data.settingId, record.data)"
      >
        <strong>{{ record.name }}</strong>
        <small>{{ getHistoricalSettingLabel(record.data.settingId) }}</small>
        <small>{{ record.data.attributeGeneration.allowedMethods.length }} 种属性生成方式</small>
        <small v-if="!isSupportedSetting(record.data.settingId)" class="warning-message">
          该建卡环境当前不再支持新建
        </small>
      </button>
    </section>
  </section>
</template>
