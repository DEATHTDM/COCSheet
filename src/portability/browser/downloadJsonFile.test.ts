// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadJsonFile } from "./downloadJsonFile";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("downloadJsonFile", () => {
  it("以 JSON Blob 触发下载，并总是 revoke object URL", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue("blob:cocsheet-test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadJsonFile({
      text: "{\n  \"format\": \"cocsheet-character\"\n}\n",
      filename: "COCSheet-Test-12345678.cocsheet.json",
      mimeType: "application/json;charset=utf-8",
    });

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json;charset=utf-8");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:cocsheet-test");
    expect(document.querySelector("a")).toBeNull();
    vi.useRealTimers();
  });
});
