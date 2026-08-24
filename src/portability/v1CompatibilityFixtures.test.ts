// @vitest-environment jsdom

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import characterFixtureText from "../../tests/fixtures/v1/cocsheet-character-v1.json?raw";
import shareFixtureToken from "../../tests/fixtures/v1/cocsheet-kp-preset-share-v1.txt?raw";
import libraryFixtureText from "../../tests/fixtures/v1/cocsheet-library-v1.json?raw";
import { db } from "../db/database";
import { characterPortabilityRepository } from "../db/repositories/characterPortabilityRepository";
import { libraryPortabilityRepository } from "../db/repositories/libraryPortabilityRepository";
import { decodeKPPresetShareToken } from "../kp/presets/presetShare";
import { parsePortableCharacterPackageText } from "./portableCharacterPackage";
import { parsePortableLibraryPackageText } from "./portableLibraryPackage";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("fixed historical v1 fixtures", () => {
  it("parses and imports the committed cocsheet-character v1 fixture", async () => {
    const portablePackage = parsePortableCharacterPackageText(characterFixtureText);
    expect(portablePackage.character.name).toBe("兼容性测试调查员");
    await characterPortabilityRepository.importCharacterPackage(portablePackage);
    expect((await db.characters.get(portablePackage.character.id))?.data)
      .toEqual(portablePackage.character);
  });

  it("parses and imports the committed library v1 fixture without normalizing historical identities", async () => {
    const portablePackage = parsePortableLibraryPackageText(libraryFixtureText);
    expect(portablePackage.characterEntries[0]?.character.settingId).toBe("gaslight");
    expect(portablePackage.characterEntries[0]?.creationSession?.settingId).toBe("gaslight");
    expect(portablePackage.kpPresets[0]?.settingId).toBe("regency");
    await libraryPortabilityRepository.importLibraryPackage(portablePackage);
    expect((await db.characters.get("d2000000-0000-4000-8000-000000000002"))?.data.settingId)
      .toBe("gaslight");
    expect((await db.kpPresets.get("d2200000-0000-4000-8000-000000000002"))?.data.settingId)
      .toBe("regency");
  });

  it("decodes the committed already-encoded share v1 token", async () => {
    const preset = await decodeKPPresetShareToken(shareFixtureToken.trim());
    expect(preset).toEqual({
      version: 1,
      id: "d3000000-0000-4000-8000-000000000003",
      name: "固定分享兼容预设",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: "keeper-approval",
    });
  });
});
