<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  deriveFinalSheetStandardValues,
  getCharacterCreationStatus,
  getFinalSheetCthulhuMythos,
  getFinalSheetMaximumSanity,
} from "../character-sheet/presentation/finalCharacterSheetPresentation";
import FinalSheetBackstoryWorkspace from "../components/FinalSheetBackstoryWorkspace.vue";
import FinalSheetIdentityEditor from "../components/FinalSheetIdentityEditor.vue";
import FinalSheetPossessionsWorkspace from "../components/FinalSheetPossessionsWorkspace.vue";
import FinalSheetSkillWorkspace from "../components/FinalSheetSkillWorkspace.vue";
import FinalSheetWeaponWorkspace from "../components/FinalSheetWeaponWorkspace.vue";
import FinalSheetWealthWorkspace from "../components/FinalSheetWealthWorkspace.vue";
import { getFifthValue, getHalfValue } from "../coc7/rules/attributes";
import { formatDamageBonus } from "../coc7/rules/derived";
import { characteristicIds } from "../coc7/types/attribute";
import { getSettingPackOrThrow } from "../content/registry";
import { useCreationStore } from "../creation/stores/creationStore";

type ResourceId = "hp" | "mp" | "san";

const route = useRoute();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const characterId = computed(() => String(route.params.id));
const ready = ref(false);
const errorMessage = ref("");
const sessionWarning = ref("");
const resourceError = ref("");
const resourceSaving = ref<ResourceId>();
const resourceDrafts = reactive<Record<ResourceId, string | number>>({ hp: "", mp: "", san: "" });

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
const cthulhuMythos = computed(() => character.value
  ? getFinalSheetCthulhuMythos(character.value)
  : 0);
const maximumSanity = computed(() => character.value
  ? getFinalSheetMaximumSanity(character.value)
  : 99);
const sanityNeedsReconciliation = computed(() => {
  const currentSan = character.value?.resources?.san.current;
  return currentSan !== undefined && currentSan > maximumSanity.value;
});

function synchronizeResourceDrafts(): void {
  const resources = character.value?.resources;
  resourceDrafts.hp = resources ? String(resources.hp.current) : "";
  resourceDrafts.mp = resources ? String(resources.mp.current) : "";
  resourceDrafts.san = resources ? String(resources.san.current) : "";
}

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
    synchronizeResourceDrafts();
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
watch(
  () => character.value?.resources,
  () => synchronizeResourceDrafts(),
  { deep: true },
);

async function saveResource(resource: ResourceId): Promise<void> {
  const draft = String(resourceDrafts[resource]).trim();
  resourceError.value = "";
  if (!/^\d+$/.test(draft)) {
    resourceError.value = "资源值必须是非负整数。";
    return;
  }
  const value = Number(draft);
  resourceSaving.value = resource;
  try {
    if (resource === "hp") await characterStore.setCurrentHp(characterId.value, value);
    if (resource === "mp") await characterStore.setCurrentMp(characterId.value, value);
    if (resource === "san") await characterStore.setCurrentSan(characterId.value, value);
    synchronizeResourceDrafts();
  } catch (error: unknown) {
    resourceError.value = error instanceof Error ? error.message : "保存资源失败。";
    synchronizeResourceDrafts();
  } finally {
    resourceSaving.value = undefined;
  }
}

async function reconcileSanity(): Promise<void> {
  resourceError.value = "";
  resourceSaving.value = "san";
  try {
    await characterStore.reconcileSanityToMaximum(characterId.value);
    synchronizeResourceDrafts();
  } catch (error: unknown) {
    resourceError.value = error instanceof Error ? error.message : "同步 SAN 上限失败。";
  } finally {
    resourceSaving.value = undefined;
  }
}
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
        <section class="panel resource-panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Game-time Resources</p>
              <h2>当前资源</h2>
            </div>
            <div class="luck-value"><span>Luck</span><strong>{{ character.luck ?? '—' }}</strong></div>
          </div>

          <div v-if="character.resources" class="resource-grid">
            <div class="resource-editor">
              <label for="sheet-current-hp">HP <small>/ {{ derived?.maxHp ?? '—' }}</small></label>
              <input id="sheet-current-hp" v-model="resourceDrafts.hp" type="number" min="0" :max="derived?.maxHp" :disabled="resourceSaving !== undefined || !character.characteristics">
              <button class="button" type="button" :disabled="resourceSaving !== undefined || !character.characteristics" @click="saveResource('hp')">保存</button>
            </div>
            <div class="resource-editor">
              <label for="sheet-current-mp">MP <small>起始 {{ derived?.initialMp ?? '—' }}</small></label>
              <input id="sheet-current-mp" v-model="resourceDrafts.mp" type="number" min="0" :disabled="resourceSaving !== undefined">
              <button class="button" type="button" :disabled="resourceSaving !== undefined" @click="saveResource('mp')">保存</button>
            </div>
            <div class="resource-editor">
              <label for="sheet-current-san">SAN <small>/ {{ maximumSanity }}</small></label>
              <input id="sheet-current-san" v-model="resourceDrafts.san" type="number" min="0" :max="maximumSanity" :disabled="resourceSaving !== undefined">
              <button class="button" type="button" :disabled="resourceSaving !== undefined" @click="saveResource('san')">保存</button>
            </div>
          </div>
          <p v-else class="empty-state">尚未初始化 HP、MP 与 SAN；打开人物卡不会自动补写。</p>
          <p v-if="resourceError" class="error-message" role="alert">{{ resourceError }}</p>
          <aside v-if="sanityNeedsReconciliation" class="legacy-warning" role="alert">
            <strong>旧版本 SAN 数据尚未同步</strong>
            <p>当前 SAN 高于克苏鲁神话 {{ cthulhuMythos }} 所允许的最大理智 {{ maximumSanity }}；在你明确同步前不会修改记录。</p>
            <button class="button" type="button" :disabled="resourceSaving !== undefined" @click="reconcileSanity">同步至 {{ maximumSanity }}</button>
          </aside>
        </section>

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
