<script setup lang="ts">
import { computed, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import type { Character, CharacterWeaponInstance } from "../coc7/types/character";
import { weaponCategoryIds, type WeaponCategoryId, type WeaponDefinition } from "../coc7/types/weapon";
import { getSkillRegistry } from "../content/skillRegistry";
import {
  filterWeaponDefinitions,
  formatWeaponReferencePrice,
  formatWeaponSkillRef,
  isWeaponAvailableInEra,
  isWeaponEraId,
  presentCharacterWeapon,
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "../content/weaponPresentation";
import { getWeaponRegistry } from "../content/weaponRegistry";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const search = ref("");
const category = ref<WeaponCategoryId | "">("");
const editingId = ref<string>();
const editingNotes = ref("");
const busyAction = ref<string>();
const actionError = ref("");
const actionStatus = ref("");

const weaponRegistry = computed(() => getWeaponRegistry(props.character.settingId));
const skillRegistry = computed(() => getSkillRegistry(props.character.settingId));
const ownedWeapons = computed(() => (props.character.weapons ?? []).map((instance) =>
  presentCharacterWeapon(instance, weaponRegistry.value, skillRegistry.value, props.character.eraId),
));
const filteredDefinitions = computed(() => filterWeaponDefinitions(
  weaponRegistry.value.definitions,
  skillRegistry.value,
  search.value,
  category.value || undefined,
));

function availability(definition: WeaponDefinition) {
  return isWeaponEraId(props.character.eraId)
    ? isWeaponAvailableInEra(definition, props.character.eraId)
    : undefined;
}

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
    actionError.value = error instanceof Error ? error.message : "保存武器失败。";
  } finally {
    busyAction.value = undefined;
  }
}

async function addWeapon(definition: WeaponDefinition): Promise<void> {
  await run(`add:${definition.id}`, () => characterStore.addWeapon(
    props.character.id,
    definition.id,
  ), `${definition.name.zh}已添加；availability 与参考价格只作展示，Cash 未改变。`);
}

function beginEditing(instance: CharacterWeaponInstance): void {
  clearMessages();
  editingId.value = instance.id;
  editingNotes.value = instance.notes ?? "";
}

function cancelEditing(): void {
  editingId.value = undefined;
  editingNotes.value = "";
  clearMessages();
}

async function saveNotes(instanceId: string): Promise<void> {
  await run(`notes:${instanceId}`, async () => {
    await characterStore.updateWeaponNotes(props.character.id, instanceId, editingNotes.value);
    editingId.value = undefined;
    editingNotes.value = "";
  }, "武器备注已保存；武器实例与 definition 引用未改变。");
}

async function removeWeapon(instance: CharacterWeaponInstance, name: string): Promise<void> {
  if (!window.confirm(`删除武器“${name}”？Cash 不会改变。`)) return;
  await run(`remove:${instance.id}`, async () => {
    await characterStore.removeWeapon(props.character.id, instance.id);
    if (editingId.value === instance.id) cancelEditing();
  }, "武器已删除；Cash 未改变。");
}
</script>

<template>
  <section class="panel final-inventory-workspace final-weapon-workspace sheet-weapons-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Weapons</p>
        <h2>武器</h2>
        <p class="muted">持有实例优先展示；目录只来自人物自身 Setting，不处理购买、弹药或战斗。</p>
      </div>
      <span class="status-badge">{{ ownedWeapons.length }} 件</span>
    </div>
    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message" role="status">{{ actionStatus }}</p>

    <div v-if="ownedWeapons.length" class="weapon-owned-list">
      <article
        v-for="item in ownedWeapons"
        :key="item.instance.id"
        class="weapon-card owned"
        :class="{ unavailable: item.eraAvailability === 'unavailable', orphaned: item.orphaned }"
        :data-weapon-instance-id="item.instance.id"
      >
        <header class="section-heading">
          <div>
            <h3>{{ item.name }}</h3>
            <p v-if="item.orphaned" class="warning-message">当前 Setting 找不到 definition：{{ item.instance.definitionId }}。实例仍可编辑备注或删除，不会自动修复。</p>
            <div v-else-if="item.definition" class="weapon-badges">
              <span class="occupation-badge">{{ weaponCategoryLabels[item.definition.category] }}</span>
              <span v-if="item.eraAvailability" class="occupation-badge" :class="{ approval: item.eraAvailability === 'rare', banned: item.eraAvailability === 'unavailable' }">{{ weaponAvailabilityLabels[item.eraAvailability] }}</span>
              <span v-else class="occupation-badge">时代未指定</span>
            </div>
          </div>
          <div class="actions final-inventory-actions">
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="beginEditing(item.instance)">编辑备注</button>
            <button class="button danger" type="button" :disabled="busyAction !== undefined" @click="removeWeapon(item.instance, item.name)">删除</button>
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

        <template v-if="editingId === item.instance.id">
          <label class="field"><span>人物级备注（可选）</span><textarea v-model="editingNotes" rows="2" /></label>
          <div class="actions final-inventory-actions">
            <button class="button primary" type="button" :disabled="busyAction !== undefined" @click="saveNotes(item.instance.id)">保存备注</button>
            <button class="button" type="button" :disabled="busyAction !== undefined" @click="cancelEditing">取消</button>
          </div>
        </template>
        <p v-else-if="item.instance.notes" class="weapon-instance-notes"><strong>备注：</strong>{{ item.instance.notes }}</p>
      </article>
    </div>
    <p v-else class="empty-state">尚未持有武器；缺失字段不会在打开页面时自动生成。</p>

    <details class="final-weapon-catalog">
      <summary>浏览当前 Setting 武器目录（{{ weaponRegistry.definitions.length }}）</summary>
      <div class="final-weapon-catalog-body">
        <p v-if="!weaponRegistry.definitions.length" class="empty-state">当前 Setting 尚未提供武器目录，不会回退显示 Standard 武器。</p>
        <template v-else>
          <div class="weapon-filter-bar">
            <label class="field"><span>搜索</span><input v-model="search" type="search" placeholder="中文、英文、技能或 stable ID" /></label>
            <label class="field">
              <span>Category</span>
              <select v-model="category">
                <option value="">全部类别</option>
                <option v-for="categoryId in weaponCategoryIds" :key="categoryId" :value="categoryId">{{ weaponCategoryLabels[categoryId] }}</option>
              </select>
            </label>
          </div>
          <p class="muted">找到 {{ filteredDefinitions.length }} / {{ weaponRegistry.definitions.length }} 项。</p>
          <div v-if="filteredDefinitions.length" class="weapon-catalog-grid">
            <article v-for="definition in filteredDefinitions" :key="definition.id" class="weapon-card catalog" :class="{ unavailable: availability(definition) === 'unavailable' }" :data-weapon-definition-id="definition.id">
              <header class="section-heading">
                <div><h3>{{ definition.name.zh }}</h3><p v-if="definition.name.en" class="muted">{{ definition.name.en }}</p></div>
                <button class="button" type="button" :disabled="busyAction !== undefined" @click="addWeapon(definition)">添加</button>
              </header>
              <div class="weapon-badges">
                <span class="occupation-badge">{{ weaponCategoryLabels[definition.category] }}</span>
                <span v-if="availability(definition)" class="occupation-badge" :class="{ approval: availability(definition) === 'rare', banned: availability(definition) === 'unavailable' }">{{ weaponAvailabilityLabels[availability(definition)!] }}</span>
                <span v-else class="occupation-badge">时代未指定</span>
              </div>
              <dl class="weapon-mechanics-grid compact">
                <div><dt>技能</dt><dd>{{ formatWeaponSkillRef(definition, skillRegistry) }}</dd></div>
                <div><dt>伤害</dt><dd>{{ definition.damage }}</dd></div>
                <div><dt>射程</dt><dd>{{ definition.baseRange }}</dd></div>
                <div><dt>每轮攻击</dt><dd>{{ definition.attacksPerRound }}</dd></div>
                <div><dt>弹容量</dt><dd>{{ definition.capacity ?? '—' }}</dd></div>
                <div><dt>故障值</dt><dd>{{ definition.malfunction ?? '—' }}</dd></div>
                <div><dt>贯穿</dt><dd>{{ definition.impales ? '是' : '否' }}</dd></div>
                <div><dt>参考价格</dt><dd>{{ formatWeaponReferencePrice(definition, character.eraId) }}</dd></div>
              </dl>
              <p v-if="availability(definition) === 'unavailable'" class="warning-message">当前时代标记为不可用；该 metadata 不阻止添加。</p>
            </article>
          </div>
          <p v-else class="empty-state">没有符合当前搜索与类别筛选的武器。</p>
        </template>
      </div>
    </details>
  </section>
</template>
