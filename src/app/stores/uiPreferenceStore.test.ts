// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CREATION_EXPERIENCE_MODE_STORAGE_KEY } from "../preferences/creationExperiencePreference";
import { useUiPreferenceStore } from "./uiPreferenceStore";

function createStore() {
  setActivePinia(createPinia());
  return useUiPreferenceStore();
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ui preference store", () => {
  it("initializes from the browser preference adapter", () => {
    window.localStorage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, "quick");

    expect(createStore().creationExperienceMode).toBe("quick");
  });

  it.each(["guided", "quick"] as const)(
    "sets %s in memory and persistence",
    (mode) => {
      const store = createStore();

      store.setCreationExperienceMode(mode);

      expect(store.creationExperienceMode).toBe(mode);
      expect(window.localStorage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY)).toBe(mode);
    },
  );

  it("keeps the in-memory update when browser persistence fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createStore();

    expect(() => store.setCreationExperienceMode("quick")).not.toThrow();
    expect(store.creationExperienceMode).toBe("quick");
  });
});
