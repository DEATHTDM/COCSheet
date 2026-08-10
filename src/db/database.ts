import Dexie, { type EntityTable } from "dexie";

import type { CharacterRecord, CreationSessionRecord, KPPresetRecord } from "./records";

export class COCSheetDatabase extends Dexie {
  readonly characters!: EntityTable<CharacterRecord, "id">;
  readonly creationSessions!: EntityTable<CreationSessionRecord, "characterId">;
  readonly kpPresets!: EntityTable<KPPresetRecord, "id">;

  constructor(name = "COCSheet") {
    super(name);

    this.version(1).stores({
      characters: "id, updatedAt, settingId, name",
      creationSessions: "characterId, updatedAt",
      kpPresets: "id, updatedAt, name",
    });
  }
}

export const db = new COCSheetDatabase();
