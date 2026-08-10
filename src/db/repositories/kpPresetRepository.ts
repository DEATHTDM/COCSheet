import type { CreationPreset } from "../../creation/types/creationPreset";
import { creationPresetSchema } from "../../creation/types/creationPreset";
import { db, type COCSheetDatabase } from "../database";
import { kpPresetRecordSchema, type KPPresetRecord } from "../records";

export class KPPresetRepository {
  constructor(private readonly database: COCSheetDatabase = db) {}

  async create(preset: CreationPreset): Promise<KPPresetRecord> {
    const data = creationPresetSchema.parse(preset);
    const record = kpPresetRecordSchema.parse({
      id: data.id,
      version: 1,
      name: data.name,
      updatedAt: Date.now(),
      data,
    });

    await this.database.kpPresets.add(record);
    return record;
  }

  async getById(id: string): Promise<KPPresetRecord | undefined> {
    const record = await this.database.kpPresets.get(id);
    return record === undefined ? undefined : kpPresetRecordSchema.parse(record);
  }

  async list(): Promise<KPPresetRecord[]> {
    const records = await this.database.kpPresets.orderBy("updatedAt").reverse().toArray();
    return records.map((record) => kpPresetRecordSchema.parse(record));
  }

  async update(preset: CreationPreset): Promise<KPPresetRecord> {
    const data = creationPresetSchema.parse(preset);
    const existing = await this.getById(data.id);
    if (!existing) {
      throw new Error(`KP 建卡预设不存在：${data.id}`);
    }

    const record = kpPresetRecordSchema.parse({
      ...existing,
      name: data.name,
      updatedAt: Date.now(),
      data,
    });
    await this.database.kpPresets.put(record);
    return record;
  }

  async remove(id: string): Promise<void> {
    await this.database.kpPresets.delete(id);
  }
}

export const kpPresetRepository = new KPPresetRepository();
