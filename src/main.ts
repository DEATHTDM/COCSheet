import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import { router } from "./app/router";
import { renderBootstrapFailure } from "./app/runtime/bootstrapFallback";
import { runtimeErrorState } from "./app/runtime/runtimeErrorState";
import "./styles.css";

window.addEventListener("error", (event) => {
  console.error("Unhandled window error", event.error ?? event.message);
  runtimeErrorState.report("window-error");
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection", event.reason);
  runtimeErrorState.report("unhandled-rejection");
});

try {
  const app = createApp(App);
  app.config.errorHandler = (error, _instance, info) => {
    console.error("Unhandled Vue runtime error", error, info);
    runtimeErrorState.report("vue");
  };
  app.use(createPinia()).use(router).mount("#app");
} catch (error: unknown) {
  console.error("COCSheet bootstrap failed", error);
  renderBootstrapFailure(document.getElementById("app"));
}
