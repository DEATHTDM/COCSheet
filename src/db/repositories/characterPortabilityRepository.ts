import type { Character } from "../../coc7/types/character";
import { characterSchema } from "../../coc7/types/character";
import type { CreationSession } from "../../creation/types/creationSession";
import { creationSessionSchema } from "../../creation/types/creationSession";
import type { PortableCharacterPackageV1 } from "../../portability/types/portableCharacterPackage";
import { db, type COCSheetDatabase } from "../database";
import {
  characterRecordSchema,
  creationSessionRecordSchema,
  type CharacterRecord,
  type CreationSessionRecord,
} from "../records";

export interface PortableCharacterDomainData {
  readonly character: Character;
  readonly creationSession?: CreationSession;
}

export interface ImportedPortableCharacterRecords {
  readonly character: CharacterRecord;
  readonly creationSession?: CreationSessionRecord;
}

export class PortableCharacterCollisionError extends Error {
  constructor() {
    super("本地已经有这张调查员人物卡。为保护现有资料，本次没有导入；请保留其中一份后再重试。");
    this.name = "PortableCharacterCollisionError";
  }
}

export class CharacterPortabilityRepository {
  constructor(
    private readonly database: COCSheetDatabase = db,
    private readonly now: () => number = Date.now,
  ) {}

  async readCharacterPackageData(characterId: string): Promise<PortableCharacterDomainData> {
    return this.database.transaction(
      "r",
      [this.database.characters, this.database.creationSessions],
      async () => {
        const characterRecord = await this.database.characters.get(characterId);
        if (!characterRecord) throw new Error(`调查员不存在：${characterId}`);
        const sessionRecord = await this.database.creationSessions.get(characterId);
        const character = characterRecordSchema.parse(characterRecord).data;
        const creationSession = sessionRecord === undefined
          ? undefined
          : creationSessionRecordSchema.parse(sessionRecord).data;
        return {
          character,
          ...(creationSession ? { creationSession } : {}),
        };
      },
    );
  }

  async importCharacterPackage(
    portablePackage: PortableCharacterPackageV1,
  ): Promise<ImportedPortableCharacterRecords> {
    const character = characterSchema.parse(portablePackage.character);
    const creationSession = portablePackage.creationSession === undefined
      ? undefined
      : creationSessionSchema.parse(portablePackage.creationSession);
    if (
      creationSession &&
      (creationSession.characterId !== character.id || creationSession.settingId !== character.settingId)
    ) {
      throw new Error("调查员与建卡会话不属于同一人物文件");
    }

    const importedAt = this.now();
    const characterRecord = characterRecordSchema.parse({
      id: character.id,
      version: 1,
      name: character.name,
      settingId: character.settingId,
      createdAt: importedAt,
      updatedAt: importedAt,
      data: character,
    });
    const sessionRecord = creationSession === undefined
      ? undefined
      : creationSessionRecordSchema.parse({
        characterId: creationSession.characterId,
        version: 1,
        updatedAt: importedAt,
        data: creationSession,
      });

    await this.database.transaction(
      "rw",
      [this.database.characters, this.database.creationSessions],
      async () => {
        const [existingCharacter, existingSession] = await Promise.all([
          this.database.characters.get(character.id),
          this.database.creationSessions.get(character.id),
        ]);
        if (existingCharacter || existingSession) throw new PortableCharacterCollisionError();
        await this.database.characters.add(characterRecord);
        if (sessionRecord) await this.database.creationSessions.add(sessionRecord);
      },
    );

    return {
      character: characterRecord,
      ...(sessionRecord ? { creationSession: sessionRecord } : {}),
    };
  }
}

export const characterPortabilityRepository = new CharacterPortabilityRepository();
