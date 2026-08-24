// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CustomOccupationBuilder from "./CustomOccupationBuilder.vue";

describe("CustomOccupationBuilder player-facing terminology", () => {
  it("uses 技能专攻 consistently for specialization controls", async () => {
    const wrapper = mount(CustomOccupationBuilder, {
      props: {
        settingId: "standard",
        eraId: "classic-1920s",
      },
    });

    await wrapper.get('[data-testid="add-custom-skill-slot"]').trigger("click");
    await wrapper.get('select[aria-label="栏位 1 技能"]').setValue("fighting");

    expect(wrapper.text()).toContain("技能专攻形式");
    expect(wrapper.text()).toContain("已有预设技能专攻");
    expect(wrapper.text()).toContain("建卡技能步骤再决定具体技能专攻");
    expect(wrapper.text()).not.toContain("专业形式");
    expect(wrapper.text()).not.toContain("预定义专业");
    expect(wrapper.text()).not.toContain("具体专业");
  });
});
