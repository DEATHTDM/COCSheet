<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  deriveFinalSheetStandardValues,
  getFinalSheetCthulhuMythos,
  getFinalSheetMaximumSanity,
} from "../character-sheet/presentation/finalCharacterSheetPresentation";
import type { Character } from "../coc7/types/character";

type ResourceAction = "hp" | "mp" | "san" | "luck";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const busyAction = ref<ResourceAction>();
const actionError = ref("");
const actionStatus = ref("");
const drafts = reactive<Record<ResourceAction, string | number>>({
  hp: "",
  mp: "",
  san: "",
  luck: "",
});

const derived = computed(() => deriveFinalSheetStandardValues(props.character));
const cthulhuMythos = computed(() => getFinalSheetCthulhuMythos(props.character));
const maximumSanity = computed(() => getFinalSheetMaximumSanity(props.character));
const sanityNeedsReconciliation = computed(() => {
  const currentSan = props.character.resources?.san.current;
  return currentSan !== undefined && currentSan > maximumSanity.value;
});

function synchronizeDrafts(): void {
  const resources = props.character.resources;
  drafts.hp = resources ? String(resources.hp.current) : "";
  drafts.mp = resources ? String(resources.mp.current) : "";
  drafts.san = resources ? String(resources.san.current) : "";
  drafts.luck = props.character.luck === undefined ? "" : String(props.character.luck);
}

watch(
  () => props.character.id,
  () => {
    actionError.value = "";
    actionStatus.value = "";
    synchronizeDrafts();
  },
  { immediate: true },
);
watch(
  () => [
    props.character.resources?.hp.current,
    props.character.resources?.mp.current,
    props.character.resources?.san.current,
    props.character.luck,
  ],
  () => synchronizeDrafts(),
);

function parseDraft(action: ResourceAction): number | undefined {
  const draft = String(drafts[action]).trim();
  if (!/^\d+$/.test(draft)) {
    actionError.value = action === "luck"
      ? "当前幸运必须为 0～99 的整数。"
      : "资源值必须是非负整数。";
    return undefined;
  }
  const value = Number(draft);
  if (action === "luck" && value > 99) {
    actionError.value = "当前幸运必须为 0～99 的整数。";
    return undefined;
  }
  return value;
}

async function saveCurrent(action: ResourceAction): Promise<void> {
  if (busyAction.value !== undefined) return;
  actionError.value = "";
  actionStatus.value = "";
  const value = parseDraft(action);
  if (value === undefined) return;

  busyAction.value = action;
  try {
    if (action === "hp") await characterStore.setCurrentHp(props.character.id, value);
    if (action === "mp") await characterStore.setCurrentMp(props.character.id, value);
    if (action === "san") await characterStore.setCurrentSan(props.character.id, value);
    if (action === "luck") await characterStore.setCurrentLuck(props.character.id, value);
    synchronizeDrafts();
    actionStatus.value = `${action === "luck" ? "当前幸运" : action.toUpperCase()}已保存。`;
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "保存当前状态失败。";
    synchronizeDrafts();
  } finally {
    busyAction.value = undefined;
  }
}

async function reconcileSanity(): Promise<void> {
  if (busyAction.value !== undefined) return;
  actionError.value = "";
  actionStatus.value = "";
  busyAction.value = "san";
  try {
    await characterStore.reconcileSanityToMaximum(props.character.id);
    synchronizeDrafts();
    actionStatus.value = "SAN 已同步至当前理智上限。";
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "同步 SAN 上限失败。";
    synchronizeDrafts();
  } finally {
    busyAction.value = undefined;
  }
}
</script>

<template>
  <section class="panel resource-panel final-resource-workspace">
    <div class="section-heading">
      <div>
        <p class="eyebrow">游戏中资源</p>
        <h2>当前资源</h2>
        <p class="muted">直接维护人物当前长期状态。</p>
      </div>
    </div>

    <div class="resource-grid">
      <div v-if="character.resources" class="resource-editor">
        <label for="sheet-current-hp">当前生命值（HP） <small>/ {{ derived?.maxHp ?? '—' }}</small></label>
        <input
          id="sheet-current-hp"
          v-model="drafts.hp"
          aria-label="当前生命值 HP"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          :max="derived?.maxHp"
          :disabled="busyAction !== undefined || !character.characteristics"
        >
        <button class="button" type="button" :disabled="busyAction !== undefined || !character.characteristics" @click="saveCurrent('hp')">
          {{ busyAction === 'hp' ? '保存中…' : '保存' }}
        </button>
      </div>

      <div v-if="character.resources" class="resource-editor">
        <label for="sheet-current-mp">当前魔法值（MP） <small>起始 {{ derived?.initialMp ?? '—' }}</small></label>
        <input
          id="sheet-current-mp"
          v-model="drafts.mp"
          aria-label="当前魔法值 MP"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          :disabled="busyAction !== undefined"
        >
        <button class="button" type="button" :disabled="busyAction !== undefined" @click="saveCurrent('mp')">
          {{ busyAction === 'mp' ? '保存中…' : '保存' }}
        </button>
      </div>

      <div v-if="character.resources" class="resource-editor">
        <label for="sheet-current-san">当前理智（SAN） <small>/ {{ maximumSanity }}</small></label>
        <input
          id="sheet-current-san"
          v-model="drafts.san"
          aria-label="当前理智 SAN"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          :max="maximumSanity"
          :disabled="busyAction !== undefined"
        >
        <button class="button" type="button" :disabled="busyAction !== undefined" @click="saveCurrent('san')">
          {{ busyAction === 'san' ? '保存中…' : '保存' }}
        </button>
      </div>

      <div class="resource-editor luck-editor">
        <label for="sheet-current-luck">当前幸运 <small>0～99</small></label>
        <input
          id="sheet-current-luck"
          v-model="drafts.luck"
          aria-label="当前幸运"
          type="number"
          min="0"
          max="99"
          step="1"
          inputmode="numeric"
          placeholder="尚未记录"
          :disabled="busyAction !== undefined"
        >
        <button class="button" type="button" :disabled="busyAction !== undefined" @click="saveCurrent('luck')">
          {{ busyAction === 'luck' ? '保存中…' : '保存' }}
        </button>
        <small v-if="character.luck === undefined" class="resource-missing-note">尚未记录当前幸运</small>
      </div>
    </div>

    <p class="muted current-luck-guidance">幸运会随游戏过程变化，可在这里手动维护。</p>
    <p v-if="!character.resources" class="empty-state">尚未初始化 HP、MP 与 SAN；打开人物卡不会自动补写。</p>
    <p v-if="actionError" class="error-message final-resource-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message final-resource-message" role="status">{{ actionStatus }}</p>

    <aside v-if="sanityNeedsReconciliation" class="legacy-warning" role="alert">
      <strong>旧版本 SAN 数据尚未同步</strong>
      <p>当前 SAN 高于克苏鲁神话 {{ cthulhuMythos }} 所允许的最大理智 {{ maximumSanity }}；在你明确同步前不会修改记录。</p>
      <button class="button" type="button" :disabled="busyAction !== undefined" @click="reconcileSanity">
        同步至 {{ maximumSanity }}
      </button>
    </aside>
  </section>
</template>
