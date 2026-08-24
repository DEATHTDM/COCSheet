import { ref } from "vue";
import { defineStore } from "pinia";

import { useCharacterStore } from "../../app/stores/characterStore";
import { useCreationStore } from "../../creation/stores/creationStore";
import {
  libraryPortabilityRepository,
  LibraryCollisionError,
  LibraryExportIntegrityError,
  LibraryRecordValidationError,
  type LibraryImportSummary,
} from "../../db/repositories/libraryPortabilityRepository";
import { usePresetStore } from "../../kp/presets/presetStore";
import {
  createPortableLibraryFilename,
  createPortableLibraryPackage,
  parsePortableLibraryPackageText,
  PortableLibraryPackageError,
  serializePortableLibraryPackage,
} from "../portableLibraryPackage";

export type LibraryImportStatus = "idle" | "importing" | "success" | "error";

export interface LibraryExportResult extends LibraryImportSummary {
  readonly filename: string;
  readonly mimeType: "application/json;charset=utf-8";
  readonly text: string;
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function summaryMessage(summary: LibraryImportSummary): string {
  return `已导入 ${summary.characterCount} 名调查员、${summary.sessionCount} 份建卡进度和 ${summary.kpPresetCount} 个建卡预设。`;
}

export const useLibraryPortabilityStore = defineStore("library-portability", () => {
  const importStatus = ref<LibraryImportStatus>("idle");
  const importMessage = ref("");

  function resetImportStatus(): void {
    if (importStatus.value === "importing") return;
    importStatus.value = "idle";
    importMessage.value = "";
  }

  async function exportLibrary(): Promise<LibraryExportResult> {
    try {
      const source = await libraryPortabilityRepository.readLibraryPackageData();
      const portablePackage = createPortableLibraryPackage(
        source.characterEntries,
        source.kpPresets,
      );
      return {
        characterCount: portablePackage.characterEntries.length,
        sessionCount: portablePackage.characterEntries.filter(
          (entry) => entry.creationSession !== undefined,
        ).length,
        kpPresetCount: portablePackage.kpPresets.length,
        filename: createPortableLibraryFilename(portablePackage.exportedAt),
        mimeType: "application/json;charset=utf-8",
        text: serializePortableLibraryPackage(portablePackage),
      };
    } catch (error: unknown) {
      if (
        error instanceof LibraryExportIntegrityError ||
        error instanceof LibraryRecordValidationError ||
        error instanceof PortableLibraryPackageError
      ) {
        throw error;
      }
      throw new Error(`完整备份生成失败：${readableError(error, "未知错误")}`);
    }
  }

  async function importLibraryText(text: string): Promise<LibraryImportSummary> {
    importStatus.value = "importing";
    importMessage.value = "";

    let summary: LibraryImportSummary;
    try {
      const portablePackage = parsePortableLibraryPackageText(text);
      summary = await libraryPortabilityRepository.importLibraryPackage(portablePackage);
    } catch (error: unknown) {
      importStatus.value = "error";
      importMessage.value = error instanceof PortableLibraryPackageError ||
        error instanceof LibraryCollisionError
        ? error.message
        : `完整备份写入本地数据库失败：${readableError(error, "未知错误")}`;
      throw error;
    }

    try {
      await Promise.all([
        useCharacterStore().loadList(),
        useCreationStore().loadSessionSteps(),
        usePresetStore().loadList(),
      ]);
      importMessage.value = summaryMessage(summary);
    } catch (error: unknown) {
      importMessage.value = `${summaryMessage(summary)} 但界面刷新失败，请重新载入页面：${readableError(error, "未知错误")}`;
    }
    importStatus.value = "success";
    return summary;
  }

  return {
    importStatus,
    importMessage,
    resetImportStatus,
    exportLibrary,
    importLibraryText,
  };
});
