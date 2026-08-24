export type BrowserStoragePersistenceStatus =
  | "persisted"
  | "not-persisted"
  | "unsupported"
  | "error";

export interface BrowserStorageManager {
  readonly persisted?: () => Promise<boolean>;
  readonly persist?: () => Promise<boolean>;
}

function defaultStorageManager(): BrowserStorageManager | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.storage;
}

export async function checkBrowserStoragePersistence(
  storage: BrowserStorageManager | undefined = defaultStorageManager(),
): Promise<BrowserStoragePersistenceStatus> {
  if (!storage?.persisted || !storage.persist) return "unsupported";
  try {
    return await storage.persisted() ? "persisted" : "not-persisted";
  } catch {
    return "error";
  }
}

export async function requestBrowserStoragePersistence(
  storage: BrowserStorageManager | undefined = defaultStorageManager(),
): Promise<BrowserStoragePersistenceStatus> {
  if (!storage?.persist) return "unsupported";
  try {
    return await storage.persist() ? "persisted" : "not-persisted";
  } catch {
    return "error";
  }
}
