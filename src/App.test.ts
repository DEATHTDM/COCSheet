// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "./App.vue";
import { buildMetadata } from "./app/buildMetadata";
import { runtimeErrorState } from "./app/runtime/runtimeErrorState";

beforeEach(() => runtimeErrorState.clear());
afterEach(() => runtimeErrorState.clear());

describe("App shell", () => {
  it("uses player-facing navigation and the shared build metadata footer", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "home", component: { template: "<p>首页内容</p>" } },
        { path: "/create", component: { template: "<p>创建</p>" } },
        { path: "/kp/presets", component: { template: "<p>预设</p>" } },
      ],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    expect(wrapper.get("header").text()).toContain("建卡预设");
    expect(wrapper.get("header").text()).not.toContain("KP 建卡预设");
    expect(wrapper.get("footer").text()).toContain(
      `COCSheet v${buildMetadata.version} · 构建 ${buildMetadata.shortBuildSha}`,
    );
    expect(wrapper.get("footer").text()).toContain("源代码");
    expect(wrapper.get("footer").text()).toContain("反馈问题");
  });
});
