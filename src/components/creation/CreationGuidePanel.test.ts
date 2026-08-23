// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CreationGuidePanel from "./CreationGuidePanel.vue";

describe("CreationGuidePanel", () => {
  it("renders controlled open state and emits collapse without owning preference state", async () => {
    const wrapper = mount(CreationGuidePanel, {
      props: { currentStep: "basic-info", open: true },
    });

    const panel = wrapper.get("aside");
    const heading = panel.get("h2");
    const hideButton = panel.get("button");
    expect(heading.text()).toBe("完善调查员基本信息");
    expect(panel.attributes("aria-labelledby")).toBe(heading.attributes("id"));
    expect(hideButton.text()).toBe("隐藏新手引导");
    expect(hideButton.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(`#${hideButton.attributes("aria-controls")}`).exists()).toBe(true);

    await hideButton.trigger("click");
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.find("aside").exists()).toBe(true);

    await wrapper.setProps({ open: false });
    expect(wrapper.find("aside").exists()).toBe(false);
    await wrapper.setProps({ currentStep: "skills" });
    await wrapper.setProps({ open: true });
    expect(wrapper.get("h2").text()).toBe("完成技能选择与分配");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
  });
});
