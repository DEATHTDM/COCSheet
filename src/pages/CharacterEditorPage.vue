<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import { useUiPreferenceStore } from "../app/stores/uiPreferenceStore";
import { deriveFinalCharacteristics, getAgeAdjustmentRule } from "../coc7/rules/age";
import { applyLowRollBoost, getFifthValue, getHalfValue, getPointBuyAllocationSummary, validateAssignRoll, validatePointBuy } from "../coc7/rules/attributes";
import {
  calculateMaximumSanity,
  deriveStandardCharacterValues,
  formatDamageBonus,
} from "../coc7/rules/derived";
import { characteristicIds, type CharacteristicId, type CharacteristicValues } from "../coc7/types/attribute";
import type { EraId } from "../coc7/types/occupation";
import { isSupportedSetting } from "../coc7/types/setting";
import OccupationBrowser from "../components/creation/OccupationBrowser.vue";
import CreationGuidePanel from "../components/creation/CreationGuidePanel.vue";
import CharacterReviewPanel from "../components/creation/CharacterReviewPanel.vue";
import CharacterBackgroundStep from "../components/creation/CharacterBackgroundStep.vue";
import CharacterPossessionsStep from "../components/creation/CharacterPossessionsStep.vue";
import SkillRequirementStep from "../components/creation/SkillRequirementStep.vue";
import { getSettingPack } from "../content/registry";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import { formatOccupationEraId } from "../creation/presentation/occupationPresentation";
import { useCreationStore } from "../creation/stores/creationStore";
import type { AttributeGenerationMethod } from "../creation/types/creationPreset";
import type { CreationStepId } from "../creation/types/creationSession";

const route = useRoute();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const uiPreferenceStore = useUiPreferenceStore();
const name = ref("");
const sex = ref("");
const residence = ref("");
const birthplace = ref("");
const age = ref<number>(20);
const eraId = ref<EraId | "">("");
const ready = ref(false);
const errorMessage = ref("");
const saveStatus = ref<"idle" | "saving" | "saved">("idle");
let saveTimer: number | undefined;
let lastSavedName = "";

const methodLabels: Readonly<Record<AttributeGenerationMethod, string>> = {
  "standard-roll": "标准掷骰",
  "low-roll-boost": "低骰补强",
  "assign-roll": "自由分配骰值",
  "multi-roll": "多组选择",
  "point-buy": "购点",
  manual: "手动输入",
};

const creationSteps: readonly { readonly id: CreationStepId; readonly label: string }[] = [
  { id: "basic-info", label: "基本信息" },
  { id: "attributes", label: "属性" },
  { id: "occupation", label: "职业" },
  { id: "skills", label: "技能" },
  { id: "background", label: "背景" },
  { id: "possessions", label: "财富与物品" },
  { id: "review", label: "检查" },
];

const characterId = computed(() => String(route.params.id));
const session = computed(() => creationStore.current?.data);
const currentStep = computed(() => session.value?.currentStep ?? "basic-info");
const guideOpen = computed(() => uiPreferenceStore.creationExperienceMode === "guided");
const attributes = computed(() => session.value?.attributes);
const generation = computed(() => attributes.value?.generation);
const baseValues = computed(() => generation.value?.baseCharacteristics);
const ageRule = computed(() => getAgeAdjustmentRule(session.value?.draftAge ?? age.value));
const ageAdjustment = computed(() => attributes.value?.ageAdjustment);
const completionErrors = computed(() => creationStore.getCompletionErrors());
const settingName = computed(() =>
  characterStore.current ? getHistoricalSettingLabel(characterStore.current.settingId) : "",
);
const supportedSetting = computed(() => characterStore.current !== undefined &&
  isSupportedSetting(characterStore.current.settingId));
const availableEras = computed<readonly EraId[]>(() =>
  characterStore.current
    ? getSettingPack(characterStore.current.settingId)?.eras ?? []
    : [],
);
const reductionAllocated = computed(() =>
  characteristicIds.reduce((total, id) => total + (ageAdjustment.value?.reductionAllocation[id] ?? 0), 0),
);
const reductionRemaining = computed(() => ageRule.value.reduction.total - reductionAllocated.value);
const manualEnteredCount = computed(() => {
  const state = generation.value;
  return state?.method === "manual"
    ? characteristicIds.filter((id) => state.values?.[id] !== undefined).length
    : 0;
});
const pointBuySummary = computed(() => {
  const state = generation.value;
  return state?.method === "point-buy" && state.values
    ? getPointBuyAllocationSummary(state.values, creationStore.config.pointBuy)
    : undefined;
});
const generationErrors = computed<readonly string[]>(() => {
  const state = generation.value;
  if (!state) return [];
  if (state.method === "low-roll-boost" && state.result) {
    return applyLowRollBoost(state.result, state.bonusRoll, state.allocation ?? {}).validation.errors;
  }
  if (state.method === "assign-roll" && state.rolls) {
    const limits = creationStore.config.assignRoll ?? { intMin: 40, sizMin: 40 };
    return validateAssignRoll(state.rolls, state.assignments ?? {}, limits.intMin, limits.sizMin).validation.errors;
  }
  if (state.method === "point-buy" && state.values) {
    return validatePointBuy(state.values, creationStore.config.pointBuy).errors;
  }
  return [];
});
const finalPreview = computed<CharacteristicValues | undefined>(() => {
  if (!baseValues.value || !ageAdjustment.value || ageRule.value.requiresKeeperRuling) return undefined;
  try {
    return deriveFinalCharacteristics(
      baseValues.value,
      ageRule.value,
      ageAdjustment.value.reductionAllocation,
      ageAdjustment.value.eduImprovements,
    );
  } catch {
    return undefined;
  }
});
const derivedPreview = computed(() => {
  if (!finalPreview.value || session.value?.draftAge === undefined) return undefined;
  try {
    return deriveStandardCharacterValues(session.value.draftAge, finalPreview.value);
  } catch {
    return undefined;
  }
});
const savedCthulhuMythos = computed(() => characterStore.current?.data.skills?.find(
  (skill) => skill.ref.type === "standard" &&
    skill.ref.definitionId === "cthulhu-mythos",
)?.currentValue ?? 0);
const savedMaximumSanity = computed(() => calculateMaximumSanity(savedCthulhuMythos.value));
const sanityNeedsReconciliation = computed(() => {
  const currentSan = characterStore.current?.data.resources?.san.current;
  return currentSan !== undefined && currentSan > savedMaximumSanity.value;
});

function setGuideOpen(open: boolean): void {
  uiPreferenceStore.setCreationExperienceMode(open ? "guided" : "quick");
}

onMounted(async () => {
  try {
    const [loadedRecord, sessionRecord] = await Promise.all([
      characterStore.loadById(characterId.value),
      creationStore.loadByCharacterId(characterId.value),
    ]);
    if (!loadedRecord || !sessionRecord) {
      errorMessage.value = "找不到该调查员或建卡会话。";
      return;
    }
    const record = await characterStore.ensureResourcesInitialized(characterId.value);
    name.value = record.name;
    lastSavedName = record.name;
    age.value = sessionRecord.data.draftAge ?? record.data.age ?? 20;
    eraId.value = record.data.eraId ?? "";
    sex.value = record.data.sex ?? "";
    residence.value = record.data.residence ?? "";
    birthplace.value = record.data.birthplace ?? "";
    ready.value = true;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取调查员失败。";
  }
});

watch(name, () => {
  if (!ready.value || name.value === lastSavedName) return;
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  saveStatus.value = "idle";
  saveTimer = window.setTimeout(() => void persistName(), 350);
});

onBeforeUnmount(() => {
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  if (ready.value && name.value !== lastSavedName) void persistName();
});

async function persistName(): Promise<void> {
  const valueToSave = name.value;
  saveStatus.value = "saving";
  try {
    await characterStore.updateName(characterId.value, valueToSave);
    lastSavedName = valueToSave;
    saveStatus.value = "saved";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存姓名失败。";
  }
}

async function goToAttributes(): Promise<void> {
  try {
    if (!sex.value.trim() || !residence.value.trim() || !birthplace.value.trim()) {
      errorMessage.value = "请填写性别、住所与出身地。";
      return;
    }
    if (availableEras.value.length > 0 && !characterStore.current?.data.eraId) {
      errorMessage.value = "请选择建卡时代。";
      return;
    }
    await persistName();
    await characterStore.setIdentityDetails(characterId.value, {
      sex: sex.value,
      residence: residence.value,
      birthplace: birthplace.value,
    });
    await creationStore.setAge(age.value);
    await creationStore.setCurrentStep("attributes");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存基本信息失败。";
  }
}

function hasEraSensitiveDraft(): boolean {
  if (session.value?.occupation) return true;
  const skills = session.value?.skills;
  return Boolean(skills && (
    skills.requirementSelections.length > 0 ||
    skills.allocations.length > 0 ||
    skills.keeperApprovals.length > 0 ||
    skills.occupationSkillReplacement !== undefined ||
    skills.existingSkillResolution !== undefined
  ));
}

async function changeEra(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const selectedEraId = select.value as EraId | "";
  const previousEraId = characterStore.current?.data.eraId;
  if (!selectedEraId || selectedEraId === previousEraId) {
    eraId.value = previousEraId ?? "";
    select.value = previousEraId ?? "";
    return;
  }
  if (previousEraId && hasEraSensitiveDraft() && !window.confirm(
    "更换建卡时代会保留当前职业与技能草稿；不兼容内容将被标记并阻止继续。是否继续？",
  )) {
    eraId.value = previousEraId;
    select.value = previousEraId;
    return;
  }
  try {
    await characterStore.setEra(characterId.value, selectedEraId);
    eraId.value = selectedEraId;
    errorMessage.value = "";
  } catch (error: unknown) {
    eraId.value = previousEraId ?? "";
    select.value = previousEraId ?? "";
    errorMessage.value = error instanceof Error ? error.message : "保存建卡时代失败。";
  }
}

async function changeAge(): Promise<void> {
  try {
    await creationStore.setAge(age.value);
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存年龄失败。";
  }
}

async function chooseMethod(method: AttributeGenerationMethod): Promise<void> {
  if (attributes.value && attributes.value.generationMethod !== method &&
    !window.confirm("更换属性生成方式将清除当前属性生成结果，是否继续？")) return;
  await creationStore.chooseGenerationMethod(method);
}

function numberFromEvent(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

async function setEnteredValue(id: CharacteristicId, event: Event): Promise<void> {
  const raw = (event.target as HTMLInputElement).value;
  await creationStore.setEnteredValue(id, raw === "" ? undefined : Number(raw));
}

async function setLowAllocation(id: CharacteristicId, event: Event): Promise<void> {
  await creationStore.setLowRollAllocation(id, numberFromEvent(event));
}

async function setReduction(id: CharacteristicId, event: Event): Promise<void> {
  await creationStore.setReduction(id, numberFromEvent(event));
}

async function setAssignment(id: CharacteristicId, event: Event): Promise<void> {
  await creationStore.setAssignment(id, (event.target as HTMLSelectElement).value);
}

function hasGeneratedResult(): boolean {
  const state = generation.value;
  if (!state) return false;
  if (state.method === "standard-roll" || state.method === "low-roll-boost") return state.result !== undefined;
  if (state.method === "assign-roll") return (state.rolls?.length ?? 0) > 0;
  if (state.method === "multi-roll") return (state.candidates?.length ?? 0) > 0;
  return false;
}

async function generateAttributes(): Promise<void> {
  if (hasGeneratedResult() && !window.confirm("重新生成将覆盖当前属性骰值，是否继续？")) return;
  await creationStore.generateCurrentMethod();
}

async function rollEduWithConfirmation(): Promise<void> {
  if ((ageAdjustment.value?.eduImprovements.length ?? 0) > 0 &&
    !window.confirm("重新进行 EDU 成长将覆盖当前成长记录，是否继续？")) return;
  await creationStore.rollEdu();
}

async function rollLuckWithConfirmation(): Promise<void> {
  if (attributes.value?.luck && !window.confirm("重新掷 Luck 将覆盖当前 Luck 结果，是否继续？")) return;
  await creationStore.rollCurrentLuck();
}

async function complete(): Promise<void> {
  if (!characterStore.current) return;
  try {
    await creationStore.completeAttributes(characterStore.current.data);
    await characterStore.loadById(characterId.value);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "完成属性失败。";
  }
}

async function reconcileSanity(): Promise<void> {
  try {
    await characterStore.reconcileSanityToMaximum(characterId.value);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "同步 SAN 上限失败。";
  }
}
</script>

<template>
  <section class="page-stack editor-page">
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <template v-if="characterStore.current && session">
      <div>
        <p class="eyebrow">调查员 ID：{{ characterStore.current.id }}</p>
        <h1>{{ name || "未命名调查员" }}</h1>
        <p>当前设定：{{ settingName }}</p>
      </div>

      <aside v-if="!supportedSetting" class="panel legacy-warning" role="alert">
        <strong>当前不支持继续该建卡环境</strong>
        <p>
          这份历史 Character 与 CreationSession 会保持原样；页面不会转换为 Standard，
          也不会用 Standard 的属性、职业、技能、财富或武器规则继续建卡。
        </p>
        <div class="actions">
          <RouterLink class="button primary" :to="`/characters/${characterStore.current.id}/sheet`">
            打开人物卡
          </RouterLink>
          <RouterLink class="button" to="/">返回首页</RouterLink>
        </div>
      </aside>

      <template v-else>
      <aside v-if="sanityNeedsReconciliation" class="panel legacy-warning" role="alert">
        <strong>旧版本 SAN 数据需要同步</strong>
        <p>
          当前 SAN {{ characterStore.current.data.resources?.san.current }} 高于克苏鲁神话
          {{ savedCthulhuMythos }} 所允许的最大理智 {{ savedMaximumSanity }}。该人物来自旧版本数据，
          在你明确同步前不会修改本地记录。
        </p>
        <button class="button" type="button" @click="reconcileSanity">
          同步至 {{ savedMaximumSanity }}
        </button>
      </aside>

      <ol class="stepper" aria-label="建卡步骤">
        <li
          v-for="step in creationSteps"
          :key="step.id"
          :class="{ active: currentStep === step.id }"
          :aria-current="currentStep === step.id ? 'step' : undefined"
        >{{ step.label }}</li>
      </ol>

      <div
        class="creation-workspace"
        :class="{ 'creation-workspace--quick': !guideOpen }"
      >
        <CreationGuidePanel
          :current-step="currentStep"
          :open="guideOpen"
          @update:open="setGuideOpen"
        />

        <div class="creation-step-focus" aria-label="当前建卡步骤内容">
          <div v-if="!guideOpen" class="creation-guide-toolbar">
            <button
              class="button creation-guide-toggle"
              type="button"
              aria-expanded="false"
              @click="setGuideOpen(true)"
            >显示新手引导</button>
          </div>
      <section v-if="currentStep === 'basic-info'" class="panel form-stack">
        <h2>基本信息</h2>
        <label class="field">
          <span>姓名</span>
          <input v-model="name" type="text" autocomplete="off" />
          <small aria-live="polite">{{ saveStatus === "saving" ? "正在保存……" : saveStatus === "saved" ? "已保存" : "修改后自动保存" }}</small>
        </label>
        <label class="field">
          <span>年龄</span>
          <input
            v-model.number="age"
            type="number"
            :min="session.presetSnapshot?.age?.min ?? 0"
            :max="session.presetSnapshot?.age?.max"
            step="1"
            required
            @change="changeAge"
          />
        </label>
        <label class="field">
          <span>性别</span>
          <input v-model="sex" type="text" autocomplete="off" required />
        </label>
        <label class="field">
          <span>住所</span>
          <input v-model="residence" type="text" autocomplete="off" required />
        </label>
        <label class="field">
          <span>出身地</span>
          <input v-model="birthplace" type="text" autocomplete="off" required />
        </label>
        <label v-if="availableEras.length > 0" class="field">
          <span>建卡时代</span>
          <select :value="eraId" required @change="changeEra">
            <option value="" disabled>请选择</option>
            <option v-for="availableEra in availableEras" :key="availableEra" :value="availableEra">
              {{ formatOccupationEraId(availableEra) }}
            </option>
          </select>
        </label>
        <button class="button primary" type="button" @click="goToAttributes">继续：属性</button>
      </section>

      <section v-else-if="currentStep === 'attributes'" class="page-stack">
        <div class="panel form-stack">
          <div class="section-heading">
            <div><p class="eyebrow">年龄 {{ session.draftAge }} 岁</p><h2>属性生成</h2></div>
            <button class="button" type="button" @click="creationStore.setCurrentStep('basic-info')">返回基本信息</button>
          </div>
          <p v-if="session.settingId !== 'standard'" class="warning-message">当前建卡环境的属性规则尚未实现；本阶段不会自动套用 Standard COC7 规则。</p>
          <div v-else class="method-grid">
            <button
              v-for="method in creationStore.config.allowedMethods"
              :key="method"
              class="button"
              :class="{ selected: attributes?.generationMethod === method }"
              type="button"
              @click="chooseMethod(method)"
            >{{ methodLabels[method] }}</button>
          </div>
        </div>

        <section v-if="generation" class="panel form-stack">
          <div class="section-heading"><h2>{{ methodLabels[generation.method] }}</h2></div>

          <button v-if="['standard-roll','low-roll-boost','assign-roll','multi-roll'].includes(generation.method)" class="button primary" type="button" @click="generateAttributes">
            {{ generation.method === 'multi-roll' ? `生成 ${creationStore.config.multiRoll?.count ?? 3} 组` : '掷骰生成' }}
          </button>

          <template v-if="generation.method === 'standard-roll' && generation.result">
            <div class="attribute-grid">
              <div v-for="roll in generation.result.rolls" :key="roll.characteristic" class="attribute-card">
                <strong>{{ roll.characteristic }} {{ roll.value }}</strong><small>{{ roll.dice.join('+') }}{{ roll.modifier ? `+${roll.modifier}` : '' }} = {{ roll.raw }}</small>
              </div>
            </div>
          </template>

          <template v-if="generation.method === 'low-roll-boost' && generation.result">
            <p v-if="generation.bonusRoll">至少三项原始结果低于 10，获得 {{ generation.bonusRoll }} 点补强；请自行分配。</p>
            <p v-else class="success-message">不足三项原始结果低于 10，本次不触发补强。</p>
            <div class="attribute-grid">
              <label v-for="roll in generation.result.rolls" :key="roll.characteristic" class="attribute-card field">
                <span>{{ roll.characteristic }}：原始 {{ roll.raw }}</span>
                <input
                  v-if="roll.raw < 10 && generation.bonusRoll"
                  type="number" min="0" :max="generation.bonusRoll"
                  :value="generation.allocation?.[roll.characteristic] ?? 0"
                  @input="setLowAllocation(roll.characteristic, $event)"
                />
                <strong v-else>{{ roll.value }}</strong>
              </label>
            </div>
          </template>

          <template v-if="generation.method === 'assign-roll' && generation.rolls">
            <p>五个 3D6 与三个 2D6+6 结果均可自由分配；每个结果只能使用一次。</p>
            <div class="attribute-grid">
              <label v-for="id in characteristicIds" :key="id" class="field attribute-card">
                <span>{{ id }}</span>
                <select :value="generation.assignments?.[id] ?? ''" @change="setAssignment(id, $event)">
                  <option value="" disabled>选择骰值</option>
                  <option v-for="roll in generation.rolls" :key="roll.id" :value="roll.id">{{ roll.value }}（{{ roll.formula }}：{{ roll.dice.join('+') }}{{ roll.modifier ? `+${roll.modifier}` : '' }}）</option>
                </select>
              </label>
            </div>
          </template>

          <template v-if="generation.method === 'multi-roll' && generation.candidates">
            <label v-for="(candidate, index) in generation.candidates" :key="index" class="candidate-card">
              <input type="radio" name="candidate" :checked="generation.selectedIndex === index" @change="creationStore.selectCandidate(index)" />
              <strong>第 {{ index + 1 }} 组</strong>
              <span>{{ characteristicIds.map(id => `${id} ${candidate.values[id]}`).join(' · ') }}</span>
            </label>
          </template>

          <template v-if="generation.method === 'point-buy' || generation.method === 'manual'">
            <p v-if="generation.method === 'point-buy'">总和 {{ creationStore.config.pointBuy?.total ?? 460 }}；范围 {{ creationStore.config.pointBuy?.min ?? 15 }}～{{ creationStore.config.pointBuy?.max ?? 90 }}；INT/SIZ 下限 {{ creationStore.config.pointBuy?.intMin ?? 40 }}/{{ creationStore.config.pointBuy?.sizMin ?? 40 }}。</p>
            <p v-else>输入年龄调整前的八项基础属性。已填写 {{ manualEnteredCount }}/8。</p>
            <div v-if="generation.method === 'point-buy' && pointBuySummary" class="allocation-summary">
              <strong>总点数：{{ pointBuySummary.total }}</strong><span>已分配：{{ pointBuySummary.allocated }}</span><span>剩余：{{ pointBuySummary.remaining }}</span>
            </div>
            <div class="attribute-grid">
              <label v-for="id in characteristicIds" :key="id" class="field attribute-card">
                <span>{{ id }}</span>
                <input
                  type="number"
                  :min="generation.method === 'point-buy' ? creationStore.config.pointBuy?.min ?? 15 : 0"
                  :max="generation.method === 'point-buy' ? creationStore.config.pointBuy?.max ?? 90 : 99"
                  :value="generation.values?.[id] ?? ''"
                  @input="setEnteredValue(id, $event)"
                />
              </label>
            </div>
          </template>
          <ul v-if="generationErrors.length" class="validation-list"><li v-for="message in generationErrors" :key="message">{{ message }}</li></ul>
        </section>

        <section v-if="baseValues" class="panel form-stack">
          <h2>年龄调整：{{ ageRule.ageRange }}</h2>
          <p v-if="ageRule.requiresKeeperRuling" class="warning-message">该年龄不在标准自动调整范围内，需要 KP 裁定。</p>
          <template v-else>
            <p>EDU 成长判定 ×{{ ageRule.eduImprovementCount }}；<span v-if="ageRule.fixed.APP">APP {{ ageRule.fixed.APP }}</span><span v-if="ageRule.fixed.EDU">EDU {{ ageRule.fixed.EDU }}</span></p>
            <div v-if="ageRule.reduction.total > 0" class="allocation-summary">
              <strong>需要减少：{{ ageRule.reduction.total }}</strong><span>已分配：{{ reductionAllocated }}</span><span>剩余：{{ reductionRemaining }}</span>
            </div>
            <div v-if="ageRule.reduction.total > 0" class="attribute-grid">
              <label v-for="id in ageRule.reduction.characteristics" :key="id" class="field attribute-card">
                <span>{{ id }}（基础 {{ baseValues[id] }}）</span>
                <input type="number" min="0" :max="baseValues[id]" :value="ageAdjustment?.reductionAllocation[id] ?? 0" @input="setReduction(id, $event)" />
              </label>
            </div>
            <div class="form-stack compact-stack">
              <button v-if="ageRule.eduImprovementCount > 0" class="button" type="button" @click="rollEduWithConfirmation">进行 EDU 成长判定 ×{{ ageRule.eduImprovementCount }}</button>
              <p v-else>本年龄段没有 EDU 成长判定。</p>
              <ol v-if="ageAdjustment?.eduImprovements.length" class="result-list">
                <li v-for="(result, index) in ageAdjustment.eduImprovements" :key="index">第 {{ index + 1 }} 次：D100={{ result.checkRoll }}，EDU {{ result.eduBefore }} → {{ result.eduAfter }}（{{ result.success ? `成功${result.improvementRoll ? `，+${result.improvementRoll}` : ''}` : '失败' }}）</li>
              </ol>
            </div>
            <div class="luck-controls">
              <button class="button" type="button" @click="rollLuckWithConfirmation">掷 Luck（{{ ageRule.luckRollCount }} 次取高）</button>
              <span>或手动输入</span>
              <input type="number" min="0" max="99" :value="attributes?.luck?.source === 'manual' ? attributes.luck.value : ''" @change="creationStore.setManualLuck(numberFromEvent($event))" />
            </div>
            <p v-if="attributes?.luck"><strong>Luck：{{ attributes.luck.value }}</strong><span v-if="attributes.luck.source === 'rolled'">（骰值：{{ attributes.luck.rolls.map(roll => roll.total).join('、') }}）</span><span v-else>（手动）</span></p>
          </template>
        </section>

        <section v-if="baseValues" class="panel form-stack">
          <h2>属性预览</h2>
          <div class="attribute-table-wrap">
            <table class="attribute-table"><thead><tr><th>属性</th><th>基础</th><th>最终</th><th>Half</th><th>Fifth</th></tr></thead><tbody>
              <tr v-for="id in characteristicIds" :key="id"><th>{{ id }}</th><td>{{ baseValues[id] }}</td><td>{{ finalPreview?.[id] ?? '—' }}</td><td>{{ finalPreview ? getHalfValue(finalPreview[id]) : '—' }}</td><td>{{ finalPreview ? getFifthValue(finalPreview[id]) : '—' }}</td></tr>
            </tbody></table>
          </div>
          <template v-if="derivedPreview">
            <h2>派生属性预览</h2>
            <div class="attribute-grid">
              <div class="attribute-card"><span>最大 HP</span><strong>{{ derivedPreview.maxHp }}</strong></div>
              <div class="attribute-card"><span>起始 MP</span><strong>{{ derivedPreview.initialMp }}</strong></div>
              <div class="attribute-card"><span>起始 SAN</span><strong>{{ derivedPreview.initialSan }}</strong></div>
              <div class="attribute-card"><span>MOV</span><strong>{{ derivedPreview.movement.status === 'value' ? derivedPreview.movement.value : '需 KP 裁定' }}</strong></div>
              <div class="attribute-card"><span>Damage Bonus</span><strong>{{ formatDamageBonus(derivedPreview.damageBonus) }}</strong></div>
              <div class="attribute-card"><span>Build</span><strong>{{ derivedPreview.build }}</strong></div>
            </div>
          </template>
          <ul v-if="completionErrors.length" class="validation-list"><li v-for="message in completionErrors" :key="message">{{ message }}</li></ul>
          <button class="button primary" type="button" :disabled="completionErrors.length > 0" @click="complete">完成属性</button>
        </section>
      </section>

      <OccupationBrowser
        v-else-if="currentStep === 'occupation'"
        :era-id="characterStore.current.data.eraId"
      />

      <SkillRequirementStep
        v-else-if="currentStep === 'skills'"
        :era-id="characterStore.current.data.eraId"
        :character="characterStore.current.data"
      />

      <CharacterBackgroundStep
        v-else-if="currentStep === 'background'"
        :character="characterStore.current.data"
      />

      <CharacterPossessionsStep
        v-else-if="currentStep === 'possessions'"
        :character="characterStore.current.data"
      />

      <CharacterReviewPanel
        v-else-if="currentStep === 'review'"
        :character="characterStore.current.data"
      />
        </div>
      </div>
      </template>
    </template>
    <p v-else>正在读取本地数据……</p>
  </section>
</template>
