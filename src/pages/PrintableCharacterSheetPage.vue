<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  presentPrintableCharacterSheet,
  type PrintableCharacterSheetPresentation,
} from "../character-sheet/presentation/printableCharacterSheetPresentation";
import type { Character } from "../coc7/types/character";
import { getSettingPack } from "../content/registry";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import type { CharacteristicId } from "../coc7/types/attribute";
import { getSkillRegistry } from "../content/skillRegistry";
import {
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "../content/weaponPresentation";
import { getWeaponRegistry } from "../content/weaponRegistry";

const route = useRoute();
const characterStore = useCharacterStore();
const characterId = computed(() => String(route.params.id));
const character = ref<Character>();
const ready = ref(false);
const errorMessage = ref("");
const printError = ref("");
const originalDocumentTitle = document.title;
let loadRequest = 0;

const presentation = computed<PrintableCharacterSheetPresentation | undefined>(() => {
  const current = character.value;
  if (!current) return undefined;
  const eras = getSettingPack(current.settingId)?.eras;
  return presentPrintableCharacterSheet(
    current,
    {
      name: getHistoricalSettingLabel(current.settingId),
      ...(eras ? { eras } : {}),
    },
    getSkillRegistry(current.settingId),
    getWeaponRegistry(current.settingId),
  );
});
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

async function loadCharacter(id: string): Promise<void> {
  const request = ++loadRequest;
  ready.value = false;
  character.value = undefined;
  errorMessage.value = "";
  printError.value = "";
  document.title = originalDocumentTitle;
  try {
    const loaded = await characterStore.loadById(id);
    if (request !== loadRequest) return;
    if (!loaded) {
      errorMessage.value = "找不到该调查员。";
      return;
    }
    character.value = loaded.data;
    document.title = `${loaded.data.name || "未命名调查员"} - 人物卡`;
    ready.value = true;
  } catch (error: unknown) {
    if (request !== loadRequest) return;
    errorMessage.value = error instanceof Error ? error.message : "读取调查员失败。";
  }
}

function printCharacterSheet(): void {
  printError.value = "";
  try {
    if (typeof window.print !== "function") throw new Error("print unavailable");
    window.print();
  } catch {
    printError.value = "当前浏览器无法打开打印对话框，请使用浏览器菜单中的打印功能。";
  }
}

watch(characterId, (id) => void loadCharacter(id), { immediate: true });
onBeforeUnmount(() => {
  loadRequest += 1;
  document.title = originalDocumentTitle;
});
</script>

<template>
  <section class="print-preview-page">
    <nav class="print-preview-toolbar" aria-label="打印预览操作">
      <RouterLink class="button" :to="`/characters/${characterId}/sheet`">返回人物卡</RouterLink>
      <p>打印页仅显示已保存的人物数据。</p>
      <button
        v-if="ready && character"
        class="button primary"
        type="button"
        @click="printCharacterSheet"
      >打印 / 保存 PDF</button>
    </nav>
    <p v-if="printError" class="panel error-message print-preview-message" role="alert">{{ printError }}</p>
    <p v-if="errorMessage" class="panel error-message print-preview-message" role="alert">{{ errorMessage }}</p>
    <p v-else-if="!ready" class="print-preview-message">正在读取本地人物数据……</p>

    <article v-else-if="character && presentation" class="printable-sheet" aria-label="可打印人物卡">
      <header class="print-sheet-header">
        <div>
          <p class="print-kicker">COCSheet · 打印版人物卡</p>
          <h1>{{ presentation.titleName }}</h1>
          <p>{{ presentation.identity.occupation }} · {{ presentation.identity.setting }}</p>
        </div>
        <p class="print-save-note">已保存资料 · 只读</p>
      </header>

      <section class="print-section" aria-labelledby="print-identity-heading">
        <h2 id="print-identity-heading">身份</h2>
        <dl class="print-fact-grid print-identity-grid">
          <div><dt>调查员姓名</dt><dd>{{ presentation.identity.name }}</dd></div>
          <div><dt>职业</dt><dd>{{ presentation.identity.occupation }}</dd></div>
          <div><dt>规则环境</dt><dd>{{ presentation.identity.setting }}</dd></div>
          <div><dt>时代</dt><dd>{{ presentation.identity.era }}</dd></div>
          <div><dt>年龄</dt><dd>{{ presentation.identity.age }}</dd></div>
          <div><dt>性别</dt><dd>{{ presentation.identity.sex }}</dd></div>
          <div><dt>居住地</dt><dd>{{ presentation.identity.residence }}</dd></div>
          <div><dt>出生地</dt><dd>{{ presentation.identity.birthplace }}</dd></div>
        </dl>
      </section>

      <section class="print-section" aria-labelledby="print-resources-heading">
        <h2 id="print-resources-heading">资源与核心数值</h2>
        <dl class="print-fact-grid print-resource-grid">
          <div><dt>当前生命值（HP）</dt><dd>{{ presentation.resources.currentHp }}</dd><small>上限 {{ presentation.resources.maximumHp }}</small></div>
          <div><dt>当前魔法值（MP）</dt><dd>{{ presentation.resources.currentMp }}</dd><small>起始 {{ presentation.resources.initialMp }}</small></div>
          <div><dt>当前理智（SAN）</dt><dd>{{ presentation.resources.currentSan }}</dd><small>上限 {{ presentation.resources.maximumSan }}</small></div>
          <div><dt>当前幸运</dt><dd>{{ presentation.resources.currentLuck }}</dd></div>
        </dl>
      </section>

      <section class="print-section" aria-labelledby="print-characteristics-heading">
        <h2 id="print-characteristics-heading">属性</h2>
        <div v-if="presentation.characteristics" class="print-characteristic-grid">
          <article v-for="item in presentation.characteristics" :key="item.id" class="print-characteristic-card">
            <span>{{ characteristicLabels[item.id] }}</span>
            <strong>{{ item.currentValue }}</strong>
            <small>困难 {{ item.halfValue }} · 极难 {{ item.fifthValue }}</small>
          </article>
        </div>
        <p v-else class="print-empty">最终属性未记录。</p>

        <template v-if="presentation.derived">
          <h3>派生值</h3>
          <dl class="print-fact-grid print-derived-grid">
            <div><dt>移动力</dt><dd>{{ presentation.derived.movement }}</dd></div>
            <div><dt>伤害加值</dt><dd>{{ presentation.derived.damageBonus }}</dd></div>
            <div><dt>体格</dt><dd>{{ presentation.derived.build }}</dd></div>
          </dl>
        </template>
        <p v-else class="print-muted">当前规则环境暂无可可靠计算的派生数据。</p>
      </section>

      <section class="print-section" aria-labelledby="print-skills-heading">
        <div class="print-section-heading">
          <h2 id="print-skills-heading">技能</h2>
          <span>{{ presentation.skills.length }} 项</span>
        </div>
        <div v-if="presentation.skills.length" class="print-skill-grid">
          <article
            v-for="skill in presentation.skills"
            :key="skill.key"
            class="print-skill-row"
            :class="{ orphaned: skill.orphaned }"
            :data-skill-key="skill.key"
          >
            <div class="print-skill-name">
              <strong>{{ skill.nameZh }}</strong>
              <small v-if="skill.orphaned">技能规则资料缺失</small>
            </div>
            <dl>
              <div><dt>当前</dt><dd>{{ skill.currentValue }}</dd></div>
              <div><dt>困难</dt><dd>{{ skill.halfValue }}</dd></div>
              <div><dt>极难</dt><dd>{{ skill.fifthValue }}</dd></div>
            </dl>
            <span v-if="skill.improvementChecked" class="print-improvement-mark" aria-label="成长标记">✓ 成长</span>
          </article>
        </div>
        <p v-else class="print-empty">技能未记录，且当前规则环境没有可可靠显示的默认技能。</p>
      </section>

      <section v-if="presentation.backstory.length" class="print-section" aria-labelledby="print-backstory-heading">
        <h2 id="print-backstory-heading">背景故事</h2>
        <div class="print-backstory-groups">
          <section v-for="group in presentation.backstory" :key="group.category" class="print-backstory-group">
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="entry in group.entries" :key="entry.id" class="print-backstory-entry">
                <strong v-if="entry.keyConnection">★ 关键连接</strong>
                <span>{{ entry.text }}</span>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <section class="print-section" aria-labelledby="print-wealth-heading">
        <h2 id="print-wealth-heading">财富与资产</h2>
        <template v-if="presentation.wealth">
          <dl class="print-fact-grid print-wealth-grid">
            <div><dt>现金</dt><dd>{{ presentation.wealth.cashLabel }}</dd></div>
            <div><dt>资产</dt><dd>{{ presentation.wealth.assetsLabel }}</dd></div>
            <div v-if="presentation.wealth.lifestyleLabel"><dt>生活水平</dt><dd>{{ presentation.wealth.lifestyleLabel }}</dd></div>
            <div v-if="presentation.wealth.spendingLevelLabel"><dt>消费水平</dt><dd>{{ presentation.wealth.spendingLevelLabel }}</dd></div>
          </dl>
          <ul v-if="presentation.wealth.entries.length" class="print-entry-list print-asset-list">
            <li v-for="item in presentation.wealth.entries" :key="item.entry.id">
              <strong>{{ item.entry.description }}</strong>
              <span>{{ item.valueLabel }}</span>
            </li>
          </ul>
        </template>
        <p v-else class="print-empty">财富未记录。</p>
      </section>

      <section class="print-section" aria-labelledby="print-possessions-heading">
        <h2 id="print-possessions-heading">随身物品</h2>
        <ul v-if="presentation.possessions.length" class="print-entry-list print-possession-list">
          <li v-for="entry in presentation.possessions" :key="entry.id">
            <strong>{{ entry.name }}</strong>
            <span v-if="entry.notes">{{ entry.notes }}</span>
          </li>
        </ul>
        <p v-else class="print-empty">随身物品未记录。</p>
      </section>

      <section class="print-section" aria-labelledby="print-weapons-heading">
        <h2 id="print-weapons-heading">武器</h2>
        <div v-if="presentation.weapons.length" class="print-weapon-list">
          <article
            v-for="item in presentation.weapons"
            :key="item.instance.id"
            class="print-weapon-card"
            :class="{ orphaned: item.orphaned }"
            :data-weapon-instance-id="item.instance.id"
          >
            <header>
              <h3>{{ item.name }}</h3>
              <span v-if="item.definition">{{ weaponCategoryLabels[item.definition.category] }}</span>
              <span v-if="item.eraAvailability">{{ weaponAvailabilityLabels[item.eraAvailability] }}</span>
            </header>
            <p v-if="item.orphaned">这件武器的规则资料已不在当前目录中。</p>
            <dl v-else-if="item.definition" class="print-weapon-mechanics">
              <div><dt>关联技能</dt><dd>{{ item.skillLabel }}</dd></div>
              <div><dt>伤害</dt><dd>{{ item.definition.damage }}</dd></div>
              <div><dt>射程</dt><dd>{{ item.definition.baseRange }}</dd></div>
              <div><dt>每轮攻击</dt><dd>{{ item.definition.attacksPerRound }}</dd></div>
              <div><dt>弹容量</dt><dd>{{ item.definition.capacity ?? '—' }}</dd></div>
              <div v-if="item.definition.malfunction"><dt>故障值</dt><dd>{{ item.definition.malfunction }}</dd></div>
            </dl>
            <p v-if="item.instance.notes" class="print-weapon-notes"><strong>备注：</strong>{{ item.instance.notes }}</p>
          </article>
        </div>
        <p v-else class="print-empty">武器未记录。</p>
      </section>
    </article>
  </section>
</template>
