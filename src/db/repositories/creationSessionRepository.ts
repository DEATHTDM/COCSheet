import type { CreationSession } from "../../creation/types/creationSession";
import { creationSessionSchema } from "../../creation/types/creationSession";
import { db, type COCSheetDatabase } from "../database";
import {
  creationSessionRecordSchema,
  type CreationSessionRecord,
} from "../records";

export class CreationSessionRepository {
  constructor(private readonly database: COCSheetDatabase = db) {}

  async create(session: CreationSession): Promise<CreationSessionRecord> {
    const data = creationSessionSchema.parse(session);
    const record = creationSessionRecordSchema.parse({
      characterId: data.characterId,
      version: 1,
      updatedAt: Date.now(),
      data,
    });

    await this.database.creationSessions.add(record);
    return record;
  }

  async getByCharacterId(characterId: string): Promise<CreationSessionRecord | undefined> {
    const record = await this.database.creationSessions.get(characterId);
    return record === undefined ? undefined : creationSessionRecordSchema.parse(record);
  }

  async list(): Promise<CreationSessionRecord[]> {
    const records = await this.database.creationSessions.orderBy("updatedAt").reverse().toArray();
    return records.map((record) => creationSessionRecordSchema.parse(record));
  }

  async update(session: CreationSession): Promise<CreationSessionRecord> {
    const data = creationSessionSchema.parse(session);
    const existing = await this.getByCharacterId(data.characterId);
    if (!existing) {
      throw new Error(`建卡会话不存在：${data.characterId}`);
    }

    const record = creationSessionRecordSchema.parse({
      ...existing,
      updatedAt: Date.now(),
      data,
    });
    await this.database.creationSessions.put(record);
    return record;
  }

  async remove(characterId: string): Promise<void> {
    await this.database.creationSessions.delete(characterId);
  }
}

export const creationSessionRepository = new CreationSessionRepository();
