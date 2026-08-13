<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { isOccupationAvailableInEra, isSkillAvailableInEra } from "../../coc7/rules/availability";
import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import { getSkillRefKey } from "../../coc7/rules/skills";
import type { EraId, OccupationRequirement } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  formatOccupationEraId,
  formatOccupationRequirement,
  formatSkillRefForOccupation,
} from "../../creation/presentation/occupationPresentation";
import {
  getDeterministicRequirementSelection,
  listRequirementCandidates,
  requirementHasCustomSpecializationPath,
} from "../../creation/rules/requirementSelection";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly eraId: EraId | undefined }>();
const creationStore = useCreationStore();
const errorMessage = ref("");
const searchQueries = ref<Record<string, string>>({});

const session = computed(() => creationStore.current?.data);
const occupation = computed(() => session.value?.occupation?.definitionSnapshot);
const skillState = computed(() => session.value?.skills);
const skills = computed(() => getSkillRegistry(session.value?.settingId ?? "standard"));
const eraContextMissing = computed(() => props.eraId === undefined);
const occupationEraCompatible = computed(() =>
  occupation.value !== undefined && props.eraId !== undefined &&
  isOccupationAvailableInEra(occupation.value, props.eraId),
);
const currentRequirementIds = computed(() => new Set(
  occupation.value?.skillRequirements.map((requirement) => requirement.id) ?? [],
));
const requirementCandidates = computed(() => new Map(
  (occupation.value?.skillRequirements ?? []).map((requirement) => [
    requirement.id,
    props.eraId === undefined
      ? []
      : listRequirementCandidates(requirement, skills.value.definitions, props.eraId),
  ]),
));
const completedRequirementCount = computed(() =>
  (occupation.value?.skillRequirements ?? []).filter((requirement) =>
    requirementStatus(requirement) === "complete",
  ).length,
);

function selectionFor(requirementId: string): readonly SkillRef[] {
  return skillState.value?.requirementSelections
    .find((selection) => selection.requirementId === requirementId)?.refs ?? [];
}

function isSelected(requirementId: string, ref: SkillRef): boolean {
  const key = getSkillRefKey(ref);
  return selectionFor(requirementId).some((selected) => getSkillRefKey(selected) === key);
}

function usedByOtherCurrentRequirement(requirementId: string, ref: SkillRef): boolean {
  const key = getSkillRefKey(ref);
  return (skillState.value?.requirementSelections ?? []).some((selection) =>
    selection.requirementId !== requirementId &&
    currentRequirementIds.value.has(selection.requirementId) &&
    selection.refs.some((selected) => getSkillRefKey(selected) === key),
  );
}

function hasCrossRequirementDuplicate(requirement: OccupationRequirement): boolean {
  return selectionFor(requirement.id).some((ref) => usedByOtherCurrentRequirement(requirement.id, ref));
}

function hasEraConflict(requirement: OccupationRequirement): boolean {
  if (!props.eraId) return false;
  return selectionFor(requirement.id).some((ref) => {
    const definition = skills.value.get(ref.definitionId);
    return definition !== undefined && !isSkillAvailableInEra(definition, props.eraId!);
  });
}

function requirementStatus(requirement: OccupationRequirement): "complete" | "incomplete" | "invalid" {
  const refs = selectionFor(requirement.id);
  const issues = validateOccupationRequirementSelection(requirement, refs);
  if (issues.length === 0 && !hasCrossRequirementDuplicate(requirement) && !hasEraConflict(requirement)) {
    return "complete";
  }
  return refs.length === 0 ? "incomplete" : "invalid";
}

function statusLabel(requirement: OccupationRequirement): string {
  switch (requirementStatus(requirement)) {
    case "complete": return "完成";
    case "incomplete": return "未完成";
    case "invalid": return "当前组合非法";
  }
}

function formatRef(ref: SkillRef): string {
  const definition = skills.value.get(ref.definitionId);
  if (!definition) return ref.type === "custom" ? `未知技能（${ref.displayName}）` : "未知技能";
  if (ref.type === "predefined" &&
    !skills.value.resolvePredefined(ref.definitionId, ref.specializationId)) {
    return `${definition.name.zh}（未知专业化）`;
  }
  return formatSkillRefForOccupation(ref, skills.value);
}

function candidateSearchText(ref: SkillRef): string {
  const definition = skills.value.get(ref.definitionId);
  if (!definition) return "";
  const specialization = ref.type === "predefined"
    ? skills.value.resolvePredefined(ref.definitionId, ref.specializationId)
    : undefined;
  return [
    definition.name.zh,
    definition.name.en,
    ...(definition.aliases?.zh ?? []),
    ...(definition.aliases?.en ?? []),
    specialization?.name.zh,
    specialization?.name.en,
    ...(specialization?.aliases?.zh ?? []),
    ...(specialization?.aliases?.en ?? []),
  ].filter((value): value is string => Boolean(value)).join(" ").toLocaleLowerCase();
}

function filteredCandidates(requirement: OccupationRequirement): readonly SkillRef[] {
  const candidates = requirementCandidates.value.get(requirement.id) ?? [];
  const query = searchQueries.value[requirement.id]?.trim().toLocaleLowerCase();
  return query ? candidates.filter((ref) => candidateSearchText(ref).includes(query)) : candidates;
}

function isCandidateDisabled(requirement: OccupationRequirement, ref: SkillRef): boolean {
  if (isSelected(requirement.id, ref)) return false;
  if (usedByOtherCurrentRequirement(requirement.id, ref)) return true;
  const maximum = requirement.cardinality.max;
  return maximum !== undefined && maximum > 1 && selectionFor(requirement.id).length >= maximum;
}

function candidateDisabledReason(requirement: OccupationRequirement, ref: SkillRef): string | undefined {
  if (isSelected(requirement.id, ref)) return undefined;
  if (usedByOtherCurrentRequirement(requirement.id, ref)) return "已用于其他职业技能需求";
  const maximum = requirement.cardinality.max;
  return maximum !== undefined && maximum > 1 && selectionFor(requirement.id).length >= maximum
    ? "已达到选择上限"
    : undefined;
}

function canRemoveSelected(requirement: OccupationRequirement, ref: SkillRef): boolean {
  const deterministic = getDeterministicRequirementSelection(requirement);
  return deterministic === undefined || getSkillRefKey(deterministic) !== getSkillRefKey(ref);
}

async function setSelection(requirementId: string, refs: readonly SkillRef[]): Promise<void> {
  try {
    await creationStore.setRequirementSelection(requirementId, refs);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存职业技能需求失败。";
  }
}

async function toggleCandidate(requirement: OccupationRequirement, ref: SkillRef): Promise<void> {
  if (isCandidateDisabled(requirement, ref)) return;
  const selected = selectionFor(requirement.id);
  const key = getSkillRefKey(ref);
  if (selected.some((candidate) => getSkillRefKey(candidate) === key)) {
    await setSelection(requirement.id, selected.filter((candidate) => getSkillRefKey(candidate) !== key));
    return;
  }
  await setSelection(
    requirement.id,
    requirement.cardinality.max === 1 ? [ref] : [...selected, ref],
  );
}

async function removeSelected(requirement: OccupationRequirement, ref: SkillRef): Promise<void> {
  const key = getSkillRefKey(ref);
  await setSelection(
    requirement.id,
    selectionFor(requirement.id).filter((candidate) => getSkillRefKey(candidate) !== key),
  );
}

onMounted(async () => {
  if (!occupation.value || !skillState.value || !occupationEraCompatible.value) return;
  try {
    await creationStore.ensureDeterministicRequirementSelections();
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "自动补齐固定技能失败。";
  }
});
</script>

<template>
  <section class="skill-requirement-step page-stack">
    <header class="panel form-stack compact-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">第 4 步</p>
          <h2>职业技能需求</h2>
        </div>
        <button class="button" type="button" @click="creationStore.setCurrentStep('occupation')">
          返回职业
        </button>
      </div>
      <p>当前职业：<strong>{{ occupation?.name.zh ?? "尚未选择" }}</strong></p>
      <p v-if="occupation && occupationEraCompatible" class="muted">
        职业技能需求选择进度：{{ completedRequirementCount }} / {{ occupation.skillRequirements.length }}
      </p>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    </header>

    <section v-if="!occupation || !skillState" class="panel form-stack">
      <p class="warning-message" role="alert">尚未选择职业，无法进行职业技能需求选择。</p>
      <button class="button" type="button" @click="creationStore.setCurrentStep('occupation')">返回职业</button>
    </section>

    <section v-else-if="eraContextMissing" class="panel form-stack">
      <p class="warning-message" role="alert">缺少建卡时代，无法列出适用技能。</p>
      <button class="button" type="button" @click="creationStore.setCurrentStep('basic-info')">返回基本信息</button>
    </section>

    <section v-else-if="!occupationEraCompatible" class="panel form-stack">
      <p class="warning-message" role="alert">
        当前职业不适用于{{ formatOccupationEraId(eraId!) }}，请先更换职业或建卡时代。
      </p>
      <div class="actions">
        <button class="button" type="button" @click="creationStore.setCurrentStep('occupation')">返回职业</button>
        <button class="button" type="button" @click="creationStore.setCurrentStep('basic-info')">返回基本信息</button>
      </div>
    </section>

    <template v-else>
      <article
        v-for="requirement in occupation.skillRequirements"
        :key="requirement.id"
        class="panel requirement-card"
      >
        <header class="requirement-heading">
          <h3>{{ formatOccupationRequirement(requirement, skills) }}</h3>
          <span class="requirement-status" :class="requirementStatus(requirement)">
            {{ statusLabel(requirement) }}
          </span>
        </header>

        <p v-if="getDeterministicRequirementSelection(requirement)" class="fixed-requirement">
          固定：{{ formatRef(getDeterministicRequirementSelection(requirement)!) }}
        </p>

        <div v-if="selectionFor(requirement.id).length > 0" class="selected-requirement-skills">
          <strong>当前已选</strong>
          <ul>
            <li v-for="ref in selectionFor(requirement.id)" :key="getSkillRefKey(ref)">
              <span>{{ formatRef(ref) }}</span>
              <small v-if="usedByOtherCurrentRequirement(requirement.id, ref)" class="warning-message">
                已用于其他职业技能需求
              </small>
              <small v-if="eraId && skills.get(ref.definitionId) && !isSkillAvailableInEra(skills.get(ref.definitionId)!, eraId)" class="warning-message">
                不适用于当前建卡时代
              </small>
              <button
                v-if="canRemoveSelected(requirement, ref)"
                class="button compact-button"
                type="button"
                @click="removeSelected(requirement, ref)"
              >移除</button>
            </li>
          </ul>
        </div>

        <template v-if="!getDeterministicRequirementSelection(requirement)">
          <label v-if="requirement.selector.type === 'any-skill'" class="field requirement-search">
            <span>在此需求内搜索技能</span>
            <input
              v-model="searchQueries[requirement.id]"
              type="search"
              placeholder="搜索中文名、英文名或别名"
            />
          </label>

          <div v-if="filteredCandidates(requirement).length > 0" class="requirement-candidates">
            <label
              v-for="ref in filteredCandidates(requirement)"
              :key="getSkillRefKey(ref)"
              class="requirement-candidate"
              :class="{ disabled: isCandidateDisabled(requirement, ref) }"
            >
              <input
                type="checkbox"
                :checked="isSelected(requirement.id, ref)"
                :disabled="isCandidateDisabled(requirement, ref)"
                @change="toggleCandidate(requirement, ref)"
              />
              <span>{{ formatRef(ref) }}</span>
              <small v-if="candidateDisabledReason(requirement, ref)">
                {{ candidateDisabledReason(requirement, ref) }}
              </small>
            </label>
          </div>
          <p v-else-if="(requirementCandidates.get(requirement.id)?.length ?? 0) > 0" class="empty-state">
            没有符合当前搜索的技能。
          </p>
          <p
            v-else-if="requirementHasCustomSpecializationPath(requirement, skills.definitions)"
            class="warning-message"
          >
            此需求还需要创建自定义专业化，当前阶段尚未接入。
          </p>
          <p v-else class="warning-message">当前时代没有可用的目录技能。</p>

          <p
            v-if="(requirementCandidates.get(requirement.id)?.length ?? 0) > 0 && requirementHasCustomSpecializationPath(requirement, skills.definitions)"
            class="muted"
          >
            还可以使用自定义专业化；将在 Phase 5C-2B 接入。
          </p>
        </template>

        <p v-if="requirement.guidance" class="requirement-guidance">
          <strong>选择说明：</strong>{{ requirement.guidance.zh }}
        </p>
        <p v-if="requirement.keeperReview" class="warning-message">
          此需求需要 KP 确认。
        </p>
        <p v-if="requirementStatus(requirement) === 'invalid'" class="warning-message" role="status">
          当前组合不符合职业要求；草稿已保留，你可以继续调整。
        </p>
      </article>

      <footer class="panel requirement-actions">
        <div>
          <strong>职业技能需求选择进度：{{ completedRequirementCount }} / {{ occupation.skillRequirements.length }}</strong>
          <p class="muted">本阶段只保存需求选择；职业与兴趣点分配尚未开始。</p>
        </div>
        <button class="button" type="button" @click="creationStore.setCurrentStep('occupation')">返回职业</button>
      </footer>
    </template>
  </section>
</template>
