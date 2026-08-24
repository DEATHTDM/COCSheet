<script setup lang="ts">
import { computed, ref } from "vue";

import { characteristicIds, type CharacteristicId } from "../../coc7/types/attribute";
import {
  occupationCategoryIds,
  type EraId,
  type OccupationDefinition,
} from "../../coc7/types/occupation";
import type { SettingId } from "../../coc7/types/setting";
import type { SkillDefinition } from "../../coc7/types/skill";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  buildCustomOccupationDefinition,
  createCustomOccupationDraft,
  createCustomOccupationDraftFromDefinition,
  createCustomOccupationSkillSlot,
  previewCustomOccupationPointFormula,
  type CustomOccupationDraft,
  type CustomOccupationFormulaDraft,
  type CustomOccupationSkillSlotDraft,
  type CustomOccupationSkillSlotMode,
} from "../../creation/rules/customOccupationBuilder";
import {
  formatOccupationCategory,
  formatOccupationPointFormula,
} from "../../creation/presentation/occupationPresentation";

const props = defineProps<{
  readonly settingId: SettingId;
  readonly eraId: EraId | undefined;
  readonly initialDefinition?: OccupationDefinition | undefined;
  readonly hasStructuredSkillDraft?: boolean | undefined;
}>();
const emit = defineEmits<{
  save: [definition: OccupationDefinition];
  cancel: [];
}>();

const initialResult = props.initialDefinition
  ? createCustomOccupationDraftFromDefinition(props.initialDefinition)
  : { draft: createCustomOccupationDraft(), errors: [] };
const draft = ref<CustomOccupationDraft>(initialResult.draft ?? createCustomOccupationDraft());
const conversionErrors = initialResult.errors;
const attemptedSubmit = ref(false);
const skills = getSkillRegistry(props.settingId);

const availableSkills = computed(() => skills.definitions
  .filter((skill) => skill.id !== "credit-rating")
  .filter((skill) => skill.availability.era === "all" || props.eraId === "modern")
  .sort((left, right) => left.name.zh.localeCompare(right.name.zh, "zh-CN")));
const buildResult = computed(() =>
  buildCustomOccupationDefinition(draft.value, skills, props.eraId),
);
const pointFormulaPreview = computed(() =>
  previewCustomOccupationPointFormula(draft.value.pointFormula),
);
const isEditing = computed(() => props.initialDefinition !== undefined);

function replaceDraft(changes: Partial<CustomOccupationDraft>): void {
  draft.value = { ...draft.value, ...changes };
}

function numberValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function textValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function setFormulaType(event: Event): void {
  const type = textValue(event) as CustomOccupationFormulaDraft["type"];
  const formula: CustomOccupationFormulaDraft = type === "single"
    ? { type: "single", attribute: "EDU", multiplier: 4 }
    : type === "sum-two"
      ? {
        type: "sum-two",
        first: { attribute: "EDU", multiplier: 2 },
        second: { attribute: "DEX", multiplier: 2 },
      }
      : { type: "best-of", attributes: ["EDU", "DEX"], multiplier: 4 };
  replaceDraft({ pointFormula: formula });
}

function setFormulaAttribute(
  part: "single" | "first" | "second",
  attribute: CharacteristicId,
): void {
  const formula = draft.value.pointFormula;
  if (part === "single" && formula.type === "single") {
    replaceDraft({ pointFormula: { ...formula, attribute } });
  } else if (part === "first" && formula.type === "sum-two") {
    replaceDraft({ pointFormula: { ...formula, first: { ...formula.first, attribute } } });
  } else if (part === "second" && formula.type === "sum-two") {
    replaceDraft({ pointFormula: { ...formula, second: { ...formula.second, attribute } } });
  }
}

function setFormulaMultiplier(part: "single" | "first" | "second", multiplier: number): void {
  const formula = draft.value.pointFormula;
  if (part === "single" && (formula.type === "single" || formula.type === "best-of")) {
    replaceDraft({ pointFormula: { ...formula, multiplier } });
  } else if (part === "first" && formula.type === "sum-two") {
    replaceDraft({ pointFormula: { ...formula, first: { ...formula.first, multiplier } } });
  } else if (part === "second" && formula.type === "sum-two") {
    replaceDraft({ pointFormula: { ...formula, second: { ...formula.second, multiplier } } });
  }
}

function toggleBestOfAttribute(attribute: CharacteristicId, checked: boolean): void {
  const formula = draft.value.pointFormula;
  if (formula.type !== "best-of") return;
  const attributes = checked
    ? [...new Set([...formula.attributes, attribute])]
    : formula.attributes.filter((current) => current !== attribute);
  replaceDraft({ pointFormula: { ...formula, attributes } });
}

function addSkillSlot(): void {
  if (draft.value.skillSlots.length >= 8) return;
  replaceDraft({ skillSlots: [...draft.value.skillSlots, createCustomOccupationSkillSlot()] });
}

function updateSlot(slotId: string, changes: Partial<CustomOccupationSkillSlotDraft>): void {
  replaceDraft({
    skillSlots: draft.value.skillSlots.map((slot) =>
      slot.id === slotId ? { ...slot, ...changes } : slot),
  });
}

function removeSlot(slotId: string): void {
  replaceDraft({ skillSlots: draft.value.skillSlots.filter((slot) => slot.id !== slotId) });
}

function getSkill(slot: CustomOccupationSkillSlotDraft): SkillDefinition | undefined {
  return skills.get(slot.definitionId);
}

function slotAllowsCustom(slot: CustomOccupationSkillSlotDraft): boolean {
  const specialization = getSkill(slot)?.specialization;
  return specialization?.type === "required" && specialization.allowCustom;
}

function setSlotSkill(slot: CustomOccupationSkillSlotDraft, definitionId: string): void {
  const skill = skills.get(definitionId);
  if (!skill) {
    updateSlot(slot.id, {
      definitionId: "",
      mode: "ordinary",
      specializationId: undefined,
      customName: undefined,
    });
    return;
  }
  if (skill.specialization.type === "none") {
    updateSlot(slot.id, {
      definitionId,
      mode: "ordinary",
      specializationId: undefined,
      customName: undefined,
    });
    return;
  }
  const firstPredefined = skill.predefinedSpecializations[0];
  updateSlot(slot.id, {
    definitionId,
    mode: firstPredefined ? "predefined" : "specialization-of",
    specializationId: firstPredefined?.id,
    customName: undefined,
  });
}

function setSlotMode(slot: CustomOccupationSkillSlotDraft, mode: CustomOccupationSkillSlotMode): void {
  const skill = getSkill(slot);
  updateSlot(slot.id, {
    mode,
    specializationId: mode === "predefined"
      ? skill?.predefinedSpecializations[0]?.id
      : undefined,
    customName: mode === "named-custom" ? slot.customName ?? "" : undefined,
  });
}

function submit(): void {
  attemptedSubmit.value = true;
  if (conversionErrors.length > 0 || !buildResult.value.definition) return;
  emit("save", buildResult.value.definition);
}
</script>

<template>
  <section class="panel custom-occupation-builder form-stack" aria-label="自定义职业编辑器">
    <header class="section-heading">
      <div>
        <p class="eyebrow">当前调查员</p>
        <h2>{{ isEditing ? "编辑自定义职业" : "创建自定义职业" }}</h2>
      </div>
      <button class="button" type="button" @click="emit('cancel')">取消</button>
    </header>

    <p>只填写当前调查员需要的职业信息；来源与适用时代由系统安全设置。</p>
    <p v-if="hasStructuredSkillDraft" class="warning-message" role="alert">
      修改职业定义会保留现有技能草稿；不再匹配的内容需在技能步骤调整或重置。
    </p>
    <ul v-if="conversionErrors.length" class="validation-list" role="alert">
      <li v-for="message in conversionErrors" :key="message">{{ message }}</li>
    </ul>

    <fieldset class="builder-fieldset" :disabled="conversionErrors.length > 0">
      <legend>基础信息</legend>
      <div class="config-grid">
        <label class="field">
          <span>职业名称（中文）</span>
          <input
            data-testid="custom-occupation-name-zh"
            type="text"
            :value="draft.nameZh"
            required
            @input="replaceDraft({ nameZh: textValue($event) })"
          />
        </label>
        <label class="field">
          <span>英文名称（可选）</span>
          <input
            type="text"
            :value="draft.nameEn"
            placeholder="留空时使用中文名称"
            @input="replaceDraft({ nameEn: textValue($event) })"
          />
        </label>
        <label class="field">
          <span>职业分类</span>
          <select
            :value="draft.category"
            @change="replaceDraft({ category: textValue($event) as CustomOccupationDraft['category'] })"
          >
            <option v-for="category in occupationCategoryIds" :key="category" :value="category">
              {{ formatOccupationCategory(category) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>最低信用评级</span>
          <input
            type="number"
            min="0"
            max="99"
            :value="draft.creditRatingMin"
            @input="replaceDraft({ creditRatingMin: numberValue($event) })"
          />
        </label>
        <label class="field">
          <span>最高信用评级</span>
          <input
            type="number"
            min="0"
            max="99"
            :value="draft.creditRatingMax"
            @input="replaceDraft({ creditRatingMax: numberValue($event) })"
          />
        </label>
      </div>
    </fieldset>

    <fieldset class="builder-fieldset" :disabled="conversionErrors.length > 0">
      <legend>本职技能点公式</legend>
      <label class="field">
        <span>公式类型</span>
        <select :value="draft.pointFormula.type" @change="setFormulaType">
          <option value="single">单属性 × 倍数</option>
          <option value="sum-two">两项相加</option>
          <option value="best-of">多属性取高 × 倍数</option>
        </select>
      </label>

      <div v-if="draft.pointFormula.type === 'single'" class="formula-row">
        <select
          :value="draft.pointFormula.attribute"
          aria-label="公式属性"
          @change="setFormulaAttribute('single', textValue($event) as CharacteristicId)"
        >
          <option v-for="attribute in characteristicIds" :key="attribute" :value="attribute">{{ attribute }}</option>
        </select>
        <span>×</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          aria-label="公式倍数"
          :value="draft.pointFormula.multiplier"
          @input="setFormulaMultiplier('single', numberValue($event))"
        />
      </div>

      <div v-else-if="draft.pointFormula.type === 'sum-two'" class="formula-stack">
        <div class="formula-row">
          <select
            :value="draft.pointFormula.first.attribute"
            aria-label="第一项属性"
            @change="setFormulaAttribute('first', textValue($event) as CharacteristicId)"
          >
            <option v-for="attribute in characteristicIds" :key="attribute" :value="attribute">{{ attribute }}</option>
          </select>
          <span>×</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-label="第一项倍数"
            :value="draft.pointFormula.first.multiplier"
            @input="setFormulaMultiplier('first', numberValue($event))"
          />
        </div>
        <strong>＋</strong>
        <div class="formula-row">
          <select
            :value="draft.pointFormula.second.attribute"
            aria-label="第二项属性"
            @change="setFormulaAttribute('second', textValue($event) as CharacteristicId)"
          >
            <option v-for="attribute in characteristicIds" :key="attribute" :value="attribute">{{ attribute }}</option>
          </select>
          <span>×</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-label="第二项倍数"
            :value="draft.pointFormula.second.multiplier"
            @input="setFormulaMultiplier('second', numberValue($event))"
          />
        </div>
      </div>

      <div v-else class="form-stack compact-stack">
        <div class="best-of-options">
          <label v-for="attribute in characteristicIds" :key="attribute" class="checkbox-field">
            <input
              type="checkbox"
              :checked="draft.pointFormula.attributes.includes(attribute)"
              @change="toggleBestOfAttribute(attribute, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ attribute }}</span>
          </label>
        </div>
        <label class="field inline-field">
          <span>取高后乘以</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            :value="draft.pointFormula.multiplier"
            @input="setFormulaMultiplier('single', numberValue($event))"
          />
        </label>
      </div>
      <p class="builder-preview">
        公式预览：<strong>{{ pointFormulaPreview ? formatOccupationPointFormula(pointFormulaPreview) : "请完成合法公式" }}</strong>
      </p>
    </fieldset>

    <fieldset class="builder-fieldset" :disabled="conversionErrors.length > 0">
      <legend>本职技能栏位</legend>
      <div class="section-heading">
        <p>最多添加 8 个；信用评级由上方范围独立处理。</p>
        <button
          class="button"
          data-testid="add-custom-skill-slot"
          type="button"
          :disabled="draft.skillSlots.length >= 8"
          @click="addSkillSlot"
        >
          添加本职技能
        </button>
      </div>

      <ol v-if="draft.skillSlots.length" class="builder-slot-list">
        <li v-for="(slot, index) in draft.skillSlots" :key="slot.id" class="builder-slot">
          <div class="builder-slot-heading">
            <strong>栏位 {{ index + 1 }}</strong>
            <button class="button danger" type="button" @click="removeSlot(slot.id)">移除</button>
          </div>
          <label class="field">
            <span>技能</span>
            <select
              :value="slot.definitionId"
              :aria-label="`栏位 ${index + 1} 技能`"
              @change="setSlotSkill(slot, textValue($event))"
            >
              <option value="">请选择技能</option>
              <option v-for="skill in availableSkills" :key="skill.id" :value="skill.id">
                {{ skill.name.zh }}
              </option>
            </select>
          </label>

          <template v-if="getSkill(slot)?.specialization.type === 'required'">
            <label class="field">
              <span>技能专攻形式</span>
              <select
                :value="slot.mode"
                :aria-label="`栏位 ${index + 1} 技能专攻形式`"
                @change="setSlotMode(slot, textValue($event) as CustomOccupationSkillSlotMode)"
              >
                <option v-if="getSkill(slot)?.predefinedSpecializations.length" value="predefined">
                  已有预设技能专攻
                </option>
                <option
                  v-if="slotAllowsCustom(slot)"
                  value="named-custom"
                >
                  固定自定义技能专攻
                </option>
                <option value="specialization-of">建卡技能步骤再决定具体技能专攻</option>
              </select>
            </label>

            <label v-if="slot.mode === 'predefined'" class="field">
              <span>预定义技能专攻</span>
              <select
                :value="slot.specializationId"
                :aria-label="`栏位 ${index + 1} 预定义技能专攻`"
                @change="updateSlot(slot.id, { specializationId: textValue($event) })"
              >
                <option
                  v-for="specialization in getSkill(slot)?.predefinedSpecializations ?? []"
                  :key="specialization.id"
                  :value="specialization.id"
                >
                  {{ specialization.name.zh }}
                </option>
              </select>
            </label>

            <label v-else-if="slot.mode === 'named-custom'" class="field">
              <span>具体技能专攻名称</span>
              <input
                type="text"
                :value="slot.customName"
                :aria-label="`栏位 ${index + 1} 自定义技能专攻名称`"
                @input="updateSlot(slot.id, { customName: textValue($event) })"
              />
            </label>

            <p v-else-if="slot.mode === 'specialization-of'" class="muted">
              <template v-if="slot.definitionId === 'fighting' || slot.definitionId === 'firearms'">
                此栏位保持通用格斗／射击语义：至少选择 1 个技能专攻，不设置上限。
              </template>
              <template v-else>将在下一步选择 1 个具体技能专攻。</template>
            </p>
          </template>
        </li>
      </ol>
      <p v-else class="empty-state">尚未添加本职技能栏位；可以少于 8 个。</p>
      <p class="builder-capacity" aria-live="polite">
        当前本职技能容量：{{ buildResult.maximumSkills ?? "—" }} / 8
      </p>
    </fieldset>

    <ul v-if="attemptedSubmit && buildResult.errors.length" class="validation-list" role="alert">
      <li v-for="(message, index) in buildResult.errors" :key="`${index}:${message}`">{{ message }}</li>
    </ul>

    <footer class="actions">
      <button class="button" type="button" @click="emit('cancel')">取消</button>
      <button
        class="button primary"
        data-testid="save-custom-occupation"
        type="button"
        :disabled="conversionErrors.length > 0"
        @click="submit"
      >
        {{ isEditing ? "保存职业修改" : "保存并选择此职业" }}
      </button>
    </footer>
  </section>
</template>
