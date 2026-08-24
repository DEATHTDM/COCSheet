import { readonly, ref, type DeepReadonly, type Ref } from "vue";

export type RuntimeErrorSource = "vue" | "window-error" | "unhandled-rejection";

export interface RuntimeErrorSummary {
  readonly source: RuntimeErrorSource;
  readonly firstReportedAt: number;
  readonly lastReportedAt: number;
  readonly occurrenceCount: number;
}

export interface RuntimeErrorState {
  readonly current: DeepReadonly<Ref<RuntimeErrorSummary | null>>;
  readonly report: (source: RuntimeErrorSource) => void;
  readonly clear: () => void;
}

export function createRuntimeErrorState(now: () => number = Date.now): RuntimeErrorState {
  const current = ref<RuntimeErrorSummary | null>(null);

  function report(source: RuntimeErrorSource): void {
    const reportedAt = now();
    current.value = current.value === null
      ? { source, firstReportedAt: reportedAt, lastReportedAt: reportedAt, occurrenceCount: 1 }
      : {
        source,
        firstReportedAt: current.value.firstReportedAt,
        lastReportedAt: reportedAt,
        occurrenceCount: current.value.occurrenceCount + 1,
      };
  }

  function clear(): void {
    current.value = null;
  }

  return { current: readonly(current), report, clear };
}

export const runtimeErrorState = createRuntimeErrorState();
