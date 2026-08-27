// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { router } from "./index";

describe("application router", () => {
  it("注册独立 Character print route，并保持 Hash Router", () => {
    const resolved = router.resolve({
      name: "character-print",
      params: { id: "12000000-0000-4000-8000-000000000012" },
    });
    expect(resolved.path).toBe("/characters/12000000-0000-4000-8000-000000000012/print");
    expect(resolved.matched).toHaveLength(1);
    expect(resolved.href).toContain("#/characters/12000000-0000-4000-8000-000000000012/print");
  });

  it("resolves unknown Hash routes to the formal Not Found page", () => {
    const resolved = router.resolve("/this-route-does-not-exist");
    expect(resolved.name).toBe("not-found");
    expect(resolved.matched).toHaveLength(1);
    expect(resolved.href).toContain("#/this-route-does-not-exist");
  });

  it("resolves the legal route before the Not Found catch-all", () => {
    const resolved = router.resolve("/legal");
    expect(resolved.name).toBe("legal");
    expect(resolved.matched).toHaveLength(1);
    expect(resolved.href).toContain("#/legal");
  });
});
