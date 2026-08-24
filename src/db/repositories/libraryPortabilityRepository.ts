import type { CreationPreset } from "../../creation/types/creationPreset";
import { creationPresetSchema } from "../../creation/types/creationPreset";
import type { PortableLibraryPackageV1 } from "../../portability/types/portableLibraryPackage";
import { portableLibraryPackageV1Schema } from "../../portability/types/portableLibraryPackage";
import { db, type COCSheetDatabase } from "../database";
import {
  characterRecordSchema,
  creationSessionRecordSchema,
  kpPresetRecordSchema,
  type CharacterRecord,
  type CreationSessionRecord,
  type KPPresetRecord,
} from "../records";

export interface LibraryDomainData {
  readonly characterEntries: PortableLibraryPackageV1["characterEntries"];
  readonly kpPresets: CreationPreset[];
}

export interface LibraryImportSummary {
  readonly characterCount: number;
  readonly sessionCount: number;
  readonly kpPresetCount: number;
}

export type LibraryCollisionKind = "character" | "orphan-session" | "kp-preset";

export class LibraryCollisionError extends Error {
  constructor(readonly kind: LibraryCollisionKind, readonly entityId: string) {
    const messages: Record<LibraryCollisionKind, string> = {
      character: "本地已经有备份中的一张调查员人物卡。为保护现有资料，整份完整备份未导入。",
      "orphan-session": "本地已有一份无法对应到人物卡的建卡进度。为保护现有资料，整份完整备份未导入。",
      "kp-preset": "本地已经有备份中的一个建卡预设。为保护现有资料，整份完整备份未导入。",
    };
    super(messages[kind]);
    this.name = "LibraryCollisionError";
  }
}

export class LibraryExportIntegrityError extends Error {
  constructor(readonly characterId: string) {
    super("本地存在没有对应人物卡的建卡进度，无法生成完整备份。请先恢复对应人物卡，再重试。");
    this.name = "LibraryExportIntegrityError";
  }
}

export class LibraryRecordValidationError extends Error {
  constructor(readonly recordKind: "character" | "creation-session" | "kp-preset") {
    const labels = {
      character: "调查员",
      "creation-session": "建卡进度",
      "kp-preset": "建卡预设",
    } as const;
    super(`本地存在无法验证的${labels[recordKind]}记录，无法生成完整备份。`);
    this.name = "LibraryRecordValidationError";
  }
}

export class LibraryPortabilityRepository {
  constructor(
    private readonly database: COCSheetDatabase = db,
    private readonly now: () => number = Date.now,
  ) {}

  async readLibraryPackageData(): Promise<LibraryDomainData> {
    return this.database.transaction(
      "r",
      [this.database.characters, this.database.creationSessions, this.database.kpPresets],
      async () => {
        const [rawCharacters, rawSessions, rawPresets] = await Promise.all([
          this.database.characters.toArray(),
          this.database.creationSessions.toArray(),
          this.database.kpPresets.toArray(),
        ]);
        const characters = rawCharacters.map((record) => {
          const parsed = characterRecordSchema.safeParse(record);
          if (!parsed.success) throw new LibraryRecordValidationError("character");
          return parsed.data;
        });
        const sessions = rawSessions.map((record) => {
          const parsed = creationSessionRecordSchema.safeParse(record);
          if (!parsed.success) throw new LibraryRecordValidationError("creation-session");
          return parsed.data;
        });
        const presets = rawPresets.map((record) => {
          const parsed = kpPresetRecordSchema.safeParse(record);
          if (!parsed.success) throw new LibraryRecordValidationError("kp-preset");
          return parsed.data;
        });

        const characterIds = new Set(characters.map((record) => record.id));
        const orphanSession = sessions.find((record) => !characterIds.has(record.characterId));
        if (orphanSession) throw new LibraryExportIntegrityError(orphanSession.characterId);
        const sessionsByCharacterId = new Map(
          sessions.map((record) => [record.characterId, record.data] as const),
        );
        return {
          characterEntries: characters.map((record) => {
            const creationSession = sessionsByCharacterId.get(record.id);
            return {
              character: record.data,
              ...(creationSession ? { creationSession } : {}),
            };
          }),
          kpPresets: presets.map((record) => record.data),
        };
      },
    );
  }

  async importLibraryPackage(
    portablePackage: PortableLibraryPackageV1,
  ): Promise<LibraryImportSummary> {
    const parsedPackage = portableLibraryPackageV1Schema.parse(portablePackage);
    const importedAt = this.now();
    const characterRecords: CharacterRecord[] = parsedPackage.characterEntries.map(({ character }) =>
      characterRecordSchema.parse({
        id: character.id,
        version: 1,
        name: character.name,
        settingId: character.settingId,
        createdAt: importedAt,
        updatedAt: importedAt,
        data: character,
      }));
    const sessionRecords: CreationSessionRecord[] = parsedPackage.characterEntries.flatMap(
      ({ creationSession }) => creationSession === undefined ? [] : [creationSessionRecordSchema.parse({
        characterId: creationSession.characterId,
        version: 1,
        updatedAt: importedAt,
        data: creationSession,
      })],
    );
    const presetRecords: KPPresetRecord[] = parsedPackage.kpPresets.map((preset) => {
      const data = creationPresetSchema.parse(preset);
      return kpPresetRecordSchema.parse({
        id: data.id,
        version: 1,
        name: data.name,
        updatedAt: importedAt,
        data,
      });
    });

    await this.database.transaction(
      "rw",
      [this.database.characters, this.database.creationSessions, this.database.kpPresets],
      async () => {
        for (const record of characterRecords) {
          if (await this.database.characters.get(record.id)) {
            throw new LibraryCollisionError("character", record.id);
          }
        }
        for (const record of characterRecords) {
          if (await this.database.creationSessions.get(record.id)) {
            throw new LibraryCollisionError("orphan-session", record.id);
          }
        }
        for (const record of presetRecords) {
          if (await this.database.kpPresets.get(record.id)) {
            throw new LibraryCollisionError("kp-preset", record.id);
          }
        }

        for (const record of characterRecords) await this.database.characters.add(record);
        for (const record of sessionRecords) await this.database.creationSessions.add(record);
        for (const record of presetRecords) await this.database.kpPresets.add(record);
      },
    );

    return {
      characterCount: characterRecords.length,
      sessionCount: sessionRecords.length,
      kpPresetCount: presetRecords.length,
    };
  }
}

export const libraryPortabilityRepository = new LibraryPortabilityRepository();
