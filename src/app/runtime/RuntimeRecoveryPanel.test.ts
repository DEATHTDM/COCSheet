// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { issueChooserUrl } from "../releaseLinks";
import RuntimeRecoveryPanel from "./RuntimeRecoveryPanel.vue";

afterEach(() => vi.unstubAllGlobals());

describe("RuntimeRecoveryPanel", () => {
  it("offers Chinese recovery actions, diagnostics copy, and GitHub feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const wrapper = mount(RuntimeRecoveryPanel, { props: { diagnosticReport: "safe report" } });
    expect(wrapper.text()).toContain("页面运行时遇到了问题");
    expect(wrapper.text()).toContain("不会主动删除本地人物资料");
    expect(wrapper.get(`a[href="${issueChooserUrl}"]`).attributes("rel")).toContain("noopener");
    await wrapper.findAll("button")[2]!.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("safe report");
    expect(wrapper.text()).toContain("诊断信息已复制");
    await wrapper.findAll("button")[0]!.trigger("click");
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("reload")).toHaveLength(1);
    expect(wrapper.emitted("home")).toHaveLength(1);
  });

  it("shows readonly manual diagnostics when Clipboard API fails", async () => {
    vi.stubGlobal("navigator", {});
    const wrapper = mount(RuntimeRecoveryPanel, { props: { diagnosticReport: "manual report" } });
    await wrapper.findAll("button")[2]!.trigger("click");
    await flushPromises();
    expect(wrapper.get("textarea").attributes("readonly")).toBeDefined();
    expect(wrapper.get("textarea").element.value).toBe("manual report");
  });
});
