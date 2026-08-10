import type { Character } from "../../coc7/types/character";
import { characterSchema } from "../../coc7/types/character";
import type { CreationSession } from "../../creation/types/creationSession";
import { creationSessionSchema } from "../../creation/types/creationSession";
import { db, type COCSheetDatabase } from "../database";
import {
  characterRecordSchema,
  creationSessionRecordSchema,
  type CharacterRecord,
  type CreationSessionRecord,
} from "../records";

export interface CreationStartRecords {
  readonly character: CharacterRecord;
  readonly session: CreationSessionRecord;
}

export class CreationWorkflowRepository {
  constructor(private readonly database: COCSheetDatabase = db) {}

  async createCharacterWithSession(
    character: Character,
    session: CreationSession,
  ): Promise<CreationStartRecords> {
    const parsedCharacter = characterSchema.parse(character);
    const parsedSession = creationSessionSchema.parse(session);

    if (
      parsedCharacter.id !== parsedSession.characterId ||
      parsedCharacter.settingId !== parsedSession.settingId
    ) {
      throw new Error("调查员与建卡会话不属于同一创建流程");
    }

    const now = Date.now();
    const characterRecord = characterRecordSchema.parse({
      id: parsedCharacter.id,
      version: 1,
      name: parsedCharacter.name,
      settingId: parsedCharacter.settingId,
      createdAt: now,
      updatedAt: now,
      data: parsedCharacter,
    });
    const sessionRecord = creationSessionRecordSchema.parse({
      characterId: parsedSession.characterId,
      version: 1,
      updatedAt: now,
      data: parsedSession,
    });

    await this.database.transaction(
      "rw",
      [this.database.characters, this.database.creationSessions],
      async () => {
        await this.database.characters.add(characterRecord);
        await this.database.creationSessions.add(sessionRecord);
      },
    );

    return { character: characterRecord, session: sessionRecord };
  }
}

export const creationWorkflowRepository = new CreationWorkflowRepository();
