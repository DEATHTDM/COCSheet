import { describe, expect, it } from "vitest";

import { validateBasicInfoTransition } from "./basicInfoTransition";

describe("validateBasicInfoTransition", () => {
  it("preserves the existing identity and era preconditions without requiring a name", () => {
    expect(validateBasicInfoTransition({
      sex: "",
      residence: " ",
      birthplace: "香港",
      eraRequired: true,
      eraId: undefined,
    })).toEqual([
      "请填写性别、住所与出身地。",
      "请选择建卡时代。",
    ]);

    expect(validateBasicInfoTransition({
      sex: "测试",
      residence: "上海",
      birthplace: "香港",
      eraRequired: true,
      eraId: "classic-1920s",
    })).toEqual([]);
  });

  it("does not require an era when the current Setting declares no eras", () => {
    expect(validateBasicInfoTransition({
      sex: "测试",
      residence: "上海",
      birthplace: "香港",
      eraRequired: false,
      eraId: undefined,
    })).toEqual([]);
  });
});
