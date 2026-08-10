<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSettingStore } from "../app/stores/settingStore";
import type { SettingId } from "../coc7/types/setting";
import { attributeGenerationMethodSchema, type AttributeGenerationMethod } from "../creation/types/creationPreset";
import { usePresetStore } from "../kp/presets/presetStore";

const route = useRoute();
const router = useRouter();
const settingStore = useSettingStore();
const presetStore = usePresetStore();
const name = ref("");
const settingId = ref<SettingId>("standard");
const allowedMethods = ref<AttributeGenerationMethod[]>([]);
const multiCount = ref(3);
const assignIntMin = ref(40);
const assignSizMin = ref(40);
const pointTotal = ref(460);
const pointMin = ref(15);
const pointMax = ref(90);
const pointIntMin = ref(40);
const pointSizMin = ref(40);
const message = ref("");
const errorMessage = ref("");
const methods = attributeGenerationMethodSchema.options;
const methodLabels: Readonly<Record<AttributeGenerationMethod, string>> = {
  "standard-roll": "标准掷骰",
  "low-roll-boost": "低骰补强",
  "assign-roll": "自由分配骰值",
  "multi-roll": "多组选择",
  "point-buy": "购点",
  manual: "手动输入",
};
const presetId = String(route.params.id);

onMounted(async () => {
  try {
    const record = await presetStore.loadById(presetId);
    if (!record) { errorMessage.value = "找不到该 KP 建卡预设。"; return; }
    name.value = record.data.name;
    settingId.value = record.data.settingId;
    const config = record.data.attributeGeneration;
    allowedMethods.value = [...config.allowedMethods];
    multiCount.value = config.multiRoll?.count ?? 3;
    assignIntMin.value = config.assignRoll?.intMin ?? 40;
    assignSizMin.value = config.assignRoll?.sizMin ?? 40;
    pointTotal.value = config.pointBuy?.total ?? 460;
    pointMin.value = config.pointBuy?.min ?? 15;
    pointMax.value = config.pointBuy?.max ?? 90;
    pointIntMin.value = config.pointBuy?.intMin ?? 40;
    pointSizMin.value = config.pointBuy?.sizMin ?? 40;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "读取预设失败。";
  }
});

async function save(): Promise<void> {
  const record = presetStore.current;
  if (!record) return;
  if (allowedMethods.value.length === 0) { errorMessage.value = "至少允许一种属性生成方式。"; return; }
  try {
    await presetStore.save({
      ...record.data,
      name: name.value.trim(),
      settingId: settingId.value,
      attributeGeneration: {
        allowedMethods: [...allowedMethods.value],
        multiRoll: { count: multiCount.value },
        assignRoll: { intMin: assignIntMin.value, sizMin: assignSizMin.value },
        pointBuy: { total: pointTotal.value, min: pointMin.value, max: pointMax.value, intMin: pointIntMin.value, sizMin: pointSizMin.value },
      },
    });
    message.value = "预设已保存。";
    errorMessage.value = "";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "保存预设失败。";
  }
}

async function removePreset(): Promise<void> {
  if (window.confirm(`确定删除预设“${name.value}”吗？`)) {
    await presetStore.remove(presetId);
    await router.push("/kp/presets");
  }
}
</script>

<template>
  <section class="page-stack narrow-page">
    <div><p class="eyebrow">KP 建卡预设</p><h1>编辑预设</h1></div>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <form v-if="presetStore.current" class="form-stack" @submit.prevent="save">
      <label class="field"><span>名称</span><input v-model="name" type="text" required /></label>
      <label class="field"><span>建卡环境</span><select v-model="settingId"><option v-for="setting in settingStore.settings" :key="setting.id" :value="setting.id">{{ setting.name }}</option></select></label>

      <fieldset class="panel form-stack"><legend>允许的属性生成方式</legend>
        <label v-for="method in methods" :key="method" class="checkbox-field"><input v-model="allowedMethods" type="checkbox" :value="method" />{{ methodLabels[method] }}</label>
      </fieldset>

      <fieldset class="panel config-grid"><legend>属性方式配置</legend>
        <label class="field"><span>多组数量（2～10）</span><input v-model.number="multiCount" type="number" min="2" max="10" /></label>
        <label class="field"><span>Assign INT 下限</span><input v-model.number="assignIntMin" type="number" min="0" max="99" /></label>
        <label class="field"><span>Assign SIZ 下限</span><input v-model.number="assignSizMin" type="number" min="0" max="99" /></label>
        <label class="field"><span>Point Buy 总点数</span><input v-model.number="pointTotal" type="number" min="1" /></label>
        <label class="field"><span>Point Buy 最小值</span><input v-model.number="pointMin" type="number" min="0" max="99" /></label>
        <label class="field"><span>Point Buy 最大值</span><input v-model.number="pointMax" type="number" min="0" max="99" /></label>
        <label class="field"><span>Point Buy INT 下限</span><input v-model.number="pointIntMin" type="number" min="0" max="99" /></label>
        <label class="field"><span>Point Buy SIZ 下限</span><input v-model.number="pointSizMin" type="number" min="0" max="99" /></label>
      </fieldset>

      <p v-if="message" class="success-message" aria-live="polite">{{ message }}</p>
      <div class="actions"><button class="button primary" type="submit">保存</button><button class="button danger" type="button" @click="removePreset">删除</button></div>
    </form>
  </section>
</template>
