<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import { deriveFinalSheetStandardWealth } from "../character-sheet/presentation/finalCharacterSheetPresentation";
import type { Character, CharacterAssetEntry } from "../coc7/types/character";
import {
  formatStandardMoney,
  parseStandardMoneyInput,
  standardLifestyleLabels,
  standardMoneyInputValue,
} from "../creation/presentation/wealthPresentation";
import { getFinalCreditRating } from "../creation/rules/creationWealth";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const initializationCash = ref("");
const initializationAssets = ref("");
const cashInput = ref("");
const assetsInput = ref("");
const newDescription = ref("");
const newValue = ref("");
const editingEntryId = ref<string>();
const editingDescription = ref("");
const editingValue = ref("");
const busyAction = ref<string>();
const actionError = ref("");
const actionStatus = ref("");

const isStandard = computed(() => props.character.settingId === "standard");
const creditRating = computed(() => getFinalCreditRating(props.character));
const wealthRule = computed(() => deriveFinalSheetStandardWealth(props.character));

watch(
  () => props.character.wealth,
  (wealth) => {
    cashInput.value = wealth ? standardMoneyInputValue(wealth.cashMinorUnits) : "";
    assetsInput.value = wealth ? standardMoneyInputValue(wealth.assetsMinorUnits) : "";
  },
  { immediate: true, deep: true },
);

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
    actionError.value = error instanceof Error ? error.message : "保存财富失败。";
  } finally {
    busyAction.value = undefined;
  }
}

function optionalMoney(value: string): number | undefined {
  return value.trim() ? parseStandardMoneyInput(value) : undefined;
}

async function initializeWealth(): Promise<void> {
  await run("initialize", async () => {
    await characterStore.initializeCurrentWealth(
      props.character.id,
      parseStandardMoneyInput(initializationCash.value),
      parseStandardMoneyInput(initializationAssets.value),
    );
    initializationCash.value = "";
    initializationAssets.value = "";
  }, "当前长期财富记录已建立。");
}

async function saveCash(): Promise<void> {
  await run("cash", () => characterStore.setCurrentCash(
    props.character.id,
    parseStandardMoneyInput(cashInput.value),
  ), "现金已保存。");
}

async function saveAssets(): Promise<void> {
  await run("assets", () => characterStore.setCurrentAssets(
    props.character.id,
    parseStandardMoneyInput(assetsInput.value),
  ), "资产总额已保存。");
}

async function addAsset(): Promise<void> {
  await run("asset:add", async () => {
    const valueMinorUnits = optionalMoney(newValue.value);
    await characterStore.addAssetEntry(props.character.id, {
      description: newDescription.value,
      ...(valueMinorUnits === undefined ? {} : { valueMinorUnits }),
    });
    newDescription.value = "";
    newValue.value = "";
  }, "资产条目已添加；资产总额未改变。");
}

function beginEditing(entry: CharacterAssetEntry): void {
  clearMessages();
  editingEntryId.value = entry.id;
  editingDescription.value = entry.description;
  editingValue.value = entry.valueMinorUnits === undefined
    ? ""
    : standardMoneyInputValue(entry.valueMinorUnits);
}

function cancelEditing(): void {
  editingEntryId.value = undefined;
  editingDescription.value = "";
  editingValue.value = "";
  clearMessages();
}

async function saveAsset(entryId: string): Promise<void> {
  await run(`asset:edit:${entryId}`, async () => {
    const valueMinorUnits = optionalMoney(editingValue.value);
    await characterStore.updateAssetEntry(props.character.id, entryId, {
      description: editingDescription.value,
      ...(valueMinorUnits === undefined ? {} : { valueMinorUnits }),
    });
    editingEntryId.value = undefined;
    editingDescription.value = "";
    editingValue.value = "";
  }, "资产条目已保存；资产总额未改变。");
}

async function removeAsset(entry: CharacterAssetEntry): Promise<void> {
  if (!window.confirm(`删除资产“${entry.description}”？资产总额不会改变。`)) return;
  await run(`asset:remove:${entry.id}`, async () => {
    await characterStore.removeAssetEntry(props.character.id, entry.id);
    if (editingEntryId.value === entry.id) cancelEditing();
  }, "资产条目已删除；资产总额未改变。");
}
</script>

<template>
  <section class="panel final-inventory-workspace final-wealth-workspace">
    <div class="section-heading">
      <div>
        <p class="eyebrow">人物卡长期资料</p>
        <h2>财富与资产</h2>
        <p class="muted">现金与资产是人物卡的长期状态；消费水平只作查阅，不会自动扣款。</p>
      </div>
    </div>

    <dl v-if="isStandard" class="sheet-fact-grid final-wealth-rules">
      <div><dt>信用评级</dt><dd>{{ creditRating ?? '—' }}</dd></div>
      <div><dt>生活水平</dt><dd>{{ wealthRule ? standardLifestyleLabels[wealthRule.lifestyle] : '—' }}</dd></div>
      <div><dt>消费水平</dt><dd>{{ wealthRule ? formatStandardMoney(wealthRule.spendingLevelMinorUnits) : '—' }}</dd></div>
    </dl>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message" role="status">{{ actionStatus }}</p>

    <template v-if="isStandard">
      <form v-if="!character.wealth" class="final-inventory-form" data-wealth-initializer @submit.prevent="initializeWealth">
        <div>
          <h3>建立当前财富记录</h3>
          <p class="muted">请明确输入当前金额；不会根据信用评级、时代或旧建卡进度自动填写。</p>
        </div>
        <div class="wealth-edit-grid">
          <label class="field">
            <span>现金（美元）</span>
            <input v-model="initializationCash" name="initial-cash" inputmode="decimal" autocomplete="off" placeholder="例如：125.00" />
          </label>
          <label class="field">
            <span>资产（美元）</span>
            <input v-model="initializationAssets" name="initial-assets" inputmode="decimal" autocomplete="off" placeholder="例如：25000.00" />
          </label>
        </div>
        <button class="button primary" type="submit" :disabled="busyAction !== undefined">{{ busyAction === 'initialize' ? '建立中…' : '建立当前财富记录' }}</button>
      </form>

      <template v-else>
        <div class="wealth-edit-grid final-current-wealth-editors">
          <form class="final-money-editor" @submit.prevent="saveCash">
            <label class="field">
              <span>现金（美元）</span>
              <input v-model="cashInput" name="current-cash" inputmode="decimal" autocomplete="off" />
              <small>{{ formatStandardMoney(character.wealth.cashMinorUnits) }}</small>
            </label>
            <button class="button" type="submit" :disabled="busyAction !== undefined">保存现金</button>
          </form>
          <form class="final-money-editor" @submit.prevent="saveAssets">
            <label class="field">
              <span>资产（美元）</span>
              <input v-model="assetsInput" name="current-assets" inputmode="decimal" autocomplete="off" />
              <small>{{ formatStandardMoney(character.wealth.assetsMinorUnits) }}</small>
            </label>
            <button class="button" type="submit" :disabled="busyAction !== undefined">保存资产</button>
          </form>
        </div>

        <section class="final-inventory-subsection" aria-labelledby="final-assets-heading">
          <header>
            <h3 id="final-assets-heading">资产构成</h3>
            <p class="muted">单项估值可留空；估值总和不必等于资产总额，条目变更也不会调整总额。</p>
          </header>
          <ul v-if="character.wealth.assetEntries.length" class="final-inventory-entry-list">
            <li v-for="entry in character.wealth.assetEntries" :key="entry.id" :data-asset-entry-id="entry.id">
              <template v-if="editingEntryId === entry.id">
                <div class="wealth-edit-grid">
                  <label class="field"><span>资产描述</span><input v-model="editingDescription" type="text" /></label>
                  <label class="field"><span>估值（美元，可选）</span><input v-model="editingValue" inputmode="decimal" /></label>
                </div>
                <div class="actions final-inventory-actions">
                  <button class="button primary" type="button" :disabled="busyAction !== undefined" @click="saveAsset(entry.id)">保存</button>
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="cancelEditing">取消</button>
                </div>
              </template>
              <template v-else>
                <div class="final-inventory-entry-copy">
                  <strong>{{ entry.description }}</strong>
                  <span>{{ entry.valueMinorUnits === undefined ? '未精确估价' : formatStandardMoney(entry.valueMinorUnits) }}</span>
                </div>
                <div class="actions final-inventory-actions">
                  <button class="button" type="button" :disabled="busyAction !== undefined" @click="beginEditing(entry)">编辑</button>
                  <button class="button danger" type="button" :disabled="busyAction !== undefined" @click="removeAsset(entry)">删除</button>
                </div>
              </template>
            </li>
          </ul>
          <p v-else class="empty-state">尚无资产构成说明。</p>
          <div class="wealth-edit-grid final-inventory-add-row">
            <label class="field"><span>添加资产描述</span><input v-model="newDescription" type="text" placeholder="例如：波士顿公寓" /></label>
            <label class="field"><span>估值（美元，可选）</span><input v-model="newValue" inputmode="decimal" placeholder="例如：25000" /></label>
          </div>
          <button class="button" type="button" :disabled="busyAction !== undefined" @click="addAsset">添加资产</button>
        </section>
      </template>
    </template>

    <template v-else>
      <p class="warning-message" role="status">当前规则环境暂不支持编辑财富金额；现有原始金额会保持不变。</p>
      <template v-if="character.wealth">
        <dl class="sheet-fact-grid">
          <div><dt>现金原始值</dt><dd>{{ character.wealth.cashMinorUnits }}</dd></div>
          <div><dt>资产原始值</dt><dd>{{ character.wealth.assetsMinorUnits }}</dd></div>
        </dl>
        <ul v-if="character.wealth.assetEntries.length" class="final-inventory-entry-list readonly">
          <li v-for="entry in character.wealth.assetEntries" :key="entry.id">
            <div class="final-inventory-entry-copy">
              <strong>{{ entry.description }}</strong>
              <span>{{ entry.valueMinorUnits === undefined ? '未记录估值' : entry.valueMinorUnits }}</span>
            </div>
          </li>
        </ul>
      </template>
      <p v-else class="empty-state">这张人物卡没有财富记录，当前规则环境也无法自动创建。</p>
    </template>
  </section>
</template>
