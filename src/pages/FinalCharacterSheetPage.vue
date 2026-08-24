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
import { characteristicIds, type CharacteristicId } from "../coc7/types/attribute";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
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
  ? getHistoricalSettingLabel(character.value.settingId)
  : "");
const derived = computed(() => character.value
  ? deriveFinalSheetStandardValues(character.value)
  : undefined);
const maximumSanity = computed(() => character.value
  ? getFinalSheetMaximumSanity(character.value)
  : 99);
const characteristicLabels: Readonly<Record<CharacteristicId, string>> = {
  STR: "力量（STR）",
  CON: "体质（CON）",
  SIZ: "体型（SIZ）",
  DEX: "敏捷（DEX）",
  APP: "外貌（APP）",
  INT: "智力（INT）",
  POW: "意志（POW）",
  EDU: "教育（EDU）",
};

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
          <p class="eyebrow">人物卡</p>
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
        <p>这里显示目前已经保存的人物资料；尚未完成的内容不会自动补齐。</p>
        <RouterLink class="button primary" :to="`/characters/${character.id}`">继续建卡</RouterLink>
      </aside>
      <aside v-else-if="creationStatus === 'missing-session'" class="panel incomplete-sheet-notice">
        <strong>这张人物卡没有可继续的建卡进度</strong>
        <p>你仍然可以查看和维护人物卡，但无法返回原建卡流程。</p>
      </aside>
      <p v-if="sessionWarning" class="warning-message" role="status">{{ sessionWarning }}</p>

      <section class="sheet-priority-grid">
        <FinalSheetResourceWorkspace :character="character" />

        <FinalSheetIdentityEditor :character="character" />
      </section>

      <section class="panel">
        <div class="section-heading">
          <div><p class="eyebrow">调查员属性</p><h2>属性与派生值</h2></div>
        </div>
        <div v-if="character.characteristics" class="sheet-characteristic-grid">
          <article v-for="id in characteristicIds" :key="id" class="sheet-characteristic-card">
            <span>{{ characteristicLabels[id] }}</span>
            <strong>{{ character.characteristics[id] }}</strong>
            <small>困难 {{ getHalfValue(character.characteristics[id]) }} · 极难 {{ getFifthValue(character.characteristics[id]) }}</small>
          </article>
        </div>
        <p v-else class="empty-state">尚无最终属性。</p>
        <dl v-if="derived" class="derived-strip">
          <div><dt>生命值上限（HP）</dt><dd>{{ derived.maxHp }}</dd></div>
          <div><dt>起始魔法值（MP）</dt><dd>{{ derived.initialMp }}</dd></div>
          <div><dt>理智上限（SAN）</dt><dd>{{ maximumSanity }}</dd></div>
          <div><dt>移动力</dt><dd>{{ derived.movement.status === 'value' ? derived.movement.value : '需守秘人裁定' }}</dd></div>
          <div><dt>伤害加值</dt><dd>{{ formatDamageBonus(derived.damageBonus) }}</dd></div>
          <div><dt>体格</dt><dd>{{ derived.build }}</dd></div>
        </dl>
        <p v-else-if="character.characteristics" class="muted">现有资料不足，或这套规则环境暂时无法可靠计算派生数值。</p>
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
