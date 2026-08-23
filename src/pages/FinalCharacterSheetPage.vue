<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  deriveFinalSheetStandardValues,
  getCharacterCreationStatus,
  getFinalSheetMaximumSanity,
} from "../character-sheet/presentation/finalCharacterSheetPresentation";
import FinalSheetBackstoryWorkspace from "../components/FinalSheetBackstoryWorkspace.vue";
import FinalSheetIdentityEditor from "../components/FinalSheetIdentityEditor.vue";
import FinalSheetPossessionsWorkspace from "../components/FinalSheetPossessionsWorkspace.vue";
import FinalSheetResourceWorkspace from "../components/FinalSheetResourceWorkspace.vue";
import FinalSheetSkillWorkspace from "../components/FinalSheetSkillWorkspace.vue";
import FinalSheetWeaponWorkspace from "../components/FinalSheetWeaponWorkspace.vue";
import FinalSheetWealthWorkspace from "../components/FinalSheetWealthWorkspace.vue";
import { getFifthValue, getHalfValue } from "../coc7/rules/attributes";
import { formatDamageBonus } from "../coc7/rules/derived";
import { characteristicIds } from "../coc7/types/attribute";
import { getSettingPackOrThrow } from "../content/registry";
import { useCreationStore } from "../creation/stores/creationStore";

const route = useRoute();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const characterId = computed(() => String(route.params.id));
const ready = ref(false);
const errorMessage = ref("");
const sessionWarning = ref("");

const character = computed(() => characterStore.current?.data);
const creationStatus = computed(() => getCharacterCreationStatus(
  creationStore.current?.characterId === characterId.value
    ? creationStore.current.data.currentStep
    : undefined,
));
const settingName = computed(() => character.value
  ? getSettingPackOrThrow(character.value.settingId).name
  : "");
const derived = computed(() => character.value
  ? deriveFinalSheetStandardValues(character.value)
  : undefined);
const maximumSanity = computed(() => character.value
  ? getFinalSheetMaximumSanity(character.value)
  : 99);

async function loadCharacterSheet(id: string): Promise<void> {
  ready.value = false;
  errorMessage.value = "";
  sessionWarning.value = "";
  try {
    const loaded = await characterStore.loadById(id);
    if (!loaded) {
      errorMessage.value = "找不到该调查员。";
      return;
    }
    try {
      await creationStore.loadByCharacterId(id);
    } catch (error: unknown) {
      sessionWarning.value = error instanceof Error
        ? `建卡状态读取失败：${error.message}`
        : "建卡状态读取失败。";
    }
    ready.value = true;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取调查员失败。";
  }
}

watch(characterId, (id) => void loadCharacterSheet(id), { immediate: true });
</script>

<template>
  <section class="page-stack final-sheet-page">
    <p v-if="errorMessage" class="panel error-message" role="alert">{{ errorMessage }}</p>
    <p v-else-if="!ready">正在读取本地人物数据……</p>

    <template v-else-if="character">
      <header class="sheet-heading">
        <div>
          <p class="eyebrow">Final Character Sheet</p>
          <h1>{{ character.name || '未命名调查员' }}</h1>
          <p>{{ character.occupation?.displayNameSnapshot.zh ?? '职业未记录' }} · {{ settingName }}</p>
        </div>
        <div class="actions">
          <RouterLink class="button" to="/">返回首页</RouterLink>
          <RouterLink class="button" :to="`/characters/${character.id}/print`">打印 / PDF</RouterLink>
          <RouterLink
            v-if="creationStatus !== 'missing-session'"
            class="button"
            :to="`/characters/${character.id}`"
          >{{ creationStatus === 'complete' ? '修改建卡' : '继续建卡' }}</RouterLink>
        </div>
      </header>

      <aside v-if="creationStatus === 'incomplete'" class="panel incomplete-sheet-notice">
        <strong>建卡尚未完成</strong>
        <p>这是当前已持久化 Character 数据的预览；缺失内容不会在打开人物卡时自动补写。</p>
        <RouterLink class="button primary" :to="`/characters/${character.id}`">继续建卡</RouterLink>
      </aside>
      <aside v-else-if="creationStatus === 'missing-session'" class="panel incomplete-sheet-notice">
        <strong>此人物没有建卡会话</strong>
        <p>人物卡仍直接读取并显示 Character；无法返回已经不存在的建卡流程。</p>
      </aside>
      <p v-if="sessionWarning" class="warning-message" role="status">{{ sessionWarning }}</p>

      <section class="sheet-priority-grid">
        <FinalSheetResourceWorkspace :character="character" />

        <FinalSheetIdentityEditor :character="character" />
      </section>

      <section class="panel">
        <div class="section-heading">
          <div><p class="eyebrow">Characteristics</p><h2>属性与派生值</h2></div>
        </div>
        <div v-if="character.characteristics" class="sheet-characteristic-grid">
          <article v-for="id in characteristicIds" :key="id" class="sheet-characteristic-card">
            <span>{{ id }}</span>
            <strong>{{ character.characteristics[id] }}</strong>
            <small>Half {{ getHalfValue(character.characteristics[id]) }} · Fifth {{ getFifthValue(character.characteristics[id]) }}</small>
          </article>
        </div>
        <p v-else class="empty-state">尚无最终属性。</p>
        <dl v-if="derived" class="derived-strip">
          <div><dt>Maximum HP</dt><dd>{{ derived.maxHp }}</dd></div>
          <div><dt>Initial MP</dt><dd>{{ derived.initialMp }}</dd></div>
          <div><dt>Maximum SAN</dt><dd>{{ maximumSanity }}</dd></div>
          <div><dt>MOV</dt><dd>{{ derived.movement.status === 'value' ? derived.movement.value : '需 KP 裁定' }}</dd></div>
          <div><dt>Damage Bonus</dt><dd>{{ formatDamageBonus(derived.damageBonus) }}</dd></div>
          <div><dt>Build</dt><dd>{{ derived.build }}</dd></div>
        </dl>
        <p v-else-if="character.characteristics" class="muted">当前资料不足，或此 Setting 尚无可可靠派生的 Standard 数值。</p>
      </section>

      <FinalSheetSkillWorkspace :character="character" />

      <section class="sheet-secondary-grid">
        <FinalSheetBackstoryWorkspace class="sheet-backstory-workspace" :character="character" />
        <FinalSheetWealthWorkspace :character="character" />
        <FinalSheetPossessionsWorkspace :character="character" />
        <FinalSheetWeaponWorkspace :character="character" />
      </section>
    </template>
  </section>
</template>
