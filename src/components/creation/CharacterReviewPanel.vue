<script setup lang="ts">
import { computed, ref } from "vue";

import { characteristicIds } from "../../coc7/types/attribute";
import { backstoryCategoryIds, type Character } from "../../coc7/types/character";
import { getSkillRefKey } from "../../coc7/rules/skills";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import { getWeaponRegistry } from "../../content/weaponRegistry";
import {
  formatWeaponReferencePrice,
  presentCharacterWeapon,
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "../../content/weaponPresentation";
import {
  formatOccupationEraId,
  formatSkillRefForOccupation,
} from "../../creation/presentation/occupationPresentation";
import { useCreationStore } from "../../creation/stores/creationStore";
import { backstoryCategoryLabels } from "../../creation/presentation/backstoryPresentation";
import { deriveStandardInitialWealth } from "../../coc7/rules/wealth";
import {
  formatStandardInitialAssets,
  formatStandardMoney,
  standardLifestyleLabels,
} from "../../creation/presentation/wealthPresentation";
import {
  getFinalCreditRating,
  isStandardWealthEraId,
} from "../../creation/rules/creationWealth";

const props = defineProps<{ readonly character: Character }>();
const creationStore = useCreationStore();
const actionError = ref("");
const settingName = computed(() => getSettingPackOrThrow(props.character.settingId).name);
const skillRegistry = computed(() => getSkillRegistry(props.character.settingId));
const weaponRegistry = computed(() => getWeaponRegistry(props.character.settingId));
const weapons = computed(() => (props.character.weapons ?? []).map((instance) =>
  presentCharacterWeapon(
    instance,
    weaponRegistry.value,
    skillRegistry.value,
    props.character.eraId,
  ),
));
const skills = computed(() => [...(props.character.skills ?? [])]
  .map((skill) => ({
    skill,
    key: getSkillRefKey(skill.ref),
    label: formatSkillRefForOccupation(skill.ref, skillRegistry.value),
  }))
  .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")));
const backstoryGroups = computed(() => backstoryCategoryIds
  .map((category) => ({
    category,
    label: backstoryCategoryLabels[category],
    entries: props.character.backstory?.entries.filter((entry) => entry.category === category) ?? [],
  }))
  .filter((group) => group.entries.length > 0));
const creditRating = computed(() => getFinalCreditRating(props.character));
const wealthRule = computed(() => {
  if (!isStandardWealthEraId(props.character.eraId) || creditRating.value === undefined) {
    return undefined;
  }
  try {
    return deriveStandardInitialWealth(props.character.eraId, creditRating.value);
  } catch {
    return undefined;
  }
});

async function returnToSkills(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("skills");
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "返回技能调整失败。";
  }
}

async function returnToBackground(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("background");
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "返回背景修改失败。";
  }
}

async function returnToPossessions(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("possessions");
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "返回财富与物品失败。";
  }
}
</script>

<template>
  <section class="page-stack review-panel">
    <header class="panel section-heading">
      <div>
        <p class="eyebrow">Review</p>
        <h2>建卡检查</h2>
        <p class="success-message">建卡数据已保存到本地。</p>
      </div>
      <div class="actions">
        <button class="button" type="button" @click="returnToSkills">返回技能调整</button>
        <button class="button" type="button" @click="returnToBackground">返回修改背景</button>
        <button class="button" type="button" @click="returnToPossessions">返回修改财富与物品</button>
      </div>
    </header>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>

    <section class="panel form-stack">
      <h3>调查员摘要</h3>
      <dl class="review-summary-grid">
        <div><dt>姓名</dt><dd>{{ character.name || '未命名调查员' }}</dd></div>
        <div><dt>Setting</dt><dd>{{ settingName }}</dd></div>
        <div><dt>Era</dt><dd>{{ character.eraId ? formatOccupationEraId(character.eraId) : '未指定' }}</dd></div>
        <div><dt>年龄</dt><dd>{{ character.age ?? '—' }}</dd></div>
        <div><dt>性别</dt><dd>{{ character.sex ?? '—' }}</dd></div>
        <div><dt>住所</dt><dd>{{ character.residence ?? '—' }}</dd></div>
        <div><dt>出身地</dt><dd>{{ character.birthplace ?? '—' }}</dd></div>
        <div><dt>最终职业</dt><dd>{{ character.occupation?.displayNameSnapshot.zh ?? '—' }}</dd></div>
        <div><dt>Luck</dt><dd>{{ character.luck ?? '—' }}</dd></div>
      </dl>
    </section>

    <section class="panel form-stack">
      <h3>财富与资产</h3>
      <dl class="review-summary-grid">
        <div><dt>Credit Rating</dt><dd>{{ creditRating ?? '—' }}</dd></div>
        <div><dt>Lifestyle</dt><dd>{{ wealthRule ? standardLifestyleLabels[wealthRule.lifestyle] : '—' }}</dd></div>
        <div><dt>Current Cash</dt><dd>{{ character.wealth ? formatStandardMoney(character.wealth.cashMinorUnits) : '—' }}</dd></div>
        <div><dt>Current Assets</dt><dd>{{ character.wealth ? formatStandardMoney(character.wealth.assetsMinorUnits) : '—' }}</dd></div>
        <div><dt>Spending Level</dt><dd>{{ wealthRule ? formatStandardMoney(wealthRule.spendingLevelMinorUnits) : '—' }}</dd></div>
        <div v-if="wealthRule?.assets.type === 'minimum'">
          <dt>官方初始资产</dt><dd>{{ formatStandardInitialAssets(wealthRule.assets) }}</dd>
        </div>
      </dl>
      <ul v-if="character.wealth?.assetEntries.length" class="review-backstory-groups">
        <li v-for="entry in character.wealth.assetEntries" :key="entry.id">
          <strong>{{ entry.description }}</strong>
          <span>：{{ entry.valueMinorUnits === undefined ? '未精确估价' : formatStandardMoney(entry.valueMinorUnits) }}</span>
        </li>
      </ul>
      <p v-else class="empty-state">尚无资产构成说明。</p>
    </section>

    <section class="panel form-stack">
      <h3>背景故事</h3>
      <div v-if="backstoryGroups.length" class="review-backstory-groups">
        <section v-for="group in backstoryGroups" :key="group.category" class="review-backstory-group">
          <h4>{{ group.label }}</h4>
          <ul>
            <li v-for="entry in group.entries" :key="entry.id">
              <strong v-if="entry.id === character.backstory?.keyConnectionEntryId" class="key-connection-mark">
                ★ 关键连接
              </strong>
              <span>{{ entry.text }}</span>
            </li>
          </ul>
        </section>
      </div>
      <p v-else class="empty-state">尚无背景故事。</p>
    </section>

    <section class="panel form-stack">
      <h3>随身物品与装备</h3>
      <ul v-if="character.possessions?.length" class="review-backstory-groups">
        <li v-for="entry in character.possessions" :key="entry.id">
          <strong>{{ entry.name }}</strong>
          <span v-if="entry.notes">：{{ entry.notes }}</span>
        </li>
      </ul>
      <p v-else class="empty-state">尚未记录普通随身物品。</p>
    </section>

    <section class="panel form-stack">
      <h3>武器</h3>
      <div v-if="weapons.length" class="weapon-owned-list">
        <article
          v-for="item in weapons"
          :key="item.instance.id"
          class="weapon-card owned"
          :class="{ unavailable: item.eraAvailability === 'unavailable', orphaned: item.orphaned }"
        >
          <header>
            <h4>{{ item.name }}</h4>
            <div v-if="item.definition" class="weapon-badges">
              <span class="occupation-badge">{{ weaponCategoryLabels[item.definition.category] }}</span>
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
          </header>
          <p v-if="item.orphaned" class="warning-message">
            当前 Setting 的武器目录中找不到 definition：{{ item.instance.definitionId }}。
          </p>
          <dl v-else-if="item.definition" class="weapon-mechanics-grid">
            <div><dt>技能</dt><dd>{{ item.skillLabel }}</dd></div>
            <div><dt>伤害</dt><dd>{{ item.definition.damage }}</dd></div>
            <div><dt>基础射程</dt><dd>{{ item.definition.baseRange }}</dd></div>
            <div><dt>每轮攻击</dt><dd>{{ item.definition.attacksPerRound }}</dd></div>
            <div><dt>弹容量</dt><dd>{{ item.definition.capacity ?? '—' }}</dd></div>
            <div><dt>贯穿</dt><dd>{{ item.definition.impales ? '是' : '否' }}</dd></div>
            <div><dt>故障值</dt><dd>{{ item.definition.malfunction ?? '—' }}</dd></div>
            <div><dt>参考价格</dt><dd>{{ formatWeaponReferencePrice(item.definition, character.eraId) }}</dd></div>
          </dl>
          <p v-if="item.instance.notes" class="weapon-instance-notes">
            <strong>备注：</strong>{{ item.instance.notes }}
          </p>
        </article>
      </div>
      <p v-else class="empty-state">尚未持有武器。</p>
    </section>

    <section class="panel form-stack">
      <h3>最终属性</h3>
      <div v-if="character.characteristics" class="attribute-grid">
        <div v-for="id in characteristicIds" :key="id" class="attribute-card">
          <span>{{ id }}</span><strong>{{ character.characteristics[id] }}</strong>
        </div>
      </div>
      <p v-else class="empty-state">尚无最终属性。</p>
    </section>

    <section v-if="character.resources" class="panel form-stack">
      <h3>当前资源</h3>
      <div class="attribute-grid">
        <div class="attribute-card"><span>HP</span><strong>{{ character.resources.hp.current }}</strong></div>
        <div class="attribute-card"><span>MP</span><strong>{{ character.resources.mp.current }}</strong></div>
        <div class="attribute-card"><span>SAN</span><strong>{{ character.resources.san.current }}</strong></div>
      </div>
    </section>

    <section class="panel form-stack">
      <h3>最终技能</h3>
      <div v-if="skills.length" class="review-skill-list">
        <div v-for="item in skills" :key="item.key" class="review-skill-row">
          <span>{{ item.label }}</span><strong>{{ item.skill.currentValue }}</strong>
        </div>
      </div>
      <p v-else class="empty-state">尚无最终技能。</p>
    </section>
  </section>
</template>
