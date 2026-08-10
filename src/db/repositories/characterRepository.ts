import type { Character } from "../../coc7/types/character";
import { characterSchema } from "../../coc7/types/character";
import { db, type COCSheetDatabase } from "../database";
import { characterRecordSchema, type CharacterRecord } from "../records";

export class CharacterRepository {
  constructor(private readonly database: COCSheetDatabase = db) {}

  async create(character: Character): Promise<CharacterRecord> {
    const data = characterSchema.parse(character);
    const now = Date.now();
    const record = characterRecordSchema.parse({
      id: data.id,
      version: 1,
      name: data.name,
      settingId: data.settingId,
      createdAt: now,
      updatedAt: now,
      data,
    });

    await this.database.characters.add(record);
    return record;
  }

  async getById(id: string): Promise<CharacterRecord | undefined> {
    const record = await this.database.characters.get(id);
    return record === undefined ? undefined : characterRecordSchema.parse(record);
  }

  async list(): Promise<CharacterRecord[]> {
    const records = await this.database.characters.orderBy("updatedAt").reverse().toArray();
    return records.map((record) => characterRecordSchema.parse(record));
  }

  async update(character: Character): Promise<CharacterRecord> {
    const data = characterSchema.parse(character);
    const existing = await this.getById(data.id);
    if (!existing) {
      throw new Error(`调查员不存在：${data.id}`);
    }

    const record = characterRecordSchema.parse({
      ...existing,
      name: data.name,
      settingId: data.settingId,
      updatedAt: Date.now(),
      data,
    });
    await this.database.characters.put(record);
    return record;
  }

  async remove(id: string): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.characters, this.database.creationSessions],
      async () => {
        await this.database.characters.delete(id);
        await this.database.creationSessions.delete(id);
      },
    );
  }
}

export const characterRepository = new CharacterRepository();
