import { describe, expect, it } from "vitest";

import { getAvailableSettings, getSettingPack, hasSetting } from "./registry";

describe("setting registry", () => {
  it("可以发现五个 Setting", () => {
    expect(getAvailableSettings().map((setting) => setting.id)).toEqual([
      "standard",
      "gaslight",
      "down-darker-trails",
      "dark-ages",
      "regency",
    ]);
  });

  it("可以读取合法 Setting", () => {
    expect(getSettingPack("gaslight")?.name).toBe("Cthulhu by Gaslight");
    expect(hasSetting("standard")).toBe(true);
    expect(getSettingPack("standard")?.skills?.map((skill) => skill.id)).toContain("dodge");
    expect(getSettingPack("gaslight")?.skills).toBeUndefined();
  });

  it("非法 Setting 返回 undefined", () => {
    expect(getSettingPack("pulp")).toBeUndefined();
    expect(hasSetting("pulp")).toBe(false);
  });
});
