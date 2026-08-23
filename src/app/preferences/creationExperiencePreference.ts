export type CreationExperienceMode = "guided" | "quick";

export const CREATION_EXPERIENCE_MODE_STORAGE_KEY =
  "cocsheet:creation-experience-mode:v1";

interface CreationExperiencePreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): CreationExperiencePreferenceStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function parseCreationExperienceMode(
  value: string | null | undefined,
): CreationExperienceMode {
  return value === "quick" ? "quick" : "guided";
}

export function readCreationExperienceMode(
  storage: CreationExperiencePreferenceStorage | undefined = getBrowserStorage(),
): CreationExperienceMode {
  if (!storage) return "guided";
  try {
    return parseCreationExperienceMode(
      storage.getItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY),
    );
  } catch {
    return "guided";
  }
}

export function writeCreationExperienceMode(
  mode: CreationExperienceMode,
  storage: CreationExperiencePreferenceStorage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(CREATION_EXPERIENCE_MODE_STORAGE_KEY, mode);
  } catch {
    // This preference is a convenience only; storage failure must not block creation.
  }
}
