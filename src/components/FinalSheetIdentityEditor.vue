<script setup lang="ts">
import { reactive, ref } from "vue";

import { useCharacterStore } from "../app/stores/characterStore";
import type { Character } from "../coc7/types/character";
import { getHistoricalSettingLabel } from "../content/settingCompatibility";
import { formatOccupationEraId } from "../creation/presentation/occupationPresentation";

const props = defineProps<{ readonly character: Character }>();
const characterStore = useCharacterStore();
const editing = ref(false);
const saving = ref(false);
const actionError = ref("");
const actionStatus = ref("");
const drafts = reactive({
  name: "",
  sex: "",
  residence: "",
  birthplace: "",
});

function beginEditing(): void {
  drafts.name = props.character.name;
  drafts.sex = props.character.sex ?? "";
  drafts.residence = props.character.residence ?? "";
  drafts.birthplace = props.character.birthplace ?? "";
  actionError.value = "";
  actionStatus.value = "";
  editing.value = true;
}

function cancelEditing(): void {
  editing.value = false;
  actionError.value = "";
  actionStatus.value = "";
}

async function saveIdentity(): Promise<void> {
  actionError.value = "";
  actionStatus.value = "";
  saving.value = true;
  try {
    await characterStore.setIdentityDetails(props.character.id, {
      sex: drafts.sex,
      residence: drafts.residence,
      birthplace: drafts.birthplace,
    });
    await characterStore.updateName(props.character.id, drafts.name);
    editing.value = false;
    actionStatus.value = "身份信息已保存。";
  } catch (error: unknown) {
    actionError.value = error instanceof Error ? error.message : "保存身份信息失败。";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="panel final-identity-panel">
    <div class="section-heading final-narrative-heading">
      <div>
        <p class="eyebrow">Investigator</p>
        <h2>身份</h2>
      </div>
      <button v-if="!editing" class="button" type="button" @click="beginEditing">编辑身份</button>
    </div>

    <form v-if="editing" class="final-identity-form" @submit.prevent="saveIdentity">
      <label class="field">
        <span>姓名</span>
        <input v-model="drafts.name" name="name" type="text" autocomplete="name">
      </label>
      <label class="field">
        <span>性别</span>
        <input v-model="drafts.sex" name="sex" type="text">
      </label>
      <label class="field">
        <span>住所</span>
        <input v-model="drafts.residence" name="residence" type="text">
      </label>
      <label class="field">
        <span>出身地</span>
        <input v-model="drafts.birthplace" name="birthplace" type="text">
      </label>
      <div class="actions final-identity-actions">
        <button class="button primary" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存身份' }}</button>
        <button class="button" type="button" :disabled="saving" @click="cancelEditing">取消</button>
      </div>
    </form>

    <dl v-else class="sheet-fact-grid final-identity-summary">
      <div><dt>姓名</dt><dd>{{ character.name || '未命名调查员' }}</dd></div>
      <div><dt>年龄</dt><dd>{{ character.age ?? '—' }}</dd></div>
      <div><dt>性别</dt><dd>{{ character.sex ?? '—' }}</dd></div>
      <div><dt>Era</dt><dd>{{ character.eraId ? formatOccupationEraId(character.eraId) : '—' }}</dd></div>
      <div><dt>住所</dt><dd>{{ character.residence ?? '—' }}</dd></div>
      <div><dt>出身地</dt><dd>{{ character.birthplace ?? '—' }}</dd></div>
      <div><dt>职业</dt><dd>{{ character.occupation?.displayNameSnapshot.zh ?? '—' }}</dd></div>
      <div><dt>Setting</dt><dd>{{ getHistoricalSettingLabel(character.settingId) }}</dd></div>
    </dl>

    <p v-if="actionError" class="error-message final-narrative-message" role="alert">{{ actionError }}</p>
    <p v-if="actionStatus" class="success-message final-narrative-message" role="status">{{ actionStatus }}</p>
  </section>
</template>
