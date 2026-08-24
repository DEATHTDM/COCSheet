import { describe, expect, it } from "vitest";

import { createRuntimeErrorState } from "./runtimeErrorState";

describe("runtime error state", () => {
  it("reports, counts repeated errors, and clears without retaining exception data", () => {
    const times = [10, 20];
    const state = createRuntimeErrorState(() => times.shift() ?? 30);
    state.report("vue");
    state.report("unhandled-rejection");
    expect(state.current.value).toEqual({
      source: "unhandled-rejection",
      firstReportedAt: 10,
      lastReportedAt: 20,
      occurrenceCount: 2,
    });
    expect(state.current.value).not.toHaveProperty("error");
    state.clear();
    expect(state.current.value).toBeNull();
  });
});
