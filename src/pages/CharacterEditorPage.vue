<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useCharacterStore } from "../app/stores/characterStore";
import { deriveFinalCharacteristics, getAgeAdjustmentRule } from "../coc7/rules/age";
import { applyLowRollBoost, getFifthValue, getHalfValue, getPointBuyAllocationSummary, validateAssignRoll, validatePointBuy } from "../coc7/rules/attributes";
import { deriveStandardCharacterValues, formatDamageBonus } from "../coc7/rules/derived";
import { characteristicIds, type CharacteristicId, type CharacteristicValues } from "../coc7/types/attribute";
import { getSettingPackOrThrow } from "../content/registry";
import { useCreationStore } from "../creation/stores/creationStore";
import type { AttributeGenerationMethod } from "../creation/types/creationPreset";

const route = useRoute();
const characterStore = useCharacterStore();
const creationStore = useCreationStore();
const name = ref("");
const age = ref<number>(20);
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

const characterId = computed(() => String(route.params.id));
const session = computed(() => creationStore.current?.data);
const currentStep = computed(() => session.value?.currentStep ?? "basic-info");
const attributes = computed(() => session.value?.attributes);
const generation = computed(() => attributes.value?.generation);
const baseValues = computed(() => generation.value?.baseCharacteristics);
const ageRule = computed(() => getAgeAdjustmentRule(session.value?.draftAge ?? age.value));
const ageAdjustment = computed(() => attributes.value?.ageAdjustment);
const completionErrors = computed(() => creationStore.getCompletionErrors());
const settingName = computed(() =>
  characterStore.current ? getSettingPackOrThrow(characterStore.current.settingId).name : "",
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
const savedDerived = computed(() => {
  const character = characterStore.current?.data;
  if (!character?.characteristics || character.age === undefined || character.settingId !== "standard") {
    return undefined;
  }
  try {
    return deriveStandardCharacterValues(character.age, character.characteristics);
  } catch {
    return undefined;
  }
});

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
    ready.value = true;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取调查员失败。";
  }
});

watch(name, () => {
  if (!ready.value) return;
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
    await persistName();
    await creationStore.setAge(age.value);
    await creationStore.setCurrentStep("attributes");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存基本信息失败。";
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

      <ol class="stepper" aria-label="建卡步骤">
        <li :class="{ active: currentStep === 'basic-info' }">基本信息</li>
        <li :class="{ active: currentStep === 'attributes' }">属性</li>
        <li :class="{ active: currentStep === 'occupation' }">职业</li>
        <li :class="{ active: currentStep === 'review' }">检查</li>
      </ol>

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

      <section v-else-if="currentStep === 'occupation'" class="panel form-stack">
        <p class="eyebrow">下一步</p><h2>职业（尚未实现）</h2>
        <p>属性已保存到调查员。职业系统不在本阶段范围内。</p>
        <div v-if="characterStore.current.data.characteristics" class="attribute-grid">
          <div v-for="id in characteristicIds" :key="id" class="attribute-card"><strong>{{ id }} {{ characterStore.current.data.characteristics[id] }}</strong></div>
          <div class="attribute-card"><strong>Luck {{ characterStore.current.data.luck }}</strong></div>
        </div>
        <div v-if="characterStore.current.data.resources && savedDerived" class="attribute-grid">
          <div class="attribute-card"><span>HP</span><strong>{{ characterStore.current.data.resources.hp.current }} / {{ savedDerived.maxHp }}</strong></div>
          <div class="attribute-card"><span>MP</span><strong>{{ characterStore.current.data.resources.mp.current }}（起始 {{ savedDerived.initialMp }}）</strong></div>
          <div class="attribute-card"><span>SAN</span><strong>{{ characterStore.current.data.resources.san.current }}</strong></div>
          <div class="attribute-card"><span>MOV</span><strong>{{ savedDerived.movement.status === 'value' ? savedDerived.movement.value : '需 KP 裁定' }}</strong></div>
          <div class="attribute-card"><span>DB</span><strong>{{ formatDamageBonus(savedDerived.damageBonus) }}</strong></div>
          <div class="attribute-card"><span>Build</span><strong>{{ savedDerived.build }}</strong></div>
        </div>
        <button class="button" type="button" @click="creationStore.setCurrentStep('attributes')">返回修改属性</button>
      </section>

      <section v-else class="panel"><h2>检查（尚未实现）</h2></section>
    </template>
    <p v-else>正在读取本地数据……</p>
  </section>
</template>
