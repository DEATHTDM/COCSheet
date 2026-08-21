<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useCharacterStore } from "../../app/stores/characterStore";
import { deriveStandardInitialWealth } from "../../coc7/rules/wealth";
import type {
  Character,
  CharacterAssetEntry,
  CharacterPossessionEntry,
  CharacterWeaponInstance,
} from "../../coc7/types/character";
import {
  weaponCategoryIds,
  type WeaponCategoryId,
  type WeaponDefinition,
} from "../../coc7/types/weapon";
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
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  formatWeaponReferencePrice,
  formatWeaponSkillRef,
  filterWeaponDefinitions,
  isWeaponAvailableInEra,
  isWeaponEraId,
  presentCharacterWeapon,
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "../../content/weaponPresentation";
import { getWeaponRegistry } from "../../content/weaponRegistry";

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
const weaponSearch = ref("");
const weaponCategory = ref<WeaponCategoryId | "">("");
const editingWeaponId = ref<string>();
const editingWeaponNotes = ref("");
const actionError = ref("");

const weaponRegistry = computed(() => getWeaponRegistry(props.character.settingId));
const weaponSkillRegistry = computed(() => getSkillRegistry(props.character.settingId));
const ownedWeapons = computed(() => (props.character.weapons ?? []).map((instance) =>
  presentCharacterWeapon(
    instance,
    weaponRegistry.value,
    weaponSkillRegistry.value,
    props.character.eraId,
  ),
));
const filteredWeaponDefinitions = computed(() => {
  return filterWeaponDefinitions(
    weaponRegistry.value.definitions,
    weaponSkillRegistry.value,
    weaponSearch.value,
    weaponCategory.value || undefined,
  );
});

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

function weaponAvailability(definition: WeaponDefinition) {
  return isWeaponEraId(props.character.eraId)
    ? isWeaponAvailableInEra(definition, props.character.eraId)
    : undefined;
}

function weaponAvailabilityLabel(definition: WeaponDefinition): string {
  const availability = weaponAvailability(definition);
  return availability ? weaponAvailabilityLabels[availability] : "时代未指定";
}

function weaponCategoryLabel(definition: WeaponDefinition | undefined): string {
  return definition ? weaponCategoryLabels[definition.category] : "未知类别";
}

async function addWeapon(definition: WeaponDefinition): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.addWeapon(props.character.id, definition.id);
  } catch (error: unknown) {
    reportError(error, "添加武器失败。");
  }
}

function beginEditingWeapon(instance: CharacterWeaponInstance): void {
  editingWeaponId.value = instance.id;
  editingWeaponNotes.value = instance.notes ?? "";
  actionError.value = "";
}

function cancelEditingWeapon(): void {
  editingWeaponId.value = undefined;
  editingWeaponNotes.value = "";
}

async function saveWeaponNotes(instanceId: string): Promise<void> {
  actionError.value = "";
  try {
    await characterStore.updateWeaponNotes(
      props.character.id,
      instanceId,
      editingWeaponNotes.value,
    );
    cancelEditingWeapon();
  } catch (error: unknown) {
    reportError(error, "保存武器备注失败。");
  }
}

async function removeWeapon(instance: CharacterWeaponInstance, name: string): Promise<void> {
  if (!window.confirm(`删除武器“${name}”？`)) return;
  actionError.value = "";
  try {
    await characterStore.removeWeapon(props.character.id, instance.id);
    if (editingWeaponId.value === instance.id) cancelEditingWeapon();
  } catch (error: unknown) {
    reportError(error, "删除武器失败。");
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
      <p>财富、普通随身物品与武器分别保存；武器规则数据始终来自当前 Setting 的目录。</p>
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

    <section class="panel form-stack weapon-section">
      <header>
        <h3>武器</h3>
        <p class="muted">
          武器不与普通随身物品或财富自动同步；参考价格只用于查阅，不会自动扣除现金。
        </p>
      </header>

      <div v-if="ownedWeapons.length" class="weapon-owned-list">
        <article
          v-for="item in ownedWeapons"
          :key="item.instance.id"
          class="weapon-card owned"
          :class="{ unavailable: item.eraAvailability === 'unavailable', orphaned: item.orphaned }"
        >
          <header class="section-heading">
            <div>
              <h4>{{ item.name }}</h4>
              <p v-if="item.orphaned" class="warning-message">
                当前 Setting 的武器目录中找不到 definition：{{ item.instance.definitionId }}。
                实例仍被保留，可以编辑备注或删除。
              </p>
              <div v-else class="weapon-badges">
                <span class="occupation-badge">{{ weaponCategoryLabel(item.definition) }}</span>
                <span
                  v-if="item.eraAvailability"
                  class="occupation-badge"
                  :class="{
                    approval: item.eraAvailability === 'rare',
                    banned: item.eraAvailability === 'unavailable',
                  }"
                >{{ weaponAvailabilityLabels[item.eraAvailability] }}</span>
                <span v-else class="occupation-badge">时代未指定</span>
              </div>
            </div>
            <div class="actions background-entry-actions">
              <button class="button" type="button" @click="beginEditingWeapon(item.instance)">编辑备注</button>
              <button class="button danger" type="button" @click="removeWeapon(item.instance, item.name)">删除</button>
            </div>
          </header>

          <dl v-if="item.definition" class="weapon-mechanics-grid">
            <div><dt>技能</dt><dd>{{ item.skillLabel }}</dd></div>
            <div><dt>伤害</dt><dd>{{ item.definition.damage }}</dd></div>
            <div><dt>基础射程</dt><dd>{{ item.definition.baseRange }}</dd></div>
            <div><dt>每轮攻击</dt><dd>{{ item.definition.attacksPerRound }}</dd></div>
            <div><dt>弹容量</dt><dd>{{ item.definition.capacity ?? '—' }}</dd></div>
            <div><dt>贯穿</dt><dd>{{ item.definition.impales ? '是' : '否' }}</dd></div>
            <div><dt>故障值</dt><dd>{{ item.definition.malfunction ?? '—' }}</dd></div>
            <div><dt>参考价格</dt><dd>{{ formatWeaponReferencePrice(item.definition, character.eraId) }}</dd></div>
          </dl>

          <template v-if="editingWeaponId === item.instance.id">
            <label class="field">
              <span>人物级备注（可选）</span>
              <textarea v-model="editingWeaponNotes" rows="2"></textarea>
            </label>
            <div class="actions">
              <button class="button primary" type="button" @click="saveWeaponNotes(item.instance.id)">保存备注</button>
              <button class="button" type="button" @click="cancelEditingWeapon">取消</button>
            </div>
          </template>
          <p v-else-if="item.instance.notes" class="weapon-instance-notes">
            <strong>备注：</strong>{{ item.instance.notes }}
          </p>
        </article>
      </div>
      <p v-else class="empty-state">尚未持有武器。零武器是合法状态。</p>

      <section class="weapon-catalog form-stack" aria-label="武器目录">
        <header>
          <h4>从当前 Setting 目录添加</h4>
          <p v-if="!weaponRegistry.definitions.length" class="empty-state">
            当前 Setting 尚未提供武器目录，不会显示 Standard 武器。
          </p>
        </header>

        <template v-if="weaponRegistry.definitions.length">
          <div class="weapon-filter-bar">
            <label class="field">
              <span>名称搜索</span>
              <input
                v-model="weaponSearch"
                type="search"
                autocomplete="off"
                placeholder="搜索中文名、英文名、技能或 ID"
              />
            </label>
            <label class="field">
              <span>Category</span>
              <select v-model="weaponCategory">
                <option value="">全部类别</option>
                <option v-for="category in weaponCategoryIds" :key="category" :value="category">
                  {{ weaponCategoryLabels[category] }}
                </option>
              </select>
            </label>
          </div>
          <p class="muted">找到 {{ filteredWeaponDefinitions.length }} / {{ weaponRegistry.definitions.length }} 项。</p>

          <div v-if="filteredWeaponDefinitions.length" class="weapon-catalog-grid">
            <article
              v-for="definition in filteredWeaponDefinitions"
              :key="definition.id"
              class="weapon-card catalog"
              :class="{ unavailable: weaponAvailability(definition) === 'unavailable' }"
            >
              <header class="section-heading">
                <div>
                  <h4>{{ definition.name.zh }}</h4>
                  <p v-if="definition.name.en" class="muted">{{ definition.name.en }}</p>
                </div>
                <button
                  class="button"
                  type="button"
                  @click="addWeapon(definition)"
                >添加</button>
              </header>
              <div class="weapon-badges">
                <span class="occupation-badge">{{ weaponCategoryLabels[definition.category] }}</span>
                <span
                  v-if="weaponAvailability(definition)"
                  class="occupation-badge"
                  :class="{
                    approval: weaponAvailability(definition) === 'rare',
                    banned: weaponAvailability(definition) === 'unavailable',
                  }"
                >{{ weaponAvailabilityLabel(definition) }}</span>
                <span v-else class="occupation-badge">时代未指定</span>
              </div>
              <dl class="weapon-mechanics-grid compact">
                <div><dt>技能</dt><dd>{{ formatWeaponSkillRef(definition, weaponSkillRegistry) }}</dd></div>
                <div><dt>伤害</dt><dd>{{ definition.damage }}</dd></div>
                <div><dt>射程</dt><dd>{{ definition.baseRange }}</dd></div>
                <div><dt>弹容量</dt><dd>{{ definition.capacity ?? '—' }}</dd></div>
              </dl>
              <p v-if="weaponAvailability(definition) === 'unavailable'" class="warning-message">
                当前时代标记为不可用；该标记仅供规则查阅，不阻止记录到人物卡。
              </p>
            </article>
          </div>
          <p v-else class="empty-state">没有符合当前搜索与类别筛选的武器。</p>
        </template>
      </section>
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
