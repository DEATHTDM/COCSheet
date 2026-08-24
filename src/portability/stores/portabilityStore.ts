import { ref } from "vue";
import { defineStore } from "pinia";

import {
  characterPortabilityRepository,
  PortableCharacterCollisionError,
} from "../../db/repositories/characterPortabilityRepository";
import {
  createPortableCharacterFilename,
  createPortableCharacterPackage,
  parsePortableCharacterPackageText,
  PortableCharacterPackageError,
  serializePortableCharacterPackage,
} from "../portableCharacterPackage";

export type ImportStatus = "idle" | "importing" | "success" | "error";

export interface CharacterExportResult {
  readonly characterId: string;
  readonly characterName: string;
  readonly hasCreationSession: boolean;
  readonly filename: string;
  readonly mimeType: "application/json;charset=utf-8";
  readonly text: string;
}

export interface CharacterImportResult {
  readonly characterId: string;
  readonly characterName: string;
  readonly hasCreationSession: boolean;
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const usePortabilityStore = defineStore("portability", () => {
  const importStatus = ref<ImportStatus>("idle");
  const importMessage = ref("");

  function resetImportStatus(): void {
    if (importStatus.value === "importing") return;
    importStatus.value = "idle";
    importMessage.value = "";
  }

  async function exportCharacter(characterId: string): Promise<CharacterExportResult> {
    const source = await characterPortabilityRepository.readCharacterPackageData(characterId);
    const portablePackage = createPortableCharacterPackage(
      source.character,
      source.creationSession,
    );
    return {
      characterId: source.character.id,
      characterName: source.character.name,
      hasCreationSession: source.creationSession !== undefined,
      filename: createPortableCharacterFilename(source.character),
      mimeType: "application/json;charset=utf-8",
      text: serializePortableCharacterPackage(portablePackage),
    };
  }

  async function importCharacterText(text: string): Promise<CharacterImportResult> {
    importStatus.value = "importing";
    importMessage.value = "";
    try {
      const portablePackage = parsePortableCharacterPackageText(text);
      const imported = await characterPortabilityRepository.importCharacterPackage(portablePackage);
      const result: CharacterImportResult = {
        characterId: imported.character.id,
        characterName: imported.character.name,
        hasCreationSession: imported.creationSession !== undefined,
      };
      importStatus.value = "success";
      importMessage.value = imported.creationSession
        ? `已导入调查员“${result.characterName}”并恢复建卡进度。`
        : `已导入人物卡“${result.characterName}”；该文件不含建卡进度。`;
      return result;
    } catch (error: unknown) {
      importStatus.value = "error";
      importMessage.value = error instanceof PortableCharacterPackageError ||
        error instanceof PortableCharacterCollisionError
        ? error.message
        : `人物文件写入本地数据库失败：${readableError(error, "未知错误")}`;
      throw error;
    }
  }

  return {
    importStatus,
    importMessage,
    resetImportStatus,
    exportCharacter,
    importCharacterText,
  };
});
