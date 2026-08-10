<script setup lang="ts">
import { computed, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import { calculateMaximumSanity } from "../coc7/rules/derived";
import {
  getSkillRefKey,
  resolveSkillValue,
  type ResolvedSkillValue,
} from "../coc7/rules/skills";
import type { Character } from "../coc7/types/character";
import type { CharacterSkill, SkillDefinition, SkillRef } from "../coc7/types/skill";
import { getSkillRegistry } from "../content/skillRegistry";

interface SkillRow {
  readonly key: string;
  readonly definition: SkillDefinition;
  readonly ref: SkillRef;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly searchText: string;
  readonly persisted: CharacterSkill | undefined;
  readonly value: ResolvedSkillValue;
}

const props = defineProps<{ character: Character }>();
const characterStore = useCharacterStore();
const search = ref("");
const errorMessage = ref("");
const customNames = ref<Record<string, string>>({});
let pendingMutation: Promise<void> = Promise.resolve();

const registry = computed(() => getSkillRegistry(props.character.settingId));
const persistedByKey = computed(() => new Map(
  (props.character.skills ?? []).map((skill) => [getSkillRefKey(skill.ref), skill]),
));

const rows = computed<readonly SkillRow[]>(() => {
  if (!props.character.characteristics) return [];
  const result: SkillRow[] = [];
  for (const definition of registry.value.definitions) {
    const refs: SkillRef[] = definition.specialization.type === "none"
      ? [{ type: "standard", definitionId: definition.id }]
      : definition.predefinedSpecializations.map((specialization) => ({
          type: "predefined" as const,
          definitionId: definition.id,
          specializationId: specialization.id,
        }));

    const customRefs = (props.character.skills ?? [])
      .map((skill) => skill.ref)
      .filter(
        (ref): ref is Extract<SkillRef, { type: "custom" }> =>
          ref.type === "custom" && ref.definitionId === definition.id,
      );

    for (const skillRef of [...refs, ...customRefs]) {
      const key = getSkillRefKey(skillRef);
      const persisted = persistedByKey.value.get(key);
      const specialization = skillRef.type === "predefined"
        ? definition.predefinedSpecializations.find((item) => item.id === skillRef.specializationId)
        : undefined;
      const specializationZh = skillRef.type === "custom" ? skillRef.displayName : specialization?.name.zh;
      const specializationEn = skillRef.type === "custom" ? "Custom" : specialization?.name.en;
      const aliases = [
        ...(definition.aliases?.zh ?? []),
        ...(definition.aliases?.en ?? []),
        ...(specialization?.aliases?.zh ?? []),
        ...(specialization?.aliases?.en ?? []),
      ];
      const nameZh = specializationZh ? `${definition.name.zh}（${specializationZh}）` : definition.name.zh;
      const nameEn = specializationEn ? `${definition.name.en} (${specializationEn})` : definition.name.en;
      result.push({
        key,
        definition,
        ref: skillRef,
        nameZh,
        nameEn,
        searchText: [nameZh, nameEn, ...aliases].join(" ").toLocaleLowerCase(),
        persisted,
        value: resolveSkillValue(
          definition,
          skillRef,
          props.character.characteristics,
          persisted,
        ),
      });
    }
  }
  return result;
});

const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return query
    ? rows.value.filter((row) => row.searchText.includes(query))
    : rows.value;
});

const customDefinitions = computed(() => registry.value.definitions.filter(
  (definition) => definition.specialization.type === "required" && definition.specialization.allowCustom,
));

function numberFromEvent(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function run(action: () => Promise<unknown>): Promise<void> {
  pendingMutation = pendingMutation.then(async () => {
    try {
      await action();
      errorMessage.value = "";
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : "技能保存失败";
    }
  });
  return pendingMutation;
}

async function setValue(row: SkillRow, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const value = numberFromEvent(event);
  const currentSan = props.character.resources?.san.current;
  if (row.definition.id === "cthulhu-mythos" && currentSan !== undefined) {
    const maximumSanity = calculateMaximumSanity(value);
    if (currentSan > maximumSanity && !window.confirm(
      `克苏鲁神话提高后，最大理智将降至 ${maximumSanity}，当前 SAN 将从 ${currentSan} 同步降至 ${maximumSanity}。是否继续？`,
    )) {
      input.value = String(row.value.currentValue);
      return;
    }
  }
  await run(() => characterStore.setSkillValue(
    props.character.id,
    row.ref,
    value,
  ));
}

async function setImprovement(row: SkillRow, event: Event): Promise<void> {
  await run(() => characterStore.setImprovementChecked(
    props.character.id,
    row.ref,
    (event.target as HTMLInputElement).checked,
  ));
}

async function createCustom(definition: SkillDefinition): Promise<void> {
  const name = customNames.value[definition.id] ?? "";
  await run(async () => {
    await characterStore.createCustomSpecialization(props.character.id, definition.id, name);
    customNames.value = { ...customNames.value, [definition.id]: "" };
  });
}

async function renameCustom(row: SkillRow, event: Event): Promise<void> {
  if (row.ref.type !== "custom") return;
  const ref = row.ref;
  await run(() => characterStore.renameCustomSpecialization(
    props.character.id,
    ref.specializationId,
    (event.target as HTMLInputElement).value,
  ));
}

async function removeCustom(row: SkillRow): Promise<void> {
  if (row.ref.type !== "custom") return;
  const ref = row.ref;
  await run(() => characterStore.removeCustomSpecialization(
    props.character.id,
    ref.specializationId,
  ));
}
</script>

<template>
  <section class="skill-editor form-stack">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Phase 4B</p>
        <h2>技能基础编辑</h2>
        <p class="muted">显示完整 Standard 核心技能目录；职业点与兴趣点将在后续阶段实现。</p>
      </div>
      <label class="field skill-search">
        <span>搜索技能</span>
        <input v-model="search" type="search" placeholder="中文或英文名称" />
      </label>
    </div>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="!character.characteristics" class="warning-message">完成属性后才能计算技能基础值。</p>

    <div v-else class="skill-table-wrap">
      <table class="skill-table">
        <thead>
          <tr><th>技能</th><th>基础</th><th>当前</th><th>Half</th><th>Fifth</th><th>成长</th><th>自定义</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.key">
            <th>
              <strong>{{ row.nameZh }}</strong>
              <small>{{ row.nameEn }}</small>
              <span v-if="row.definition.availability.sheet === 'uncommon'" class="skill-badge warning">非常规</span>
              <span v-if="row.definition.availability.era === 'modern-only'" class="skill-badge">现代限定</span>
            </th>
            <td>{{ row.value.baseValue }}</td>
            <td>
              <input
                class="skill-value-input"
                type="number"
                min="0"
                step="1"
                :aria-label="`${row.nameZh} 当前值`"
                :value="row.value.currentValue"
                @blur="setValue(row, $event)"
              />
            </td>
            <td>{{ row.value.halfValue }}</td>
            <td>{{ row.value.fifthValue }}</td>
            <td>
              <input
                type="checkbox"
                :aria-label="`${row.nameZh} 成长标记`"
                :checked="row.persisted?.improvementChecked ?? false"
                :disabled="row.definition.improvementPolicy === 'not-eligible'"
                @change="setImprovement(row, $event)"
              />
              <small v-if="row.definition.improvementPolicy === 'not-eligible'">不可用</small>
            </td>
            <td>
              <template v-if="row.ref.type === 'custom'">
                <input
                  class="skill-name-input"
                  type="text"
                  :aria-label="`${row.nameZh} 名称`"
                  :value="row.ref.displayName"
                  @blur="renameCustom(row, $event)"
                />
                <button class="button danger compact-button" type="button" @click="removeCustom(row)">删除</button>
              </template>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="character.characteristics" class="custom-skill-grid">
      <form
        v-for="definition in customDefinitions"
        :key="definition.id"
        class="custom-skill-card"
        @submit.prevent="createCustom(definition)"
      >
        <div>
          <strong>新增{{ definition.name.zh }}专业化</strong>
          <span v-if="definition.availability.sheet === 'uncommon'" class="skill-badge warning">非常规</span>
          <span v-if="definition.availability.era === 'modern-only'" class="skill-badge">现代限定</span>
        </div>
        <input v-model="customNames[definition.id]" type="text" required placeholder="专业化名称" />
        <button class="button" type="submit">创建</button>
      </form>
    </div>
  </section>
</template>
