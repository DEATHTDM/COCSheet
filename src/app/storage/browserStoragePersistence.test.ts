import { describe, expect, it, vi } from "vitest";

import {
  checkBrowserStoragePersistence,
  requestBrowserStoragePersistence,
} from "./browserStoragePersistence";

describe("browser Storage persistence adapter", () => {
  it("reports persisted and not-persisted states", async () => {
    await expect(checkBrowserStoragePersistence({
      persisted: vi.fn().mockResolvedValue(true), persist: vi.fn(),
    })).resolves.toBe("persisted");
    await expect(checkBrowserStoragePersistence({
      persisted: vi.fn().mockResolvedValue(false), persist: vi.fn(),
    })).resolves.toBe("not-persisted");
  });

  it("reports explicit persist grants and denials", async () => {
    await expect(requestBrowserStoragePersistence({
      persist: vi.fn().mockResolvedValue(true),
    })).resolves.toBe("persisted");
    await expect(requestBrowserStoragePersistence({
      persist: vi.fn().mockResolvedValue(false),
    })).resolves.toBe("not-persisted");
  });

  it("keeps unsupported and rejected APIs nonfatal", async () => {
    await expect(checkBrowserStoragePersistence(undefined)).resolves.toBe("unsupported");
    await expect(checkBrowserStoragePersistence({
      persisted: vi.fn().mockRejectedValue(new Error("blocked")), persist: vi.fn(),
    })).resolves.toBe("error");
    await expect(requestBrowserStoragePersistence({
      persist: vi.fn().mockRejectedValue(new Error("blocked")),
    })).resolves.toBe("error");
  });
});
