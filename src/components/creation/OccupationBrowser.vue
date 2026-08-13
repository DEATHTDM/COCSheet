<script setup lang="ts">
import { computed, ref } from "vue";

import type {
  EraId,
  OccupationCategoryId,
  OccupationDefinition,
} from "../../coc7/types/occupation";
import { isOccupationAvailableInEra } from "../../coc7/rules/availability";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  formatOccupationCategory,
  formatOccupationEra,
  formatOccupationEraId,
  formatOccupationPointFormula,
  formatOccupationRequirement,
  formatSkillSelectorForOccupation,
  getAvailableOccupationCategories,
  getAvailableOccupationTags,
  getOccupationPresetPolicyStatus,
  sortOccupationsForDisplay,
  type OccupationPresetPolicyStatus,
} from "../../creation/presentation/occupationPresentation";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly eraId: EraId | undefined }>();
const creationStore = useCreationStore();
const query = ref("");
const category = ref<OccupationCategoryId | "">("");
const era = ref<EraId | "">(props.eraId ?? "");
const tag = ref("");
const errorMessage = ref("");
const selectionMessage = ref("");

const session = computed(() => creationStore.current?.data);
const registry = computed(() => getOccupationRegistry(session.value?.settingId ?? "standard"));
const skills = computed(() => getSkillRegistry(session.value?.settingId ?? "standard"));
const settingPack = computed(() => getSettingPackOrThrow(session.value?.settingId ?? "standard"));
const currentSelection = computed(() => session.value?.occupation);
const selectedCatalogId = computed(() =>
  currentSelection.value?.kind === "catalog"
    ? currentSelection.value.selectedOccupationId
    : undefined,
);
const initialDisplayOccupations = sortOccupationsForDisplay(registry.value.definitions);
const previewOccupationId = ref(
  selectedCatalogId.value ?? initialDisplayOccupations[0]?.id ?? "",
);

const availableCategories = computed(() =>
  getAvailableOccupationCategories(registry.value.definitions),
);
const availableTags = computed(() => getAvailableOccupationTags(registry.value.definitions));
const availableEras = computed(() => settingPack.value.eras ?? []);
const eraContextMissing = computed(() => availableEras.value.length > 0 && !props.eraId);
const results = computed(() => sortOccupationsForDisplay(registry.value.search(query.value.trim(), {
  ...(category.value ? { category: category.value } : {}),
  ...(era.value ? { era: era.value } : {}),
  ...(tag.value ? { tag: tag.value } : {}),
})));
const previewOccupation = computed<OccupationDefinition | undefined>(() => {
  const fromRegistry = registry.value.get(previewOccupationId.value);
  if (fromRegistry) return fromRegistry;
  const selection = currentSelection.value;
  return selection?.kind === "catalog" && selection.selectedOccupationId === previewOccupationId.value
    ? selection.definitionSnapshot
    : undefined;
});
const selectedOccupationName = computed(() => currentSelection.value?.definitionSnapshot.name.zh);
const selectedCatalogIsBanned = computed(() => {
  const selection = currentSelection.value;
  return selection?.kind === "catalog" && getOccupationPresetPolicyStatus(
    selection.selectedOccupationId,
    session.value?.presetSnapshot,
  ) === "banned";
});
const currentSelectionEraCompatible = computed(() => {
  const selection = currentSelection.value;
  if (!selection) return true;
  if (availableEras.value.length === 0) return true;
  return props.eraId !== undefined && isOccupationAvailableInEra(selection.definitionSnapshot, props.eraId);
});
const canContinue = computed(() =>
  Boolean(currentSelection.value) &&
  !eraContextMissing.value &&
  !selectedCatalogIsBanned.value &&
  currentSelectionEraCompatible.value,
);
const continueReason = computed(() => {
  if (eraContextMissing.value) return "请先返回基本信息选择建卡时代。";
  if (!currentSelection.value) return "请先选择一个职业。";
  if (selectedCatalogIsBanned.value) return "当前已选职业被此 KP 预设禁用，请先更换职业。";
  if (!currentSelectionEraCompatible.value && props.eraId) {
    return `当前职业不适用于${formatOccupationEraId(props.eraId)}`;
  }
  return "";
});

function policyStatus(occupation: OccupationDefinition): OccupationPresetPolicyStatus {
  return getOccupationPresetPolicyStatus(occupation.id, session.value?.presetSnapshot);
}

function eraCompatible(occupation: OccupationDefinition): boolean {
  return availableEras.value.length === 0 ||
    (props.eraId !== undefined && isOccupationAvailableInEra(occupation, props.eraId));
}

function canSelectOccupation(occupation: OccupationDefinition): boolean {
  return !eraContextMissing.value &&
    eraCompatible(occupation) &&
    policyStatus(occupation) !== "banned";
}

function preview(occupationId: string): void {
  previewOccupationId.value = occupationId;
  selectionMessage.value = "";
}

async function selectOccupation(occupation: OccupationDefinition): Promise<void> {
  if (!canSelectOccupation(occupation)) return;
  const selection = currentSelection.value;
  if (selection?.kind === "catalog" && selection.selectedOccupationId === occupation.id) return;
  if (selection && !window.confirm(
    "更换职业会保留现有技能草稿；与新职业不匹配的选择将在技能步骤中标记为过期或冲突。是否继续？",
  )) return;

  try {
    await creationStore.selectCatalogOccupation(occupation.id);
    errorMessage.value = "";
    selectionMessage.value = `已选择职业：${occupation.name.zh}`;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "选择职业失败。";
  }
}

async function goToSkills(): Promise<void> {
  if (!canContinue.value) return;
  try {
    await creationStore.setCurrentStep("skills");
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "进入技能步骤失败。";
  }
}
</script>

<template>
  <section class="occupation-browser page-stack">
    <header class="panel form-stack compact-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">职业目录</p>
          <h2>选择职业</h2>
        </div>
        <button
          class="button"
          type="button"
          @click="creationStore.setCurrentStep(eraContextMissing ? 'basic-info' : 'attributes')"
        >
          {{ eraContextMissing ? "返回基本信息" : "返回修改属性" }}
        </button>
      </div>
      <p>可以按名称、分类和适用时代浏览职业；选择职业后下一步再完成具体技能选择与点数分配。</p>
      <p v-if="eraContextMissing" class="warning-message" role="alert">
        请先返回基本信息选择建卡时代。
      </p>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <p v-if="selectionMessage" class="success-message" role="status">{{ selectionMessage }}</p>
    </header>

    <aside v-if="currentSelection" class="panel current-occupation-panel">
      <div>
        <p class="eyebrow">当前选择</p>
        <strong v-if="currentSelection.kind === 'custom'">
          当前已选择自定义职业：{{ currentSelection.definitionSnapshot.name.zh }}
        </strong>
        <strong v-else>当前已选择职业：{{ currentSelection.definitionSnapshot.name.zh }}</strong>
      </div>
      <button
        v-if="currentSelection.kind === 'catalog' && previewOccupationId !== currentSelection.selectedOccupationId"
        class="button"
        type="button"
        @click="preview(currentSelection.selectedOccupationId)"
      >
        查看当前职业
      </button>
      <p v-if="!currentSelectionEraCompatible && props.eraId" class="warning-message" role="alert">
        当前职业不适用于{{ formatOccupationEraId(props.eraId) }}
      </p>
    </aside>

    <section class="panel occupation-filter-bar" aria-label="职业浏览筛选">
      <label class="field occupation-search-field">
        <span>搜索职业</span>
        <input v-model="query" type="search" placeholder="搜索职业中文名、英文名或别名" />
      </label>
      <label class="field">
        <span>职业分类</span>
        <select v-model="category">
          <option value="">全部分类</option>
          <option v-for="categoryId in availableCategories" :key="categoryId" :value="categoryId">
            {{ formatOccupationCategory(categoryId) }}
          </option>
        </select>
      </label>
      <label class="field">
        <span>适用时代筛选</span>
        <select v-model="era">
          <option value="">全部时代</option>
          <option v-for="eraId in availableEras" :key="eraId" :value="eraId">
            {{ formatOccupationEraId(eraId) }}
          </option>
        </select>
      </label>
      <label v-if="availableTags.length > 0" class="field">
        <span>职业标签</span>
        <select v-model="tag">
          <option value="">全部标签</option>
          <option v-for="availableTag in availableTags" :key="availableTag" :value="availableTag">
            {{ availableTag }}
          </option>
        </select>
      </label>
    </section>

    <p class="occupation-result-count" aria-live="polite">找到 {{ results.length }} 个职业。</p>

    <div class="occupation-layout">
      <section aria-label="职业搜索结果">
        <ul v-if="results.length > 0" class="occupation-list">
          <li v-for="occupation in results" :key="occupation.id">
            <button
              class="occupation-card"
              :class="{ previewed: previewOccupation?.id === occupation.id }"
              type="button"
              :aria-current="previewOccupation?.id === occupation.id ? 'true' : undefined"
              @click="preview(occupation.id)"
            >
              <span class="occupation-card-heading">
                <span><strong>{{ occupation.name.zh }}</strong><small>{{ occupation.name.en }}</small></span>
                <span class="occupation-badges">
                  <span v-if="selectedCatalogId === occupation.id" class="occupation-badge selected">已选择</span>
                  <span v-if="occupation.variantOf" class="occupation-badge">职业变体</span>
                  <span v-if="policyStatus(occupation) === 'banned'" class="occupation-badge banned">当前 KP 预设禁用</span>
                  <span v-else-if="policyStatus(occupation) === 'keeper-approval-required'" class="occupation-badge approval">需要 KP 批准</span>
                  <span v-if="occupation.approval" class="occupation-badge approval">职业需 KP 批准</span>
                  <span v-if="props.eraId && !eraCompatible(occupation)" class="occupation-badge banned">
                    不适用于当前建卡时代
                  </span>
                </span>
              </span>
              <span class="occupation-card-meta">
                <span>{{ formatOccupationCategory(occupation.category) }}</span>
                <span>信用评级 {{ occupation.creditRating.min }}～{{ occupation.creditRating.max }}</span>
                <span>{{ formatOccupationPointFormula(occupation.pointFormula) }}</span>
                <span>{{ formatOccupationEra(occupation.era) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="empty-state">没有符合当前搜索与筛选条件的职业。</p>
      </section>

      <article v-if="previewOccupation" class="panel occupation-detail">
        <header class="occupation-detail-heading">
          <div>
            <p class="eyebrow">职业详情</p>
            <h2>{{ previewOccupation.name.zh }}</h2>
            <p class="muted">{{ previewOccupation.name.en }}</p>
          </div>
          <div class="occupation-badges">
            <span v-if="selectedCatalogId === previewOccupation.id" class="occupation-badge selected">当前职业</span>
            <span v-if="previewOccupation.variantOf" class="occupation-badge">职业变体</span>
            <span v-if="policyStatus(previewOccupation) === 'banned'" class="occupation-badge banned">当前 KP 预设禁用</span>
            <span v-else-if="policyStatus(previewOccupation) === 'keeper-approval-required'" class="occupation-badge approval">需要 KP 批准</span>
            <span v-if="previewOccupation.approval" class="occupation-badge approval">该职业需要 KP 批准</span>
            <span v-if="props.eraId && !eraCompatible(previewOccupation)" class="occupation-badge banned">
              不适用于当前建卡时代
            </span>
          </div>
        </header>

        <p v-if="previewOccupation.summary">{{ previewOccupation.summary.zh }}</p>
        <dl class="occupation-facts">
          <div><dt>分类</dt><dd>{{ formatOccupationCategory(previewOccupation.category) }}</dd></div>
          <div><dt>适用时代</dt><dd>{{ formatOccupationEra(previewOccupation.era) }}</dd></div>
          <div><dt>信用评级</dt><dd>{{ previewOccupation.creditRating.min }}～{{ previewOccupation.creditRating.max }}</dd></div>
          <div><dt>职业技能点</dt><dd>{{ formatOccupationPointFormula(previewOccupation.pointFormula) }}</dd></div>
        </dl>

        <section v-if="previewOccupation.tags?.length">
          <h3>标签</h3>
          <div class="occupation-badges">
            <span v-for="occupationTag in previewOccupation.tags" :key="occupationTag" class="occupation-badge">
              {{ occupationTag }}
            </span>
          </div>
        </section>

        <section>
          <h3>职业技能需求</h3>
          <ol class="occupation-requirements">
            <li v-for="requirement in previewOccupation.skillRequirements" :key="requirement.id">
              {{ formatOccupationRequirement(requirement, skills) }}
            </li>
          </ol>
        </section>

        <aside v-if="previewOccupation.skillReplacement" class="occupation-special-rule">
          <strong>特殊职业规则</strong>
          <p>
            经 KP 批准，可用【{{ formatSkillSelectorForOccupation(previewOccupation.skillReplacement.replacement, skills) }}】替换其中一项指定职业技能。
          </p>
        </aside>

        <section v-if="previewOccupation.recommendedContacts?.length">
          <h3>推荐联系人</h3>
          <ul><li v-for="contact in previewOccupation.recommendedContacts" :key="contact">{{ contact }}</li></ul>
        </section>

        <section>
          <h3>来源</h3>
          <ul class="occupation-sources">
            <li v-for="source in previewOccupation.sourceRefs" :key="`${source.sourceId}:${source.page ?? ''}`">
              <span>{{ source.title }}<template v-if="source.page"> p.{{ source.page }}</template></span>
              <small v-if="source.note">{{ source.note }}</small>
            </li>
          </ul>
        </section>

        <p v-if="previewOccupation.approval?.guidance" class="warning-message">
          {{ previewOccupation.approval.guidance.zh }}
        </p>
        <p v-if="policyStatus(previewOccupation) === 'banned'" class="warning-message">
          此职业仍可查看，但当前 KP 预设不允许选择。
        </p>
        <p v-if="props.eraId && !eraCompatible(previewOccupation)" class="warning-message">
          此职业仍可查看，但不适用于当前建卡时代。
        </p>
        <button
          class="button primary"
          type="button"
          :disabled="!canSelectOccupation(previewOccupation) || selectedCatalogId === previewOccupation.id"
          @click="selectOccupation(previewOccupation)"
        >
          {{ selectedCatalogId === previewOccupation.id ? "已选择此职业" : "选择此职业" }}
        </button>
      </article>
      <aside v-else class="panel empty-state">请选择一个职业查看详情。</aside>
    </div>

    <footer class="panel occupation-actions">
      <div>
        <strong>{{ selectedOccupationName ? `当前职业：${selectedOccupationName}` : "尚未选择职业" }}</strong>
        <p v-if="continueReason" class="warning-message">{{ continueReason }}</p>
        <p v-else class="muted">下一步将进入技能流程；本阶段尚未接入需求选择与点数分配。</p>
      </div>
      <button class="button primary" type="button" :disabled="!canContinue" @click="goToSkills">
        继续：技能
      </button>
    </footer>
  </section>
</template>
