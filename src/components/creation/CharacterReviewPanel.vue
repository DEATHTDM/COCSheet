<script setup lang="ts">
import { computed, ref } from "vue";

import { characteristicIds } from "../../coc7/types/attribute";
import type { Character } from "../../coc7/types/character";
import { getSkillRefKey } from "../../coc7/rules/skills";
import { getSettingPackOrThrow } from "../../content/registry";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  formatOccupationEraId,
  formatSkillRefForOccupation,
} from "../../creation/presentation/occupationPresentation";
import { useCreationStore } from "../../creation/stores/creationStore";

const props = defineProps<{ readonly character: Character }>();
const creationStore = useCreationStore();
const actionError = ref("");
const settingName = computed(() => getSettingPackOrThrow(props.character.settingId).name);
const skillRegistry = computed(() => getSkillRegistry(props.character.settingId));
const skills = computed(() => [...(props.character.skills ?? [])]
  .map((skill) => ({
    skill,
    key: getSkillRefKey(skill.ref),
    label: formatSkillRefForOccupation(skill.ref, skillRegistry.value),
  }))
  .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")));

async function returnToSkills(): Promise<void> {
  actionError.value = "";
  try {
    await creationStore.setCurrentStep("skills");
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "返回技能调整失败。";
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
      <button class="button" type="button" @click="returnToSkills">返回技能调整</button>
    </header>

    <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>

    <section class="panel form-stack">
      <h3>调查员摘要</h3>
      <dl class="review-summary-grid">
        <div><dt>姓名</dt><dd>{{ character.name || '未命名调查员' }}</dd></div>
        <div><dt>Setting</dt><dd>{{ settingName }}</dd></div>
        <div><dt>Era</dt><dd>{{ character.eraId ? formatOccupationEraId(character.eraId) : '未指定' }}</dd></div>
        <div><dt>年龄</dt><dd>{{ character.age ?? '—' }}</dd></div>
        <div><dt>最终职业</dt><dd>{{ character.occupation?.displayNameSnapshot.zh ?? '—' }}</dd></div>
        <div><dt>Luck</dt><dd>{{ character.luck ?? '—' }}</dd></div>
      </dl>
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
