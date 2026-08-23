// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CreationGuidePanel from "./CreationGuidePanel.vue";

describe("CreationGuidePanel", () => {
  it("opens by default with an accessible heading and page-local collapse control", async () => {
    const wrapper = mount(CreationGuidePanel, {
      props: { currentStep: "basic-info", settingId: "standard" },
    });

    const panel = wrapper.get("aside");
    const heading = panel.get("h2");
    const hideButton = panel.get("button");
    expect(heading.text()).toBe("完善调查员基本信息");
    expect(panel.attributes("aria-labelledby")).toBe(heading.attributes("id"));
    expect(hideButton.text()).toBe("隐藏新手引导");
    expect(hideButton.attributes("aria-expanded")).toBe("true");

    await hideButton.trigger("click");
    expect(wrapper.find("aside").exists()).toBe(false);
    expect(wrapper.findAll("button")).toHaveLength(1);
    const showButton = wrapper.get("button");
    expect(showButton.text()).toBe("显示新手引导");
    expect(showButton.attributes("aria-expanded")).toBe("false");

    await wrapper.setProps({ currentStep: "skills" });
    await showButton.trigger("click");
    expect(wrapper.get("h2").text()).toBe("完成技能选择与分配");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
  });

  it("renders neutral non-Standard context without requiring Pinia or a workflow Store", () => {
    const wrapper = mount(CreationGuidePanel, {
      props: { currentStep: "possessions", settingId: "gaslight" },
    });

    expect(wrapper.text()).toContain("当前建卡环境的财富与装备内容尚未实现");
    expect(wrapper.text()).toContain("不会回退到 Standard 规则");
    expect(wrapper.text()).not.toContain("正资产需要至少一条资产构成说明");
  });
});
