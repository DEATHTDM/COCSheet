import { describe, expect, it, vi } from "vitest";

import {
  CREATION_EXPERIENCE_MODE_STORAGE_KEY,
  readCreationExperienceMode,
  writeCreationExperienceMode,
} from "./creationExperiencePreference";

function makeStorage(value: string | null = null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe("creation experience preference adapter", () => {
  it.each([
    [null, "guided"],
    ["guided", "guided"],
    ["quick", "quick"],
    ["unknown", "guided"],
    ["", "guided"],
  ] as const)("reads %j as %s", (storedValue, expected) => {
    expect(readCreationExperienceMode(makeStorage(storedValue))).toBe(expected);
  });

  it("falls back to guided when getItem throws", () => {
    const storage = makeStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readCreationExperienceMode(storage)).toBe("guided");
  });

  it.each(["guided", "quick"] as const)("writes %s with the versioned key", (mode) => {
    const storage = makeStorage();

    writeCreationExperienceMode(mode, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      CREATION_EXPERIENCE_MODE_STORAGE_KEY,
      mode,
    );
  });

  it("swallows setItem failures", () => {
    const storage = makeStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => writeCreationExperienceMode("quick", storage)).not.toThrow();
  });
});
