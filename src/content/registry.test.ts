import { describe, expect, it } from "vitest";

import { isSupportedSetting } from "../coc7/types/setting";
import { getOccupationRegistry } from "./occupationRegistry";
import { getAvailableSettings, getSettingPack, hasSupportedSettingPack } from "./registry";
import { getHistoricalSettingLabel } from "./settingCompatibility";

describe("setting registry", () => {
  it("production available registry 只发现 Standard", () => {
    expect(getAvailableSettings().map((setting) => setting.id)).toEqual(["standard"]);
  });

  it("把 supported pack 与历史可识别名称分开", () => {
    expect(hasSupportedSettingPack("standard")).toBe(true);
    expect(isSupportedSetting("standard")).toBe(true);
    expect(getSettingPack("standard")?.skills?.map((skill) => skill.id)).toContain("dodge");
    expect(getSettingPack("gaslight")).toBeUndefined();
    expect(hasSupportedSettingPack("gaslight")).toBe(false);
    expect(isSupportedSetting("gaslight")).toBe(false);
    expect(getHistoricalSettingLabel("gaslight")).toBe("Cthulhu by Gaslight");
    expect(getOccupationRegistry("gaslight").definitions).toEqual([]);
  });

  it("非法 Setting 返回 undefined", () => {
    expect(getSettingPack("pulp")).toBeUndefined();
    expect(hasSupportedSettingPack("pulp")).toBe(false);
  });
});
