<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  deriveFinalSheetStandardValues,
  deriveFinalSheetStandardWealth,
  getCharacterCreationStatus,
  getFinalSheetCthulhuMythos,
  getFinalSheetMaximumSanity,
  presentFinalSheetBackstory,
  presentFinalSheetSkills,
} from "../character-sheet/presentation/finalCharacterSheetPresentation";
import { getFifthValue, getHalfValue } from "../coc7/rules/attributes";
import { formatDamageBonus } from "../coc7/rules/derived";
import { characteristicIds } from "../coc7/types/attribute";
import { getSettingPackOrThrow } from "../content/registry";
import { getSkillRegistry } from "../content/skillRegistry";
import { getWeaponRegistry } from "../content/weaponRegistry";
import {
  formatWeaponReferencePrice,
  presentCharacterWeapon,
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "../content/weaponPresentation";
import { formatOccupationEraId } from "../creation/presentation/occupationPresentation";
import {
  formatStandardMoney,
  standardLifestyleLabels,
} from "../creation/presentation/wealthPresentation";
import { getFinalCreditRating } from "../creation/rules/creationWealth";
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
const skills = computed(() => character.value
  ? presentFinalSheetSkills(character.value, getSkillRegistry(character.value.settingId))
  : []);
const backstoryGroups = computed(() => character.value
  ? presentFinalSheetBackstory(character.value)
  : []);
const creditRating = computed(() => character.value
  ? getFinalCreditRating(character.value)
  : undefined);
const wealthRule = computed(() => character.value
  ? deriveFinalSheetStandardWealth(character.value)
  : undefined);
const weapons = computed(() => {
  if (!character.value) return [];
  const skillRegistry = getSkillRegistry(character.value.settingId);
  const weaponRegistry = getWeaponRegistry(character.value.settingId);
  return (character.value.weapons ?? []).map((instance) =>
    presentCharacterWeapon(instance, weaponRegistry, skillRegistry, character.value?.eraId),
  );
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

        <section class="panel">
          <p class="eyebrow">Investigator</p>
          <h2>身份</h2>
          <dl class="sheet-fact-grid">
            <div><dt>年龄</dt><dd>{{ character.age ?? '—' }}</dd></div>
            <div><dt>性别</dt><dd>{{ character.sex ?? '—' }}</dd></div>
            <div><dt>Era</dt><dd>{{ character.eraId ? formatOccupationEraId(character.eraId) : '—' }}</dd></div>
            <div><dt>住所</dt><dd>{{ character.residence ?? '—' }}</dd></div>
            <div><dt>出身地</dt><dd>{{ character.birthplace ?? '—' }}</dd></div>
            <div><dt>职业</dt><dd>{{ character.occupation?.displayNameSnapshot.zh ?? '—' }}</dd></div>
          </dl>
        </section>
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

      <section class="panel">
        <div class="section-heading">
          <div><p class="eyebrow">Skills</p><h2>技能</h2></div>
          <span>{{ skills.length }} 项</span>
        </div>
        <div v-if="skills.length" class="sheet-skill-list">
          <article v-for="skill in skills" :key="skill.key" class="sheet-skill-row" :class="{ orphaned: skill.orphaned }">
            <div>
              <strong>{{ skill.label }}</strong>
              <small v-if="skill.improvementChecked">✓ 已标记成长</small>
              <small v-if="skill.orphaned">无法从当前 Setting 的 SkillRegistry 解析</small>
            </div>
            <dl>
              <div><dt>Current</dt><dd>{{ skill.currentValue }}</dd></div>
              <div><dt>Half</dt><dd>{{ skill.halfValue }}</dd></div>
              <div><dt>Fifth</dt><dd>{{ skill.fifthValue }}</dd></div>
            </dl>
          </article>
        </div>
        <p v-else class="empty-state">尚无最终技能。</p>
      </section>

      <section class="sheet-secondary-grid">
        <section class="panel">
          <p class="eyebrow">Backstory</p>
          <h2>背景故事</h2>
          <div v-if="backstoryGroups.length" class="sheet-backstory-groups">
            <section v-for="group in backstoryGroups" :key="group.category">
              <h3>{{ group.label }}</h3>
              <ul>
                <li v-for="entry in group.entries" :key="entry.id">
                  <strong v-if="entry.id === character.backstory?.keyConnectionEntryId" class="key-connection-mark">★ 关键连接</strong>
                  <span>{{ entry.text }}</span>
                </li>
              </ul>
            </section>
          </div>
          <p v-else class="empty-state">尚无背景故事。</p>
        </section>

        <section class="panel">
          <p class="eyebrow">Wealth</p>
          <h2>财富与资产</h2>
          <dl class="sheet-fact-grid">
            <div><dt>Credit Rating</dt><dd>{{ creditRating ?? '—' }}</dd></div>
            <div><dt>Lifestyle</dt><dd>{{ wealthRule ? standardLifestyleLabels[wealthRule.lifestyle] : '—' }}</dd></div>
            <div><dt>Current Cash</dt><dd>{{ character.wealth ? formatStandardMoney(character.wealth.cashMinorUnits) : '—' }}</dd></div>
            <div><dt>Current Assets</dt><dd>{{ character.wealth ? formatStandardMoney(character.wealth.assetsMinorUnits) : '—' }}</dd></div>
            <div><dt>Spending Level</dt><dd>{{ wealthRule ? formatStandardMoney(wealthRule.spendingLevelMinorUnits) : '—' }}</dd></div>
          </dl>
          <ul v-if="character.wealth?.assetEntries.length" class="sheet-entry-list">
            <li v-for="entry in character.wealth.assetEntries" :key="entry.id">
              <strong>{{ entry.description }}</strong>
              <span>{{ entry.valueMinorUnits === undefined ? '未精确估价' : formatStandardMoney(entry.valueMinorUnits) }}</span>
            </li>
          </ul>
          <p v-else class="empty-state">尚无资产构成说明。</p>
        </section>

        <section class="panel">
          <p class="eyebrow">Possessions</p>
          <h2>随身物品</h2>
          <ul v-if="character.possessions?.length" class="sheet-entry-list">
            <li v-for="entry in character.possessions" :key="entry.id">
              <strong>{{ entry.name }}</strong><span v-if="entry.notes">{{ entry.notes }}</span>
            </li>
          </ul>
          <p v-else class="empty-state">尚未记录普通随身物品。</p>
        </section>

        <section class="panel sheet-weapons-section">
          <p class="eyebrow">Weapons</p>
          <h2>武器</h2>
          <div v-if="weapons.length" class="weapon-owned-list">
            <article v-for="item in weapons" :key="item.instance.id" class="weapon-card owned" :class="{ unavailable: item.eraAvailability === 'unavailable', orphaned: item.orphaned }">
              <header>
                <h3>{{ item.name }}</h3>
                <div v-if="item.definition" class="weapon-badges">
                  <span class="occupation-badge">{{ weaponCategoryLabels[item.definition.category] }}</span>
                  <span v-if="item.eraAvailability" class="occupation-badge" :class="{ approval: item.eraAvailability === 'rare', banned: item.eraAvailability === 'unavailable' }">{{ weaponAvailabilityLabels[item.eraAvailability] }}</span>
                  <span v-else class="occupation-badge">时代未指定</span>
                </div>
              </header>
              <p v-if="item.orphaned" class="warning-message">当前 Setting 的武器目录中找不到 definition：{{ item.instance.definitionId }}。</p>
              <dl v-else-if="item.definition" class="weapon-mechanics-grid">
                <div><dt>技能</dt><dd>{{ item.skillLabel }}</dd></div>
                <div><dt>伤害</dt><dd>{{ item.definition.damage }}</dd></div>
                <div><dt>射程</dt><dd>{{ item.definition.baseRange }}</dd></div>
                <div><dt>每轮攻击</dt><dd>{{ item.definition.attacksPerRound }}</dd></div>
                <div><dt>弹容量</dt><dd>{{ item.definition.capacity ?? '—' }}</dd></div>
                <div><dt>故障值</dt><dd>{{ item.definition.malfunction ?? '—' }}</dd></div>
                <div><dt>参考价格</dt><dd>{{ formatWeaponReferencePrice(item.definition, character.eraId) }}</dd></div>
              </dl>
              <p v-if="item.instance.notes" class="weapon-instance-notes"><strong>备注：</strong>{{ item.instance.notes }}</p>
            </article>
          </div>
          <p v-else class="empty-state">尚未持有武器；当前 Setting 不会回退 Standard 武器目录。</p>
        </section>
      </section>
    </template>
  </section>
</template>
