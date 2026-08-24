// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import NotFoundPage from "./NotFoundPage.vue";

describe("NotFoundPage", () => {
  it("offers normal player-facing recovery actions", () => {
    const wrapper = mount(NotFoundPage, { global: { stubs: { RouterLink: RouterLinkStub } } });
    expect(wrapper.text()).toContain("页面不存在");
    expect(wrapper.text()).toContain("返回首页");
    expect(wrapper.text()).toContain("创建调查员");
    expect(wrapper.text()).not.toContain("pathMatch");
  });
});
