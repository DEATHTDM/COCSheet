// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { renderBootstrapFailure } from "./bootstrapFallback";

describe("bootstrap failure fallback", () => {
  it("renders a static recovery surface without exposing raw error content", () => {
    document.body.innerHTML = '<div id="app">old content</div>';
    renderBootstrapFailure(document.getElementById("app"));
    expect(document.body.textContent).toContain("COCSheet");
    expect(document.body.textContent).toContain("应用启动失败");
    expect(document.body.textContent).not.toContain("old content");
    const links = [...document.querySelectorAll("a")];
    expect(links.some((link) => link.textContent === "GitHub 项目")).toBe(true);
    expect(links.some((link) => link.textContent === "反馈问题")).toBe(true);
    expect(document.querySelector("button")?.textContent).toBe("重新载入页面");
  });
});
