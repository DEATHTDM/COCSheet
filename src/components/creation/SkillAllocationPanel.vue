<script setup lang="ts">
import { computed, ref } from "vue";

import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import {
  calculateSkillBaseValue,
  getSkillBaseValueRule,
  getSkillRefKey,
} from "../../coc7/rules/skills";
import type { Character } from "../../coc7/types/character";
import type { SkillDefinition, SkillRef } from "../../coc7/types/skill";
import { getSkillRegistry } from "../../content/skillRegistry";
import { formatSkillRefForOccupation } from "../../creation/presentation/occupationPresentation";
import { listConcreteSkillRefs } from "../../creation/rules/requirementSelection";
import { listOccupationAllocationRefs } from "../../creation/rules/skillAllocationPresentation";
import { useCreationStore } from "../../creation/stores/creationStore";
import type { SkillAllocation } from "../../creation/types/skillCreation";

const props = defineProps<{ readonly character: Character }>();
const creationStore = useCreationStore();
const errorMessage = ref("");
const interestSearch = ref("");
const interestDraftPoints = ref<Record<string, number>>({});
const customParentId = ref("");
const customDisplayName = ref("");
const customInterestPoints = ref(1);

const session = computed(() => creationStore.current?.data);
const occupation = computed(() => session.value?.occupation?.definitionSnapshot);
const skillState = computed(() => session.value?.skills);
const skills = computed(() => getSkillRegistry(session.value?.settingId ?? "standard"));
const occupationRefs = computed(() =>
  occupation.value && skillState.value
    ? listOccupationAllocationRefs(occupation.value, skillState.value)
    : [],
);
const occupationKeys = computed(() => new Set(occupationRefs.value.map(getSkillRefKey)));
const allocationMap = computed(() => new Map(
  (skillState.value?.allocations ?? []).map((allocation) => [
    getSkillRefKey(allocation.ref),
    allocation,
  ]),
));
const rows = computed(() => {
  const refs = new Map<string, { readonly ref: SkillRef; readonly occupation: boolean }>();
  for (const ref of occupationRefs.value) {
    refs.set(getSkillRefKey(ref), { ref, occupation: true });
  }
  for (const allocation of skillState.value?.allocations ?? []) {
    const key = getSkillRefKey(allocation.ref);
    if (!refs.has(key)) refs.set(key, { ref: allocation.ref, occupation: false });
  }
  return [...refs.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([, row]) => row);
});
const preview = computed(() => {
  try {
    return { plan: creationStore.getSkillFinalizePlan(props.character) } as const;
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "无法生成技能分配预览。",
    } as const;
  }
});
const plan = computed(() => "plan" in preview.value ? preview.value.plan : undefined);
const previewError = computed(() => "error" in preview.value ? preview.value.error : undefined);
const occupationSpent = computed(() =>
  plan.value ? plan.value.occupationBudget - plan.value.remainingOccupationPoints : 0,
);
const interestSpent = computed(() =>
  plan.value ? plan.value.interestBudget - plan.value.remainingInterestPoints : 0,
);
const budgetIssues = computed(() => plan.value?.errors.filter(({ code }) =>
  code === "occupation-budget-exceeded" || code === "interest-budget-exceeded",
) ?? []);
const generalIssues = computed(() => plan.value?.errors.filter((issue) =>
  issue.refKey === undefined &&
  issue.code !== "occupation-budget-exceeded" &&
  issue.code !== "interest-budget-exceeded",
) ?? []);
const nonRowApprovals = computed(() => plan.value?.approvals.filter((approval) =>
  !approval.subjectId?.startsWith("skill:"),
) ?? []);

function allocationFor(ref: SkillRef): SkillAllocation {
  return allocationMap.value.get(getSkillRefKey(ref)) ?? {
    ref,
    occupationPoints: 0,
    interestPoints: 0,
  };
}

function definitionFor(ref: SkillRef): SkillDefinition | undefined {
  return skills.value.get(ref.definitionId);
}

function formatRef(ref: SkillRef): string {
  try {
    return formatSkillRefForOccupation(ref, skills.value);
  } catch {
    return ref.type === "custom"
      ? `未知技能（${ref.displayName}）`
      : `未知技能（${getSkillRefKey(ref)}）`;
  }
}

function baseValue(ref: SkillRef): number | undefined {
  const definition = definitionFor(ref);
  if (!definition || !props.character.characteristics) return undefined;
  try {
    return calculateSkillBaseValue(
      getSkillBaseValueRule(definition, ref),
      props.character.characteristics,
    );
  } catch {
    return undefined;
  }
}

function finalValue(ref: SkillRef): number | undefined {
  const key = getSkillRefKey(ref);
  const finalized = plan.value?.skills.find((skill) => getSkillRefKey(skill.ref) === key);
  if (finalized) return finalized.currentValue;
  const base = baseValue(ref);
  const allocation = allocationFor(ref);
  return base === undefined
    ? undefined
    : base + allocation.occupationPoints + allocation.interestPoints;
}

function rowIssues(ref: SkillRef) {
  const key = getSkillRefKey(ref);
  return plan.value?.errors.filter((issue) => issue.refKey === key) ?? [];
}

function hasApproval(ref: SkillRef, reason: string): boolean {
  const key = getSkillRefKey(ref);
  return plan.value?.approvals.some((approval) =>
    approval.reason === reason && approval.subjectId === key,
  ) ?? false;
}

function creationPolicyMessage(ref: SkillRef): string | undefined {
  const definition = definitionFor(ref);
  if (!definition) return undefined;
  if (definition.creationPointPolicy === "forbidden") {
    return "不允许使用创建期技能点";
  }
  if (definition.creationPointPolicy === "keeper-approval") {
    return "需要 KP 批准";
  }
  return undefined;
}

async function updateAllocation(
  ref: SkillRef,
  field: "occupationPoints" | "interestPoints",
  event: Event,
): Promise<void> {
  const value = Number((event.target as HTMLInputElement).value || 0);
  if (!Number.isInteger(value) || value < 0) {
    errorMessage.value = "技能点必须是非负整数。";
    return;
  }
  try {
    await creationStore.setSkillAllocationPoint(ref, field, value);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存技能分配失败。";
  }
}

async function removeInterestSkill(ref: SkillRef): Promise<void> {
  try {
    await creationStore.removeSkillAllocation(ref);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "移除兴趣技能失败。";
  }
}

function candidateSearchText(ref: SkillRef): string {
  const definition = definitionFor(ref);
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

const interestCandidates = computed(() => {
  if (!props.character.eraId) return [];
  const query = interestSearch.value.trim().toLocaleLowerCase();
  return listConcreteSkillRefs(skills.value.definitions, props.character.eraId)
    .filter((ref) => {
      const key = getSkillRefKey(ref);
      return !occupationKeys.value.has(key) && !allocationMap.value.has(key);
    })
    .filter((ref) => !query || candidateSearchText(ref).includes(query));
});

function interestPointsFor(ref: SkillRef): number {
  return interestDraftPoints.value[getSkillRefKey(ref)] ?? 1;
}

function setInterestDraftPoints(ref: SkillRef, event: Event): void {
  interestDraftPoints.value[getSkillRefKey(ref)] = Number(
    (event.target as HTMLInputElement).value,
  );
}

async function addInterestSkill(ref: SkillRef): Promise<void> {
  const points = interestPointsFor(ref);
  if (!Number.isInteger(points) || points <= 0) {
    errorMessage.value = "添加兴趣技能时，兴趣点必须是正整数。";
    return;
  }
  try {
    await creationStore.setSkillAllocation(ref, 0, points);
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "添加兴趣技能失败。";
  }
}

const customParents = computed(() => skills.value.definitions
  .filter((definition) =>
    definition.specialization.type === "required" &&
    definition.specialization.allowCustom &&
    definition.id !== "fighting" &&
    definition.id !== "firearms",
  )
  .filter((definition) =>
    props.character.eraId !== undefined &&
    isSkillAvailableInEra(definition, props.character.eraId),
  )
  .sort((left, right) => left.name.zh.localeCompare(right.name.zh, "zh-CN")));

const selectedCustomParent = computed(() => {
  const selected = customParents.value.find(({ id }) => id === customParentId.value);
  return selected ?? customParents.value[0];
});

function customSingleInstanceConflict(definition: SkillDefinition | undefined): boolean {
  return Boolean(definition?.specialization.type === "required" &&
    !definition.specialization.allowMultiple &&
    rows.value.some(({ ref }) => ref.definitionId === definition.id));
}

async function createCustomInterest(): Promise<void> {
  const definition = selectedCustomParent.value;
  if (!definition) return;
  try {
    await creationStore.createCustomInterestAllocation(
      definition.id,
      customDisplayName.value,
      customInterestPoints.value,
    );
    customDisplayName.value = "";
    customInterestPoints.value = 1;
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "创建兴趣专业化失败。";
  }
}
</script>

<template>
  <section class="skill-allocation-workspace page-stack">
    <header class="panel form-stack compact-stack">
      <div>
        <p class="eyebrow">Phase 5C-3A</p>
        <h2>技能点分配</h2>
      </div>
      <div v-if="plan" class="budget-grid">
        <div class="budget-card" :class="{ exceeded: plan.remainingOccupationPoints < 0 }">
          <span>职业技能点</span>
          <strong>已用 {{ occupationSpent }} / 总计 {{ plan.occupationBudget }} / 剩余 {{ plan.remainingOccupationPoints }}</strong>
        </div>
        <div class="budget-card" :class="{ exceeded: plan.remainingInterestPoints < 0 }">
          <span>兴趣技能点</span>
          <strong>已用 {{ interestSpent }} / 总计 {{ plan.interestBudget }} / 剩余 {{ plan.remainingInterestPoints }}</strong>
        </div>
      </div>
      <p v-if="previewError" class="error-message" role="alert">{{ previewError }}</p>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <ul v-if="budgetIssues.length" class="validation-list allocation-issue-list">
        <li v-for="issue in budgetIssues" :key="issue.code">{{ issue.message }}</li>
      </ul>
      <ul v-if="generalIssues.length" class="validation-list allocation-issue-list">
        <li v-for="(issue, index) in generalIssues" :key="`${issue.code}:${index}`">
          {{ issue.message }}
        </li>
      </ul>
      <ul v-if="plan?.warnings.length" class="allocation-warning-list">
        <li v-for="warning in plan.warnings" :key="warning.code">{{ warning.message }}</li>
      </ul>
      <ul v-if="nonRowApprovals.length" class="allocation-approval-list">
        <li v-for="(approval, index) in nonRowApprovals" :key="`${approval.reason}:${index}`">
          {{ approval.message }}（将在后续批准步骤处理）
        </li>
      </ul>
    </header>

    <section class="panel form-stack">
      <div>
        <p class="eyebrow">实时预览</p>
        <h3>当前技能分配</h3>
      </div>
      <div class="allocation-table-wrap">
        <table class="allocation-table">
          <thead>
            <tr>
              <th>技能</th>
              <th>基础值</th>
              <th>职业点</th>
              <th>兴趣点</th>
              <th>最终值</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="getSkillRefKey(row.ref)">
              <th>
                {{ formatRef(row.ref) }}
                <small>{{ row.occupation ? "职业技能" : "仅兴趣技能" }}</small>
                <small v-if="row.ref.definitionId === 'credit-rating' && occupation">
                  职业要求范围：{{ occupation.creditRating.min }} ～ {{ occupation.creditRating.max }}
                </small>
              </th>
              <td>{{ baseValue(row.ref) ?? "—" }}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="1"
                  :value="allocationFor(row.ref).occupationPoints"
                  :disabled="!row.occupation"
                  :aria-label="`${formatRef(row.ref)}职业点`"
                  @input="updateAllocation(row.ref, 'occupationPoints', $event)"
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="1"
                  :value="allocationFor(row.ref).interestPoints"
                  :aria-label="`${formatRef(row.ref)}兴趣点`"
                  @input="updateAllocation(row.ref, 'interestPoints', $event)"
                />
              </td>
              <td><strong>{{ finalValue(row.ref) ?? "—" }}</strong></td>
              <td class="allocation-row-status">
                <button
                  v-if="!row.occupation"
                  class="button compact-button danger"
                  type="button"
                  @click="removeInterestSkill(row.ref)"
                >移除技能</button>
                <small
                  v-if="definitionFor(row.ref)?.creationPointPolicy === 'keeper-approval' &&
                    allocationFor(row.ref).occupationPoints + allocationFor(row.ref).interestPoints > 0"
                  class="approval-message"
                >该技能的创建期点数需要 KP 批准。</small>
                <small
                  v-if="row.ref.definitionId === 'credit-rating' && hasApproval(row.ref, 'credit-rating-override')"
                  class="approval-message"
                >当前信用评级超出职业范围，需要 KP 批准。</small>
                <small
                  v-for="(issue, index) in rowIssues(row.ref)"
                  :key="`${issue.code}:${index}`"
                  class="error-message"
                >{{ issue.message }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel form-stack">
      <div>
        <p class="eyebrow">Interest only</p>
        <h3>添加兴趣技能</h3>
      </div>
      <label class="field">
        <span>搜索目录技能</span>
        <input v-model="interestSearch" type="search" placeholder="中文名、英文名、别名或专业化名称" />
      </label>
      <div class="interest-candidate-list">
        <article
          v-for="ref in interestCandidates"
          :key="getSkillRefKey(ref)"
          class="interest-candidate"
          :class="{ disabled: definitionFor(ref)?.creationPointPolicy === 'forbidden' }"
        >
          <div>
            <strong>{{ formatRef(ref) }}</strong>
            <small v-if="creationPolicyMessage(ref)">{{ creationPolicyMessage(ref) }}</small>
          </div>
          <label>
            <span>兴趣点</span>
            <input
              type="number"
              min="1"
              step="1"
              :value="interestPointsFor(ref)"
              :disabled="definitionFor(ref)?.creationPointPolicy === 'forbidden'"
              @input="setInterestDraftPoints(ref, $event)"
            />
          </label>
          <button
            class="button"
            type="button"
            :disabled="definitionFor(ref)?.creationPointPolicy === 'forbidden'"
            @click="addInterestSkill(ref)"
          >添加</button>
        </article>
      </div>
      <p v-if="interestCandidates.length === 0" class="empty-state">
        没有符合当前搜索且尚未加入的目录技能。
      </p>
    </section>

    <section class="panel form-stack">
      <div>
        <p class="eyebrow">Custom specialization</p>
        <h3>创建兴趣专业化</h3>
      </div>
      <div class="custom-interest-grid">
        <label class="field">
          <span>专业化父技能</span>
          <select v-model="customParentId">
            <option v-for="definition in customParents" :key="definition.id" :value="definition.id">
              {{ definition.name.zh }} / {{ definition.name.en }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>具体名称</span>
          <input v-model="customDisplayName" type="text" placeholder="例如：陶艺、西班牙语、沙漠" />
        </label>
        <label class="field">
          <span>兴趣点</span>
          <input v-model.number="customInterestPoints" type="number" min="1" step="1" />
        </label>
      </div>
      <p v-if="selectedCustomParent?.creationPointPolicy === 'keeper-approval'" class="approval-message">
        该技能的创建期点数需要 KP 批准。
      </p>
      <p v-if="customSingleInstanceConflict(selectedCustomParent)" class="warning-message">
        {{ selectedCustomParent?.name.zh }}只允许一个专业化实例。
      </p>
      <button
        class="button"
        type="button"
        :disabled="!selectedCustomParent || customSingleInstanceConflict(selectedCustomParent)"
        @click="createCustomInterest"
      >创建并加入兴趣技能</button>
    </section>
  </section>
</template>
