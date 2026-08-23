// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { createCreationGuideReadiness } from "../../creation/presentation/creationGuideReadiness";
import CreationGuidePanel from "./CreationGuidePanel.vue";

describe("CreationGuidePanel", () => {
  it("renders controlled open state and emits collapse without owning preference state", async () => {
    const wrapper = mount(CreationGuidePanel, {
      props: {
        currentStep: "basic-info",
        open: true,
        readiness: createCreationGuideReadiness(),
      },
    });

    const panel = wrapper.get("aside");
    const heading = panel.get("h2");
    const hideButton = panel.get("button");
    expect(heading.text()).toBe("完善调查员基本信息");
    expect(panel.attributes("aria-labelledby")).toBe(heading.attributes("id"));
    expect(hideButton.text()).toBe("隐藏新手引导");
    expect(hideButton.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(`#${hideButton.attributes("aria-controls")}`).exists()).toBe(true);
    expect(panel.findAll(".creation-guide-progress li")).toHaveLength(7);
    expect(panel.get('.creation-guide-progress [aria-current="step"]').text()).toContain("基本信息");
    expect(panel.find(".creation-guide-progress button").exists()).toBe(false);
    expect(panel.find(".creation-guide-progress a").exists()).toBe(false);
    expect(panel.get(".creation-guide-readiness-summary").text())
      .toBe("当前步骤已满足继续条件。");

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

  it("renders blockers, approvals, and warnings without turning progress into navigation", async () => {
    const wrapper = mount(CreationGuidePanel, {
      props: {
        currentStep: "skills",
        open: true,
        readiness: createCreationGuideReadiness({
          blockers: ["技能需求尚未完成"],
          approvals: ["需要 KP 批准克苏鲁神话点数"],
          warnings: ["仍有未使用的兴趣点"],
        }),
      },
    });

    expect(wrapper.get(".creation-guide-readiness-summary").text()).toBe("还需要处理 2 项。");
    expect(wrapper.get(".creation-guide-readiness").text()).toContain("仍需完成");
    expect(wrapper.get(".creation-guide-readiness").text()).toContain("待批准事项");
    expect(wrapper.get(".creation-guide-readiness").text()).toContain("继续前提醒");
    await wrapper.get('.creation-guide-progress [data-progress-state="completed"]').trigger("click");
    expect(wrapper.emitted("update:open")).toBeUndefined();

    await wrapper.setProps({
      readiness: createCreationGuideReadiness({ warnings: ["仍有未使用的兴趣点"] }),
    });
    expect(wrapper.get(".creation-guide-readiness-summary").text())
      .toBe("当前步骤没有阻断问题，但仍有需要显式确认的提醒。");
  });

  it("uses the Review-specific terminal guidance without adding completion state", () => {
    const wrapper = mount(CreationGuidePanel, {
      props: {
        currentStep: "review",
        open: true,
        readiness: createCreationGuideReadiness(),
      },
    });

    expect(wrapper.get(".creation-guide-readiness-summary").text())
      .toContain("建卡流程已到检查阶段");
    expect(wrapper.get('.creation-guide-progress [aria-current="step"]').text()).toContain("检查");
  });
});
