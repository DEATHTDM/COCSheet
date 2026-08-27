// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import { fanMaterialNotice, fanMaterialPolicyUrl } from "../app/legalContent";
import LegalPage from "./LegalPage.vue";

describe("LegalPage", () => {
  it("renders the current required notice and clear license boundary", () => {
    const wrapper = mount(LegalPage, { global: { stubs: { RouterLink: RouterLinkStub } } });

    expect(wrapper.get("h1").text()).toBe("法律与许可");
    expect(wrapper.get(".fan-material-notice").text()).toBe(fanMaterialNotice);
    expect(wrapper.get(".fan-material-notice").text()).toContain("prohibited from charging");
    expect(wrapper.get(".fan-material-notice").text()).toContain("not published, endorsed, or specifically approved");
    expect(wrapper.text()).toContain("不会因为出现在本站或源代码仓库中而获得 GPL 授权");
    expect(wrapper.text()).toContain("不销售人物数据");
  });

  it("uses safe external links for policy, source, LICENSE, NOTICE, and Chaosium", () => {
    const wrapper = mount(LegalPage, { global: { stubs: { RouterLink: RouterLinkStub } } });
    const externalLinks = wrapper.findAll('a[target="_blank"]');

    expect(externalLinks).toHaveLength(5);
    expect(externalLinks.map((link) => link.attributes("href"))).toContain(fanMaterialPolicyUrl);
    externalLinks.forEach((link) => {
      expect(link.attributes("rel")).toBe("noopener noreferrer");
    });
  });
});
