<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useCharacterStore } from "../../app/stores/characterStore";
import { deriveStandardInitialWealth } from "../../coc7/rules/wealth";
import type {
  Character,
  CharacterAssetEntry,
  CharacterPossessionEntry,
} from "../../coc7/types/character";
import type {
  CharacterAssetEntryInput,
  CharacterPossessionEntryInput,
} from "../../app/stores/characterStore";
import {
  formatStandardInitialAssets,
  formatStandardMoney,
  parseStandardMoneyInput,
  standardLifestyleLabels,
  standardMoneyInputValue,
} from "../../creation/presentation/wealthPresentation";
import {
  getFinalCreditRating,
  isCreationWealthInitializationCurrent,
  isStandardWealthEraId,
  validateCreationWealth,
} from "../../creation/rules/creationWealth";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const cashInput = ref("");
const assetsInput = ref("");
const newDescription = ref("");
const newValue = ref("");
const editingEntryId = ref<string>();
const editingDescription = ref("");
const editingValue = ref("");
const newPossessionName = ref("");
const newPossessionNotes = ref("");
const editingPossessionId = ref<string>();
const editingPossessionName = ref("");
const editingPossessionNotes = ref("");
const actionError = ref("");

const initialization = computed(() => creationStore.current?.data.wealthInitialization);
const creditRating = computed(() => getFinalCreditRating(props.character));
const officialWealth = computed(() => {
  if (!isStandardWealthEraId(props.character.eraId) || creditRating.value === undefined) {
    return undefined;
  }
  try {
    return deriveStandardInitialWealth(props.character.eraId, creditRating.value);
  } catch {
    return undefined;
  }
});
const initializationIsCurrent = computed(() => isCreationWealthInitializationCurrent(
  props.character.eraId,
  creditRating.value,
  initialization.value,
));
const isStale = computed(() => Boolean(props.character.wealth) && !initializationIsCurrent.value);
const validation = computed(() => validateCreationWealth(props.character, initialization.value));

watch(
  () => props.character.wealth,
  (wealth) => {
    cashInput.value = wealth ? standardMoneyInputValue(wealth.cashMinorUnits) : "";
    assetsInput.value = wealth ? standardMoneyInputValue(wealth.assetsMinorUnits) : "";
  },
  { immediate: true },
);

function reportError(error: unknown, fallback: string): void {
  actionError.value = error instanceof Error ? error.message : fallback;
}

async function initializeWealth(): Promise<void> {
  if (props.character.wealth && !window.confirm(
    "重新初始化会重置当前 Cash 与 Assets 总额；已有资产构成说明会保留，但请重新核对。是否继续？",
  )) return;
  actionError.value = "";
  try {
    await creationStore.initializeCurrentStandardWealth();
    await characterStore.loadById(props.character.id);
  } catch (error: unknown) {
    reportError(error, "初始化财富失败。");
  }
}

async function saveCash(): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.setCurrentCash(
      props.character.id,
      parseStandardMoneyInput(cashInput.value),
    );
  } catch (error: unknown) {
    reportError(error, "保存当前现金失败。");
  }
}

async function saveAssets(): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.setCurrentAssets(
      props.character.id,
      parseStandardMoneyInput(assetsInput.value),
    );
  } catch (error: unknown) {
    reportError(error, "保存当前资产失败。");
  }
}

function optionalValueMinorUnits(value: string): number | undefined {
  return value.trim() ? parseStandardMoneyInput(value) : undefined;
}

function assetEntryInput(description: string, value: string): CharacterAssetEntryInput {
  const valueMinorUnits = optionalValueMinorUnits(value);
  return {
    description,
    ...(valueMinorUnits === undefined ? {} : { valueMinorUnits }),
  };
}

async function addAssetEntry(): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.addAssetEntry(
      props.character.id,
      assetEntryInput(newDescription.value, newValue.value),
    );
    newDescription.value = "";
    newValue.value = "";
  } catch (error: unknown) {
    reportError(error, "添加资产构成失败。");
  }
}

function beginEditing(entry: CharacterAssetEntry): void {
  editingEntryId.value = entry.id;
  editingDescription.value = entry.description;
  editingValue.value = entry.valueMinorUnits === undefined
    ? ""
    : standardMoneyInputValue(entry.valueMinorUnits);
  actionError.value = "";
}

function cancelEditing(): void {
  editingEntryId.value = undefined;
  editingDescription.value = "";
  editingValue.value = "";
}

async function saveAssetEntry(entryId: string): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.updateAssetEntry(
      props.character.id,
      entryId,
      assetEntryInput(editingDescription.value, editingValue.value),
    );
    cancelEditing();
  } catch (error: unknown) {
    reportError(error, "保存资产构成失败。");
  }
}

async function removeAssetEntry(entry: CharacterAssetEntry): Promise<void> {
  if (!window.confirm(`删除资产构成“${entry.description}”？`)) return;
  actionError.value = "";
  try {
    await characterStore.removeAssetEntry(props.character.id, entry.id);
    if (editingEntryId.value === entry.id) cancelEditing();
  } catch (error: unknown) {
    reportError(error, "删除资产构成失败。");
  }
}

function possessionEntryInput(name: string, notes: string): CharacterPossessionEntryInput {
  return { name, ...(notes.trim() ? { notes } : {}) };
}

async function addPossessionEntry(): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.addPossessionEntry(
      props.character.id,
      possessionEntryInput(newPossessionName.value, newPossessionNotes.value),
    );
    newPossessionName.value = "";
    newPossessionNotes.value = "";
  } catch (error: unknown) {
    reportError(error, "添加随身物品失败。");
  }
}

function beginEditingPossession(entry: CharacterPossessionEntry): void {
  editingPossessionId.value = entry.id;
  editingPossessionName.value = entry.name;
  editingPossessionNotes.value = entry.notes ?? "";
  actionError.value = "";
}

function cancelEditingPossession(): void {
  editingPossessionId.value = undefined;
  editingPossessionName.value = "";
  editingPossessionNotes.value = "";
}

async function savePossessionEntry(entryId: string): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.updatePossessionEntry(
      props.character.id,
      entryId,
      possessionEntryInput(editingPossessionName.value, editingPossessionNotes.value),
    );
    cancelEditingPossession();
  } catch (error: unknown) {
    reportError(error, "保存随身物品失败。");
  }
}

async function removePossessionEntry(entry: CharacterPossessionEntry): Promise<void> {
  if (!window.confirm(`删除随身物品“${entry.name}”？`)) return;
  actionError.value = "";
  try {
    await characterStore.removePossessionEntry(props.character.id, entry.id);
    if (editingPossessionId.value === entry.id) cancelEditingPossession();
  } catch (error: unknown) {
    reportError(error, "删除随身物品失败。");
  }
}

async function returnToBackground(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("background");
  } catch (error: unknown) {
    reportError(error, "返回背景失败。");
  }
}

async function completePossessions(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.completePossessions();
  } catch (error: unknown) {
    reportError(error, "完成财富与物品步骤失败。");
  }
}
</script>

<template>
  <section class="page-stack possessions-step">
    <header class="panel form-stack compact-stack">
      <div>
        <p class="eyebrow">Possessions</p>
        <h2>财富与物品</h2>
      </div>
      <p>普通随身物品可自由填写；武器因具有独立规则数据，将在后续单独处理。</p>
    </header>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>

    <section class="panel form-stack">
      <h3>当前规则基准</h3>
      <dl class="review-summary-grid">
        <div><dt>Credit Rating</dt><dd>{{ creditRating ?? '—' }}</dd></div>
        <div><dt>Lifestyle</dt><dd>{{ officialWealth ? standardLifestyleLabels[officialWealth.lifestyle] : '—' }}</dd></div>
        <div><dt>Spending Level</dt><dd>{{ officialWealth ? formatStandardMoney(officialWealth.spendingLevelMinorUnits) : '—' }}</dd></div>
        <div><dt>官方初始 Cash</dt><dd>{{ officialWealth ? formatStandardMoney(officialWealth.cashMinorUnits) : '—' }}</dd></div>
        <div><dt>官方初始 Assets</dt><dd>{{ officialWealth ? formatStandardInitialAssets(officialWealth.assets) : '—' }}</dd></div>
      </dl>
    </section>

    <section v-if="isStale" class="panel form-stack legacy-warning" role="alert">
      <strong>当前财富已失效</strong>
      <p>当前财富基于旧的时代或 Credit Rating，请重新初始化财富。</p>
      <p>重新初始化会重置 Cash / Assets 总额，但会保留资产构成说明，请随后重新核对。</p>
      <button class="button danger" type="button" @click="initializeWealth">
        重新按当前 Credit Rating 初始化
      </button>
    </section>

    <section v-else-if="!character.wealth" class="panel form-stack">
      <h3>初始化财富</h3>
      <p>财富不会在载入页面时自动生成。请确认当前最终 Credit Rating 后显式初始化。</p>
      <button
        class="button primary"
        type="button"
        :disabled="!officialWealth"
        @click="initializeWealth"
      >按当前 Credit Rating 初始化财富</button>
    </section>

    <template v-if="character.wealth">
      <section class="panel form-stack">
        <div class="section-heading">
          <div>
            <h3>当前财富</h3>
            <p v-if="initializationIsCurrent" class="success-message">与当前时代及 Credit Rating 一致。</p>
          </div>
        </div>
        <div class="wealth-edit-grid">
          <label class="field">
            <span>Cash（美元）</span>
            <input v-model="cashInput" inputmode="decimal" autocomplete="off" @change="saveCash" />
            <small>{{ formatStandardMoney(character.wealth.cashMinorUnits) }}</small>
          </label>
          <label class="field">
            <span>Assets（美元）</span>
            <input v-model="assetsInput" inputmode="decimal" autocomplete="off" @change="saveAssets" />
            <small>{{ formatStandardMoney(character.wealth.assetsMinorUnits) }}</small>
          </label>
        </div>
        <p class="muted">消费水平不是每日扣款；低于该水平的日常开销通常无需逐笔记录。</p>
      </section>

      <section class="panel form-stack">
        <header>
          <h3>资产构成</h3>
          <p class="muted">
            说明资产的具体形式，例如“波士顿公寓”“福特汽车”“银行投资”或“家族地产”。
            单项估值可留空，条目估值总和不必等于 Assets 总额。
          </p>
        </header>

        <ul v-if="character.wealth.assetEntries.length" class="background-entry-list">
          <li v-for="entry in character.wealth.assetEntries" :key="entry.id" class="background-entry">
            <template v-if="editingEntryId === entry.id">
              <div class="wealth-edit-grid">
                <label class="field">
                  <span>资产描述</span>
                  <input v-model="editingDescription" type="text" autocomplete="off" />
                </label>
                <label class="field">
                  <span>估值（美元，可选）</span>
                  <input v-model="editingValue" inputmode="decimal" autocomplete="off" />
                </label>
              </div>
              <div class="actions">
                <button class="button primary" type="button" @click="saveAssetEntry(entry.id)">保存</button>
                <button class="button" type="button" @click="cancelEditing">取消</button>
              </div>
            </template>
            <template v-else>
              <div class="background-entry-text">
                <strong>{{ entry.description }}</strong>
                <span>{{ entry.valueMinorUnits === undefined ? '未精确估价' : formatStandardMoney(entry.valueMinorUnits) }}</span>
              </div>
              <div class="actions background-entry-actions">
                <button class="button" type="button" @click="beginEditing(entry)">编辑</button>
                <button class="button danger" type="button" @click="removeAssetEntry(entry)">删除</button>
              </div>
            </template>
          </li>
        </ul>
        <p v-else class="empty-state">尚未填写资产构成。</p>

        <div class="wealth-edit-grid">
          <label class="field">
            <span>添加资产描述</span>
            <input v-model="newDescription" type="text" autocomplete="off" placeholder="例如：波士顿公寓" />
          </label>
          <label class="field">
            <span>估值（美元，可选）</span>
            <input v-model="newValue" inputmode="decimal" autocomplete="off" placeholder="例如：25000" />
          </label>
        </div>
        <button
          class="button"
          type="button"
          :disabled="!newDescription.trim()"
          @click="addAssetEntry"
        >添加资产</button>
      </section>
    </template>

    <section class="panel form-stack">
      <header>
        <h3>随身物品与装备</h3>
        <p class="muted">
          这里用于记录调查员通常携带、拥有或在冒险中取得的普通用品。
          系统不会建立商品目录，也不会自动从现金中扣款。
        </p>
      </header>

      <ul v-if="character.possessions?.length" class="background-entry-list">
        <li v-for="entry in character.possessions" :key="entry.id" class="background-entry">
          <template v-if="editingPossessionId === entry.id">
            <div class="wealth-edit-grid">
              <label class="field">
                <span>名称</span>
                <input v-model="editingPossessionName" type="text" autocomplete="off" />
              </label>
              <label class="field">
                <span>备注（可选）</span>
                <textarea v-model="editingPossessionNotes" rows="2"></textarea>
              </label>
            </div>
            <div class="actions">
              <button class="button primary" type="button" @click="savePossessionEntry(entry.id)">保存</button>
              <button class="button" type="button" @click="cancelEditingPossession">取消</button>
            </div>
          </template>
          <template v-else>
            <div class="background-entry-text">
              <strong>{{ entry.name }}</strong>
              <span v-if="entry.notes">{{ entry.notes }}</span>
            </div>
            <div class="actions background-entry-actions">
              <button class="button" type="button" @click="beginEditingPossession(entry)">编辑</button>
              <button class="button danger" type="button" @click="removePossessionEntry(entry)">删除</button>
            </div>
          </template>
        </li>
      </ul>
      <p v-else class="empty-state">尚未记录普通随身物品。</p>

      <div class="wealth-edit-grid">
        <label class="field">
          <span>名称</span>
          <input
            v-model="newPossessionName"
            type="text"
            autocomplete="off"
            placeholder="例如：莱卡相机"
          />
        </label>
        <label class="field">
          <span>备注（可选）</span>
          <textarea
            v-model="newPossessionNotes"
            rows="2"
            placeholder="例如：随身携带，另有两卷胶卷"
          ></textarea>
        </label>
      </div>
      <button
        class="button"
        type="button"
        :disabled="!newPossessionName.trim()"
        @click="addPossessionEntry"
      >添加随身物品</button>
    </section>

    <footer class="panel form-stack compact-stack">
      <ul v-if="validation.errors.length" class="validation-list">
        <li v-for="error in validation.errors" :key="error.code">{{ error.message }}</li>
      </ul>
      <div class="section-heading">
        <button class="button" type="button" @click="returnToBackground">返回背景</button>
        <button
          class="button primary"
          type="button"
          :disabled="!validation.valid"
          @click="completePossessions"
        >继续：查看调查员</button>
      </div>
    </footer>
  </section>
</template>
