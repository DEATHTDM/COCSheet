<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { buildMetadata } from "./app/buildMetadata";
import { createDiagnosticReport } from "./app/diagnostics";
import { issueChooserUrl, repositoryUrl } from "./app/releaseLinks";
import RuntimeRecoveryPanel from "./app/runtime/RuntimeRecoveryPanel.vue";
import { runtimeErrorState } from "./app/runtime/runtimeErrorState";

const route = useRoute();
const router = useRouter();
const runtimeError = runtimeErrorState.current;
const diagnosticReport = computed(() => createDiagnosticReport({
  routePath: route.fullPath,
  ...(runtimeError.value ? { errorCount: runtimeError.value.occurrenceCount } : {}),
}));

function reloadPage(): void {
  window.location.reload();
}

function returnHome(): void {
  void router.push({ name: "home" }).then(() => runtimeErrorState.clear()).catch((error: unknown) => {
    console.error("Runtime recovery navigation failed", error);
    runtimeErrorState.report("unhandled-rejection");
  });
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">COCSheet</RouterLink>
      <nav aria-label="主要导航">
        <RouterLink to="/create">创建调查员</RouterLink>
        <RouterLink to="/kp/presets">建卡预设</RouterLink>
      </nav>
    </header>

    <main>
      <RuntimeRecoveryPanel
        v-if="runtimeError"
        :diagnostic-report="diagnosticReport"
        @reload="reloadPage"
        @home="returnHome"
      />
      <RouterView v-else />
    </main>

    <footer class="site-footer">
      <span>COCSheet v{{ buildMetadata.version }} · 构建 {{ buildMetadata.shortBuildSha }} · 非官方粉丝项目</span>
      <span class="footer-links">
        <RouterLink to="/legal">法律与许可</RouterLink>
        <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">源代码</a>
        <a :href="issueChooserUrl" target="_blank" rel="noopener noreferrer">反馈问题</a>
      </span>
    </footer>
  </div>
</template>
