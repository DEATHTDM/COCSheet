<script setup lang="ts">
import { computed, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import {
  filterFinalSheetSkillRows,
  resolveFinalSheetSkillRows,
  type FinalSheetSkillPresentation,
} from "../character-sheet/presentation/finalCharacterSheetPresentation";
import { calculateMaximumSanity } from "../coc7/rules/derived";
import type { Character } from "../coc7/types/character";
import type { SkillDefinition } from "../coc7/types/skill";
import { getSkillRegistry } from "../content/skillRegistry";

const props = defineProps<{ character: Character }>();
const characterStore = useCharacterStore();
const search = ref("");
const showUncommon = ref(false);
const showPredefinedSpecializations = ref(false);
const errorMessage = ref("");
const mutationPending = ref(false);
const customDefinitionId = ref("");
const customName = ref("");
let pendingMutation: Promise<void> = Promise.resolve();

const registry = computed(() => getSkillRegistry(props.character.settingId));
const rows = computed(() => resolveFinalSheetSkillRows(
  props.character,
  registry.value,
  {
    includeUncommon: showUncommon.value,
    includePredefinedSpecializations: showPredefinedSpecializations.value,
  },
));
const filteredRows = computed(() => filterFinalSheetSkillRows(rows.value, search.value));
const customDefinitions = computed(() => registry.value.definitions.filter(
  (definition) => definition.specialization.type === "required" && definition.specialization.allowCustom,
));
const selectedCustomDefinition = computed(() => customDefinitions.value.find(
  (definition) => definition.id === customDefinitionId.value,
));
const catalogBaselineUnavailable = computed(() =>
  !props.character.characteristics && registry.value.definitions.length > 0,
);

function resetInput(input: HTMLInputElement, value: number | string): void {
  input.value = String(value);
}

function run(action: () => Promise<unknown>): Promise<void> {
  pendingMutation = pendingMutation.then(async () => {
    mutationPending.value = true;
    try {
      await action();
      errorMessage.value = "";
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : "技能保存失败。";
    } finally {
      mutationPending.value = false;
    }
  });
  return pendingMutation;
}

async function setValue(row: FinalSheetSkillPresentation, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const draft = input.value.trim();
  if (!/^\d+$/.test(draft)) {
    errorMessage.value = "技能当前值必须是非负整数。";
    resetInput(input, row.currentValue);
    return;
  }
  const value = Number(draft);
  if (value === row.currentValue) return;

  const currentSan = props.character.resources?.san.current;
  if (row.ref.type === "standard" && row.ref.definitionId === "cthulhu-mythos" && currentSan !== undefined) {
    const maximumSanity = calculateMaximumSanity(value);
    if (currentSan > maximumSanity && !window.confirm(
      `克苏鲁神话修改后，最大理智将降至 ${maximumSanity}，当前 SAN 将从 ${currentSan} 同步降至 ${maximumSanity}。是否继续？`,
    )) {
      resetInput(input, row.currentValue);
      return;
    }
  }
  await run(() => characterStore.setSkillValue(props.character.id, row.ref, value));
}

async function setImprovement(row: FinalSheetSkillPresentation, event: Event): Promise<void> {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked === row.improvementChecked) return;
  await run(() => characterStore.setImprovementChecked(props.character.id, row.ref, checked));
}

async function createCustom(): Promise<void> {
  const definition = selectedCustomDefinition.value;
  if (!definition) {
    errorMessage.value = "请选择技能专攻类别。";
    return;
  }
  await run(async () => {
    await characterStore.createCustomSpecialization(
      props.character.id,
      definition.id,
      customName.value,
    );
    customName.value = "";
  });
}

async function renameCustom(row: FinalSheetSkillPresentation, event: Event): Promise<void> {
  if (row.ref.type !== "custom") return;
  const specializationId = row.ref.specializationId;
  const input = event.target as HTMLInputElement;
  const displayName = input.value.trim();
  if (displayName === row.ref.displayName) return;
  await run(() => characterStore.renameCustomSpecialization(
    props.character.id,
    specializationId,
    displayName,
  ));
}

async function removeCustom(row: FinalSheetSkillPresentation): Promise<void> {
  if (row.ref.type !== "custom") return;
  const specializationId = row.ref.specializationId;
  if (!window.confirm(`删除自定义技能专攻“${row.ref.displayName}”？此操作会删除其当前值与成长标记。`)) {
    return;
  }
  await run(() => characterStore.removeCustomSpecialization(
    props.character.id,
    specializationId,
  ));
}

function customDefinitionLabel(definition: SkillDefinition): string {
  return definition.name.zh;
}
</script>

<template>
  <section class="panel final-skill-workspace">
    <div class="section-heading final-skill-heading">
      <div>
        <p class="eyebrow">调查员技能</p>
        <h2>技能</h2>
        <p class="muted">目录基础值只读解析；修改数值或成长标记时才写入人物。</p>
      </div>
      <span>{{ filteredRows.length }} / {{ rows.length }} 项</span>
    </div>

    <div class="final-skill-toolbar">
      <label class="field final-skill-search">
        <span>搜索技能</span>
        <input v-model="search" type="search" placeholder="技能名称或别名" />
      </label>
      <div class="final-skill-toggles">
        <label class="final-skill-toggle">
          <input v-model="showUncommon" type="checkbox" />
          <span>显示非常规技能</span>
        </label>
        <label class="final-skill-toggle">
          <input v-model="showPredefinedSpecializations" type="checkbox" />
          <span>显示技能专攻</span>
        </label>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="catalogBaselineUnavailable" class="warning-message" role="status">
      人物缺少最终属性，无法可靠生成目录基础技能；已持久化技能仍会保留显示与编辑。
    </p>

    <div v-if="filteredRows.length" class="sheet-skill-list">
      <article
        v-for="skill in filteredRows"
        :key="skill.key"
        :data-skill-key="skill.key"
        class="sheet-skill-row"
        :class="{ orphaned: skill.orphaned }"
      >
        <div class="sheet-skill-identity">
          <strong>{{ skill.nameZh }}</strong>
          <div class="sheet-skill-badges">
            <span v-if="skill.availability?.sheet === 'uncommon'" class="skill-badge warning">非常规</span>
            <span v-if="skill.availability?.era === 'modern-only'" class="skill-badge">现代限定</span>
            <span v-if="skill.eraStatus === 'incompatible'" class="skill-badge danger">当前时代不兼容</span>
            <span v-else-if="skill.availability?.era === 'modern-only' && skill.eraStatus === 'unknown'" class="skill-badge warning">时代未指定</span>
            <span v-if="!skill.persisted" class="skill-badge subtle">目录基础值</span>
            <span v-if="skill.orphaned" class="skill-badge warning">规则资料缺失 · 只读</span>
          </div>
          <small v-if="skill.orphaned">当前规则环境找不到这项技能的规则资料，已保存数值仍会显示。</small>

          <label v-if="skill.ref.type === 'custom' && !skill.orphaned" class="custom-skill-name">
            <span>技能专攻名称</span>
            <input
              type="text"
              :aria-label="`${skill.nameZh} 技能专攻名称`"
              :value="skill.ref.displayName"
              :disabled="mutationPending"
              @blur="renameCustom(skill, $event)"
            />
          </label>
          <button
            v-if="skill.ref.type === 'custom' && !skill.orphaned"
            class="button danger compact-button"
            type="button"
            :disabled="mutationPending"
            @click="removeCustom(skill)"
          >删除技能专攻</button>
        </div>

        <div class="sheet-skill-values">
          <label class="sheet-current-skill-value">
            <span>当前值</span>
            <input
              v-if="!skill.orphaned"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :aria-label="`${skill.nameZh} 当前值`"
              :value="skill.currentValue"
              :disabled="mutationPending"
              @blur="setValue(skill, $event)"
            />
            <strong v-else>{{ skill.currentValue }}</strong>
          </label>
          <dl>
            <div><dt>困难</dt><dd>{{ skill.halfValue }}</dd></div>
            <div><dt>极难</dt><dd>{{ skill.fifthValue }}</dd></div>
          </dl>
          <label class="sheet-improvement-toggle" :title="skill.improvementPolicy === 'not-eligible' ? '此技能不允许成长标记' : '成长标记'">
            <input
              type="checkbox"
              :aria-label="`${skill.nameZh} 成长标记`"
              :checked="skill.improvementChecked"
              :disabled="mutationPending || skill.orphaned || skill.improvementPolicy === 'not-eligible'"
              @change="setImprovement(skill, $event)"
            />
            <span>{{ skill.improvementPolicy === 'not-eligible' ? '不可成长' : '成长' }}</span>
          </label>
        </div>
      </article>
    </div>
    <p v-else class="empty-state">没有符合当前筛选条件的技能。</p>

    <details v-if="customDefinitions.length" class="final-custom-skill-manager">
      <summary>新增自定义技能专攻</summary>
      <form class="final-custom-skill-form" @submit.prevent="createCustom">
        <label class="field">
          <span>技能类别</span>
          <select v-model="customDefinitionId" required :disabled="mutationPending || !character.characteristics">
            <option value="" disabled>请选择</option>
            <option v-for="definition in customDefinitions" :key="definition.id" :value="definition.id">
              {{ customDefinitionLabel(definition) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>技能专攻名称</span>
          <input v-model="customName" type="text" required placeholder="例如：陶艺" :disabled="mutationPending || !character.characteristics" />
        </label>
        <button class="button" type="submit" :disabled="mutationPending || !character.characteristics">创建</button>
      </form>
      <p v-if="!character.characteristics" class="muted">完成属性后才能按基础值创建自定义技能专攻。</p>
    </details>
  </section>
</template>
