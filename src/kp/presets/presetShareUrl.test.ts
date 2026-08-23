// @vitest-environment jsdom

import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import { buildKPPresetShareUrl } from "./presetShareUrl";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/create", name: "create", component: { template: "<div />" } }],
  });
}

describe("KP Preset Hash Router share URL", () => {
  it("uses the create route query, preserves a GitHub Pages pathname, and has one hash", () => {
    const token = "1.H4sIA_url-safe";
    const url = buildKPPresetShareUrl(
      token,
      { resolve: () => ({ href: `#/create?kp=${token}` }) },
      "https://example.test/COCSheet/#/kp/presets",
    );

    expect(url).toBe(`https://example.test/COCSheet/#/create?kp=${token}`);
    expect(url.split("#")).toHaveLength(2);
  });

  it("round-trips the token unchanged through Vue Router query parsing", async () => {
    const token = "1.H4sIA_url-safe";
    const router = makeRouter();
    const resolved = router.resolve({ name: "create", query: { kp: token } });

    expect(resolved.fullPath).toBe(`/create?kp=${token}`);
    await router.push(resolved.fullPath);
    expect(router.currentRoute.value.query.kp).toBe(token);
  });
});
