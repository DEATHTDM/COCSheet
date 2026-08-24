export interface BuildMetadata {
  readonly version: string;
  readonly buildSha: string;
  readonly shortBuildSha: string;
}

export function normalizeBuildSha(value: string): string {
  const trimmed = value.trim();
  return /^[0-9a-f]{7,64}$/iu.test(trimmed) ? trimmed.toLowerCase() : "dev";
}

export function shortenBuildSha(value: string): string {
  return value === "dev" ? value : value.slice(0, 12);
}

const buildSha = normalizeBuildSha(__BUILD_SHA__);

export const buildMetadata: BuildMetadata = Object.freeze({
  version: __APP_VERSION__,
  buildSha,
  shortBuildSha: shortenBuildSha(buildSha),
});
