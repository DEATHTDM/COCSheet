import type { CharacterExtensionId } from "../types/settingPack";

export interface CharacterExtension {
  readonly id: CharacterExtensionId;
  readonly version: number;
}

const extensionRegistry = new Map<CharacterExtensionId, CharacterExtension>();

export function registerCharacterExtension(extension: CharacterExtension): void {
  if (extensionRegistry.has(extension.id)) {
    throw new Error(`人物扩展已注册：${extension.id}`);
  }

  extensionRegistry.set(extension.id, extension);
}

export function getCharacterExtension(
  extensionId: CharacterExtensionId,
): CharacterExtension | undefined {
  return extensionRegistry.get(extensionId);
}

export function hasCharacterExtension(extensionId: CharacterExtensionId): boolean {
  return extensionRegistry.has(extensionId);
}
