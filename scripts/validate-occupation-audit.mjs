import fs from "node:fs/promises";

const inventoryPath = new URL("../docs/data/STANDARD_OCCUPATION_OFFICIAL_INVENTORY.csv", import.meta.url);
const crosswalkPath = new URL("../docs/data/STANDARD_OCCUPATION_EXCEL_CROSSWALK.csv", import.meta.url);
const productionModulePaths = [
  new URL("../src/content/standard/occupations.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch2a.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch2b.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch2-pressure.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch3a.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch3b.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch3c.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch3d.ts", import.meta.url),
  new URL("../src/content/standard/occupations/batch3e-criminal.ts", import.meta.url),
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function recordsFromCsv(text, label) {
  const rows = parseCsv(text);
  const headers = rows.shift();
  if (!headers || headers.length === 0) throw new Error(`${label}: missing header`);
  for (const [index, row] of rows.entries()) {
    if (row.length !== headers.length) {
      throw new Error(`${label}: row ${index + 2} has ${row.length} fields; expected ${headers.length}`);
    }
  }
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUnique(records, key, label) {
  const values = records.map((record) => record[key]);
  assert(values.every(Boolean), `${label}: ${key} contains a blank value`);
  assert(new Set(values).size === values.length, `${label}: ${key} contains duplicates`);
}

function assertRequired(records, keys, label) {
  for (const [index, record] of records.entries()) {
    for (const key of keys) {
      assert(record[key]?.trim(), `${label}: row ${index + 2} has a blank ${key}`);
    }
  }
}

const inventory = recordsFromCsv(await fs.readFile(inventoryPath, "utf8"), "official inventory");
const crosswalk = recordsFromCsv(await fs.readFile(crosswalkPath, "utf8"), "Excel crosswalk");
const productionModuleTexts = await Promise.all(
  productionModulePaths.map((path) => fs.readFile(path, "utf8")),
);
const batch3cModuleText = productionModuleTexts.at(-3) ?? "";
const batch3dModuleText = productionModuleTexts.at(-2) ?? "";
const batch3eModuleText = productionModuleTexts.at(-1) ?? "";
const actualProductionIds = new Set(productionModuleTexts.flatMap((text) =>
  [...text.matchAll(/defineOccupation\(\s*\r?\n\s*"([a-z0-9-]+)"/g)].map((match) => match[1])),
);

assert(inventory.length === 142, `official inventory: expected 142 rows, found ${inventory.length}`);
assertUnique(inventory, "source_entry_id", "official inventory");
assertRequired(inventory, [
  "source_entry_id",
  "source_id",
  "source_title",
  "source_page",
  "official_name_zh",
  "official_name_en",
  "normalized_family_key",
  "credit_rating",
  "point_formula",
  "requirements_fingerprint",
  "mechanical_comparison",
  "implementation_status",
  "recommended_batch",
], "official inventory");
assert(inventory.filter((row) => row.source_id === "coc7-keeper-rulebook-40th-zh").length === 28,
  "official inventory: Keeper source-entry count must be 28");
assert(inventory.filter((row) => row.source_id === "coc7-investigator-handbook-zh-1-21").length === 114,
  "official inventory: Handbook source-entry count must be 114");
assert(new Set(inventory.map((row) => row.normalized_family_key)).size === 91,
  "official inventory: canonical-family count must be 91");

const implementationStatuses = new Set([
  "production-pilot",
  "production-batch-1",
  "production-batch-2",
  "production-batch-3",
  "pending",
  "needs-review",
]);
assert(inventory.every((row) => implementationStatuses.has(row.implementation_status)),
  "official inventory: illegal implementation_status");
assert(inventory.filter((row) => row.implementation_status === "production-pilot").length === 22,
  "official inventory: pilot must map 22 source entries");
const needsReviewRows = inventory.filter((row) => row.implementation_status === "needs-review");
const needsReviewFamilies = new Set(needsReviewRows.map((row) => row.normalized_family_key));
assert(needsReviewRows.length === 3
    && needsReviewFamilies.size === 3
    && needsReviewFamilies.has("deprogrammer")
    && needsReviewFamilies.has("white-collar-worker")
    && needsReviewFamilies.has("criminal"),
  "official inventory: needs-review must contain the two Engine pressures and Clerk / Executive source ambiguity");
const deprogrammerRows = needsReviewRows.filter((row) => row.normalized_family_key === "deprogrammer");
assert(deprogrammerRows.length === 1
    && deprogrammerRows[0].recommended_batch === "Batch 3 - complex / review"
    && deprogrammerRows[0].keeper_approval === "KP may allow Hypnosis to replace one occupation skill"
    && !deprogrammerRows[0].notes.includes("production_id="),
  "official inventory: Deprogrammer must retain its verified replacement pressure without a production mapping");
const keeperCriminal = needsReviewRows.find((row) => row.source_entry_id === "keeper-p40-criminal");
assert(keeperCriminal?.normalized_family_key === "criminal"
    && keeperCriminal.recommended_batch === "Batch 3 - complex / review"
    && keeperCriminal.notes ===
      "engine_pressure=choice-pool-with-repeatable-specialization-branch"
    && !actualProductionIds.has("criminal-keeper-rulebook"),
  "official inventory: Keeper Criminal must retain its repeatable specialization choice-pool pressure without a production definition");
const batch1Families = new Set(["clergy", "elected-official", "judge", "museum-curator"]);
const batch1Entries = inventory.filter((row) => batch1Families.has(row.normalized_family_key));
assert(batch1Entries.length === 5
    && batch1Entries.every((row) => row.implementation_status === "production-batch-1")
    && batch1Entries.every((row) => row.recommended_batch === "Batch 1 - simple")
    && batch1Entries.every((row) => row.notes === `production_id=${row.normalized_family_key}`)
    && new Set(batch1Entries.map((row) => row.normalized_family_key)).size === batch1Families.size,
  "official inventory: all four Batch 1 families must map to their canonical production ID and retain their batch assignment");
const batch2aProductionIds = new Map([
  ["agency-detective", "agency-detective"],
  ["alienist", "alienist"],
  ["antique-dealer", "antique-dealer"],
  ["archaeologist", "archaeologist"],
  ["architect", "architect"],
  ["asylum-attendant", "asylum-attendant"],
  ["big-game-hunter", "big-game-hunter"],
  ["book-dealer", "book-dealer"],
  ["explorer", "explorer"],
  ["firefighter", "firefighter"],
  ["forensic-surgeon", "forensic-surgeon"],
  ["lawyer", "lawyer"],
  ["nurse", "nurse"],
  ["police", "police-officer"],
]);
const batch2aSourceEntryIds = new Set([
  "keeper-p41-lawyer",
  "keeper-p41-police-officer",
  "handbook-71-agency-detective",
  "handbook-71-alienist",
  "handbook-71-antique-dealer",
  "handbook-72-archaeologist",
  "handbook-72-architect",
  "handbook-72-asylum-attendant",
  "handbook-73-big-game-hunter",
  "handbook-73-book-dealer",
  "handbook-80-explorer",
  "handbook-80-firefighter",
  "handbook-80-forensic-surgeon",
  "handbook-83-lawyer",
  "handbook-84-nurse",
  "handbook-87-uniformed-police-officer",
]);
const batch2aEntries = inventory.filter((row) => batch2aSourceEntryIds.has(row.source_entry_id));
assert(batch2aEntries.length === batch2aSourceEntryIds.size
    && batch2aEntries.every((row) => row.implementation_status === "production-batch-2")
    && batch2aEntries.every((row) => row.recommended_batch === "Batch 2 - structured")
    && batch2aEntries.every((row) => row.notes === `production_id=${batch2aProductionIds.get(row.normalized_family_key)}`)
    && new Set(batch2aEntries.map((row) => row.normalized_family_key)).size === batch2aProductionIds.size,
  "official inventory: all 14 Batch 2A families must have the correct production mapping and retain the formal Batch 2 assignment");
const batch2bProductionIds = new Map([
  ["gambler", "gambler"],
  ["gentleman-lady", "gentleman-lady"],
  ["hospital-orderly", "hospital-orderly"],
  ["mountain-climber", "mountain-climber"],
  ["musician", "musician"],
  ["outdoorsperson", "outdoorsperson"],
  ["pharmacist", "pharmacist"],
  ["psychiatrist", "psychiatrist"],
  ["salesperson", "salesperson"],
  ["shopkeeper", "shopkeeper"],
  ["spy", "spy"],
  ["stunt-performer", "stunt-performer"],
  ["undertaker", "undertaker"],
  ["union-activist", "union-activist"],
  ["zookeeper", "zookeeper"],
]);
const batch2bSourceEntryIds = new Set([
  "keeper-p41-musician",
  "handbook-81-gambler",
  "handbook-81-gentleman-lady",
  "handbook-82-hospital-orderly",
  "handbook-84-mountain-climber",
  "handbook-84-musician",
  "handbook-85-outdoorsman-outdoorswoman",
  "handbook-86-pharmacist",
  "handbook-88-psychiatrist",
  "handbook-89-salesperson",
  "handbook-90-shopkeeper",
  "handbook-90-spy",
  "handbook-90-stuntman",
  "handbook-91-undertaker",
  "handbook-91-union-activist",
  "handbook-93-zookeeper",
]);
const batch2bEntries = inventory.filter((row) => batch2bSourceEntryIds.has(row.source_entry_id));
assert(batch2bEntries.length === batch2bSourceEntryIds.size
    && batch2bEntries.every((row) => row.implementation_status === "production-batch-2")
    && batch2bEntries.every((row) => row.recommended_batch === "Batch 2 - structured")
    && batch2bEntries.every((row) => row.notes.includes(`production_id=${batch2bProductionIds.get(row.normalized_family_key)}`))
    && new Set(batch2bEntries.map((row) => row.normalized_family_key)).size === batch2bProductionIds.size,
  "official inventory: all successful Batch 2B families must have the correct production mapping and retain the formal Batch 2 assignment");
const batch2bFuzzyRequirementRows = inventory.filter((row) => [
  "keeper-p41-musician",
  "handbook-84-musician",
  "handbook-84-mountain-climber",
].includes(row.source_entry_id));
assert(batch2bFuzzyRequirementRows.length === 3
    && batch2bFuzzyRequirementRows.every((row) => row.fuzzy_requirement === "yes"),
  "official inventory: Musician instrument and Mountain Climber environment choices must retain fuzzy review semantics");
const batch2PressureProductionIds = new Map([
  ["bounty-hunter", "bounty-hunter"],
  ["cowboy", "cowboy"],
  ["tribe-member", "tribe-member"],
]);
const batch2PressureSourceEntryIds = new Set([
  "keeper-p41-tribe-member",
  "handbook-73-bounty-hunter",
  "handbook-74-cowboy-cowgirl",
  "handbook-91-tribe-member",
]);
const batch2PressureEntries = inventory.filter((row) =>
  batch2PressureSourceEntryIds.has(row.source_entry_id));
assert(batch2PressureEntries.length === batch2PressureSourceEntryIds.size
    && batch2PressureEntries.every((row) => row.implementation_status === "production-batch-2")
    && batch2PressureEntries.every((row) => row.recommended_batch === "Batch 2 - structured")
    && batch2PressureEntries.every((row) =>
      row.notes === `production_id=${batch2PressureProductionIds.get(row.normalized_family_key)}`)
    && new Set(batch2PressureEntries.map((row) => row.normalized_family_key)).size ===
      batch2PressureProductionIds.size,
  "official inventory: resolved Batch 2 pressure families must have canonical production mappings");
assert(inventory.filter((row) => row.implementation_status === "production-batch-2").length ===
    batch2aSourceEntryIds.size + batch2bSourceEntryIds.size + batch2PressureSourceEntryIds.size,
  "official inventory: production-batch-2 must contain exactly 36 resolved Batch 2 source entries");
const batch3aProductionIdBySourceEntry = new Map([
  ["keeper-p40-athlete", "athlete"],
  ["keeper-p40-dilettante", "dilettante"],
  ["keeper-p40-drifter", "drifter"],
  ["keeper-p40-engineer", "engineer"],
  ["keeper-p40-entertainer", "entertainer-keeper-rulebook"],
  ["keeper-p40-farmer", "farmer"],
  ["handbook-70-acrobat", "acrobat"],
  ["handbook-71-animal-trainer", "animal-trainer"],
  ["handbook-72-athlete", "athlete"],
  ["handbook-73-bartender", "bartender"],
  ["handbook-73-boxer-wrestler", "boxer-wrestler"],
  ["handbook-74-butler-valet-maid", "butler-valet-maid"],
  ["handbook-74-craftsperson", "craftsperson"],
  ["handbook-77-cult-leader", "cult-leader"],
  ["handbook-78-designer", "designer"],
  ["handbook-78-dilettante", "dilettante"],
  ["handbook-78-diver", "diver"],
  ["handbook-78-drifter", "drifter"],
  ["handbook-79-editor", "editor"],
  ["handbook-79-engineer", "engineer"],
  ["handbook-79-entertainer", "entertainer-investigator-handbook"],
  ["handbook-80-farmer", "farmer"],
]);
const batch3aSourceEntryIds = new Set(batch3aProductionIdBySourceEntry.keys());
const batch3aEntries = inventory.filter((row) => batch3aSourceEntryIds.has(row.source_entry_id));
assert(batch3aEntries.length === batch3aSourceEntryIds.size
    && batch3aEntries.every((row) => row.implementation_status === "production-batch-3")
    && batch3aEntries.every((row) => row.recommended_batch === "Batch 3 - complex / review")
    && batch3aEntries.every((row) =>
      row.notes === `production_id=${batch3aProductionIdBySourceEntry.get(row.source_entry_id)}`)
    && new Set(batch3aEntries.map((row) => row.normalized_family_key)).size === 16
    && new Set(batch3aProductionIdBySourceEntry.values()).size === 17,
  "official inventory: all Batch 3A source entries must map to 17 production definitions across 16 families and retain the formal Batch 3 assignment");
const entertainerEntries = batch3aEntries.filter((row) => row.normalized_family_key === "entertainer");
assert(entertainerEntries.length === 2
    && entertainerEntries.every((row) => row.mechanical_comparison === "mechanical-variant-candidate")
    && entertainerEntries.every((row) => row.variant_candidate === "yes")
    && entertainerEntries.every((row) => row.canonical_family_candidate === "entertainer"),
  "official inventory: Entertainer source rows must retain their corrected mechanical variant classification");
assert(batch3aEntries.filter((row) => row.fuzzy_requirement === "yes").length === 16,
  "official inventory: all 16 Handbook Batch 3A source entries must retain fuzzy requirement classification");
const batch3bProductionIdBySourceEntry = new Map([
  ["keeper-p41-librarian", "librarian"],
  ["keeper-p41-parapsychologist", "parapsychologist"],
  ["keeper-p41-private-investigator", "private-investigator"],
  ["keeper-p41-zealot", "zealot"],
  ["handbook-80-federal-agent", "federal-agent"],
  ["handbook-80-foreign-correspondent", "foreign-correspondent"],
  ["handbook-81-hobo", "hobo"],
  ["handbook-83-librarian", "librarian"],
  ["handbook-83-mechanic-and-skilled-trades", "mechanic"],
  ["handbook-84-occultist", "occultist"],
  ["handbook-85-parapsychologist", "parapsychologist"],
  ["handbook-87-private-investigator", "private-investigator"],
  ["handbook-88-prospector", "prospector"],
  ["handbook-88-prostitute", "sex-worker"],
  ["handbook-88-psychologist-psychoanalyst", "psychologist-psychoanalyst"],
  ["handbook-89-researcher", "researcher"],
  ["handbook-89-scientist", "scientist"],
  ["handbook-90-secretary", "secretary"],
  ["handbook-91-92-waitress-waiter", "waiter"],
  ["handbook-93-zealot", "zealot"],
]);
const batch3bSourceEntryIds = new Set(batch3bProductionIdBySourceEntry.keys());
const batch3bEntries = inventory.filter((row) => batch3bSourceEntryIds.has(row.source_entry_id));
assert(batch3bEntries.length === batch3bSourceEntryIds.size
    && batch3bEntries.every((row) => row.implementation_status === "production-batch-3")
    && batch3bEntries.every((row) => row.recommended_batch === "Batch 3 - complex / review")
    && batch3bEntries.every((row) =>
      row.notes === `production_id=${batch3bProductionIdBySourceEntry.get(row.source_entry_id)}`)
    && new Set(batch3bEntries.map((row) => row.normalized_family_key)).size === 16
    && new Set(batch3bProductionIdBySourceEntry.values()).size === 16,
  "official inventory: all Batch 3B source entries must map to 16 canonical production definitions and retain the formal Batch 3 assignment");
const batch3bCrossSourceFamilies = new Set([
  "librarian",
  "parapsychologist",
  "private-investigator",
  "zealot",
]);
for (const family of batch3bCrossSourceFamilies) {
  const rows = batch3bEntries.filter((row) => row.normalized_family_key === family);
  assert(rows.length === 2
      && rows.every((row) => row.mechanical_comparison === "canonical-match-across-sources")
      && rows.every((row) => row.variant_candidate === "no")
      && rows.every((row) => row.notes === `production_id=${family}`),
    `official inventory: ${family} must retain one canonical cross-source production mapping`);
}
assert(batch3bEntries.filter((row) => row.fuzzy_requirement === "yes").length === 17,
  "official inventory: Batch 3B must retain the 17 audited fuzzy source rows");
const batch3cProductionIdBySourceEntry = new Map([
  ["keeper-p41-hacker", "computer-professional-hacker"],
  ["keeper-p41-military-officer", "military-officer-keeper-rulebook"],
  ["handbook-71-stage-actor", "actor-stage"],
  ["handbook-71-film-star", "actor-film-star"],
  ["handbook-74-computer-programmer-technician", "computer-professional-programmer-technician"],
  ["handbook-74-hacker", "computer-professional-hacker"],
  ["handbook-79-chauffeur", "driver-chauffeur"],
  ["handbook-79-driver", "driver-general"],
  ["handbook-79-taxi-driver", "driver-taxi"],
  ["handbook-81-gangster-boss", "gangster-boss"],
  ["handbook-81-gangster-underling", "gangster-underling"],
  ["handbook-83-military-officer", "military-officer-investigator-handbook"],
]);
const batch3cVariantFamilyByProductionId = new Map([
  ["actor-stage", "actor"],
  ["actor-film-star", "actor"],
  ["computer-professional-programmer-technician", "computer-professional"],
  ["computer-professional-hacker", "computer-professional"],
  ["driver-chauffeur", "driver"],
  ["driver-general", "driver"],
  ["driver-taxi", "driver"],
  ["gangster-boss", "gangster"],
  ["gangster-underling", "gangster"],
  ["military-officer-keeper-rulebook", "military-officer"],
  ["military-officer-investigator-handbook", "military-officer"],
]);
const batch3cSourceEntryIds = new Set(batch3cProductionIdBySourceEntry.keys());
const batch3cEntries = inventory.filter((row) => batch3cSourceEntryIds.has(row.source_entry_id));
assert(batch3cEntries.length === 12
    && batch3cEntries.every((row) => row.implementation_status === "production-batch-3")
    && batch3cEntries.every((row) => row.recommended_batch === "Batch 3 - complex / review")
    && batch3cEntries.every((row) =>
      row.notes === `production_id=${batch3cProductionIdBySourceEntry.get(row.source_entry_id)}`)
    && batch3cEntries.every((row) =>
      row.mechanical_comparison.includes("mechanical-variant-candidate"))
    && batch3cEntries.every((row) => row.variant_candidate === "yes")
    && new Set(batch3cEntries.map((row) => row.normalized_family_key)).size === 5
    && new Set(batch3cProductionIdBySourceEntry.values()).size === 11,
  "official inventory: all 12 Batch 3C source rows must map to 11 mechanical variants across 5 families");
assert(batch3cProductionIdBySourceEntry.get("keeper-p41-hacker") ===
    batch3cProductionIdBySourceEntry.get("handbook-74-hacker"),
  "official inventory: Keeper and Handbook Hacker must map to the same production variant");
for (const [productionId, family] of batch3cVariantFamilyByProductionId) {
  const startPattern = new RegExp(`defineOccupation\\(\\s*"${productionId}"`);
  const startMatch = startPattern.exec(batch3cModuleText);
  assert(startMatch, `production Batch 3C: missing ${productionId}`);
  const nextStart = batch3cModuleText.indexOf("defineOccupation(", startMatch.index + startMatch[0].length);
  const block = batch3cModuleText.slice(startMatch.index, nextStart < 0 ? undefined : nextStart);
  assert(block.includes(`variantOf: "${family}"`),
    `production Batch 3C: ${productionId} must retain variantOf=${family}`);
}
const batch3dProductionIdBySourceEntry = new Map([
  ["keeper-p41-pilot", "pilot-general"],
  ["handbook-82-laborer-unskilled", "laborer-unskilled"],
  ["handbook-82-lumberjack", "laborer-lumberjack"],
  ["handbook-83-miner", "laborer-miner"],
  ["handbook-86-photographer", "photographer-general"],
  ["handbook-86-photojournalist", "photographer-photojournalist"],
  ["handbook-87-pilot", "pilot-general"],
  ["handbook-87-aviator-stunt-pilot", "pilot-stunt"],
  ["handbook-89-sailor-naval", "sailor-naval"],
  ["handbook-89-sailor-commercial", "sailor-commercial"],
  ["handbook-93-middle-senior-manager", "white-collar-worker-middle-senior-manager"],
]);
const batch3dVariantFamilyByProductionId = new Map([
  ["laborer-unskilled", "laborer"],
  ["laborer-lumberjack", "laborer"],
  ["laborer-miner", "laborer"],
  ["photographer-general", "photographer"],
  ["photographer-photojournalist", "photographer"],
  ["pilot-general", "pilot"],
  ["pilot-stunt", "pilot"],
  ["sailor-naval", "sailor"],
  ["sailor-commercial", "sailor"],
  ["white-collar-worker-middle-senior-manager", "white-collar-worker"],
]);
const batch3dSourceEntryIds = new Set(batch3dProductionIdBySourceEntry.keys());
const batch3dEntries = inventory.filter((row) => batch3dSourceEntryIds.has(row.source_entry_id));
assert(batch3dEntries.length === 11
    && batch3dEntries.every((row) => row.implementation_status === "production-batch-3")
    && batch3dEntries.every((row) => row.recommended_batch === "Batch 3 - complex / review")
    && batch3dEntries.every((row) =>
      row.notes === `production_id=${batch3dProductionIdBySourceEntry.get(row.source_entry_id)}`)
    && batch3dEntries.every((row) =>
      row.mechanical_comparison.includes("mechanical-variant-candidate"))
    && batch3dEntries.every((row) => row.variant_candidate === "yes")
    && new Set(batch3dEntries.map((row) => row.normalized_family_key)).size === 5
    && new Set(batch3dProductionIdBySourceEntry.values()).size === 10,
  "official inventory: 11 successful Batch 3D source rows must map to 10 variants across 5 family identities");
assert(batch3dProductionIdBySourceEntry.get("keeper-p41-pilot") ===
    batch3dProductionIdBySourceEntry.get("handbook-87-pilot"),
  "official inventory: Keeper and Handbook Pilot must map to the same pilot-general variant");
assert(batch3dProductionIdBySourceEntry.get("handbook-87-aviator-stunt-pilot") === "pilot-stunt",
  "official inventory: Stunt Pilot must map to its independent pilot-stunt variant");
for (const [productionId, family] of batch3dVariantFamilyByProductionId) {
  const startPattern = new RegExp(`defineOccupation\\(\\s*"${productionId}"`);
  const startMatch = startPattern.exec(batch3dModuleText);
  assert(startMatch, `production Batch 3D: missing ${productionId}`);
  const nextStart = batch3dModuleText.indexOf("defineOccupation(", startMatch.index + startMatch[0].length);
  const block = batch3dModuleText.slice(startMatch.index, nextStart < 0 ? undefined : nextStart);
  assert(block.includes(`variantOf: "${family}"`),
    `production Batch 3D: ${productionId} must retain variantOf=${family}`);
}
const batch3eProductionIdBySourceEntry = new Map([
  ["handbook-75-assassin", "criminal-assassin"],
  ["handbook-75-bank-robber", "criminal-bank-robber"],
  ["handbook-75-bootlegger-thug", "criminal-bootlegger-thug"],
  ["handbook-75-burglar", "criminal-burglar"],
  ["handbook-75-conman", "criminal-conman"],
  ["handbook-75-criminal-freelance-solo", "criminal-freelance-solo"],
  ["handbook-76-gun-moll", "criminal-gun-moll"],
  ["handbook-76-fence", "criminal-fence"],
  ["handbook-76-forger-counterfeiter", "criminal-forger-counterfeiter"],
  ["handbook-76-smuggler", "criminal-smuggler"],
  ["handbook-76-street-punk", "criminal-street-punk"],
]);
const batch3eSourceEntryIds = new Set(batch3eProductionIdBySourceEntry.keys());
const batch3eEntries = inventory.filter((row) => batch3eSourceEntryIds.has(row.source_entry_id));
assert(batch3eEntries.length === 11
    && batch3eEntries.every((row) => row.implementation_status === "production-batch-3")
    && batch3eEntries.every((row) => row.recommended_batch === "Batch 3 - complex / review")
    && batch3eEntries.every((row) =>
      row.notes === `production_id=${batch3eProductionIdBySourceEntry.get(row.source_entry_id)}`)
    && batch3eEntries.every((row) => row.mechanical_comparison === "mechanical-variant-candidate")
    && batch3eEntries.every((row) => row.variant_candidate === "yes")
    && new Set(batch3eEntries.map((row) => row.normalized_family_key)).size === 1
    && new Set(batch3eProductionIdBySourceEntry.values()).size === 11,
  "official inventory: all 11 Handbook Criminal source rows must map to independent production variants");
for (const productionId of batch3eProductionIdBySourceEntry.values()) {
  const startPattern = new RegExp(`defineOccupation\\(\\s*"${productionId}"`);
  const startMatch = startPattern.exec(batch3eModuleText);
  assert(startMatch, `production Batch 3E: missing ${productionId}`);
  const nextStart = batch3eModuleText.indexOf("defineOccupation(", startMatch.index + startMatch[0].length);
  const block = batch3eModuleText.slice(startMatch.index, nextStart < 0 ? undefined : nextStart);
  assert(block.includes('variantOf: "criminal"'),
    `production Batch 3E: ${productionId} must retain variantOf=criminal`);
}
const ambiguousClerk = inventory.find((row) =>
  row.source_entry_id === "handbook-91-92-clerk-executive");
assert(ambiguousClerk?.implementation_status === "needs-review"
    && ambiguousClerk.variant_candidate === "yes"
    && ambiguousClerk.mechanical_comparison === "mechanical-variant-candidate"
    && ambiguousClerk.notes ===
      "source-semantic-ambiguity=Language is not disambiguated as Own or Other; production withheld"
    && !actualProductionIds.has("white-collar-worker-clerk-executive"),
  "official inventory: ambiguous Clerk / Executive Language must remain withheld without a production definition");
assert(inventory.filter((row) => row.implementation_status === "production-batch-3").length ===
    batch3aSourceEntryIds.size + batch3bSourceEntryIds.size + batch3cSourceEntryIds.size +
      batch3dSourceEntryIds.size + batch3eSourceEntryIds.size,
  "official inventory: production-batch-3 must contain exactly successful Batch 3A through Batch 3E source entries");
const policeDetectiveEntries = inventory.filter((row) => [
  "keeper-p41-police-detective",
  "handbook-87-police-detective",
].includes(row.source_entry_id));
assert(policeDetectiveEntries.length === 2
    && policeDetectiveEntries.every((row) => row.implementation_status === "production-pilot")
    && policeDetectiveEntries.every((row) => row.notes === "production_id=police-detective"),
  "official inventory: police-detective production mapping must remain unchanged");
const policeOfficerEntries = inventory.filter((row) => [
  "keeper-p41-police-officer",
  "handbook-87-uniformed-police-officer",
].includes(row.source_entry_id));
assert(policeOfficerEntries.length === 2
    && policeOfficerEntries.every((row) => row.implementation_status === "production-batch-2")
    && policeOfficerEntries.every((row) => row.notes === "production_id=police-officer"),
  "official inventory: both Police Officer source entries must map to police-officer");
const productionIds = new Set(
  inventory.flatMap((row) => row.notes.match(/production_id=([a-z0-9-]+)/)?.[1] ?? []),
);
const expectedProductionIds = new Set([
  "accountant",
  "agency-detective",
  "alienist",
  "antiquarian",
  "antique-dealer",
  "archaeologist",
  "architect",
  "artist",
  "asylum-attendant",
  "author",
  "big-game-hunter",
  "book-dealer",
  "clergy",
  "doctor-of-medicine",
  "elected-official",
  "explorer",
  "firefighter",
  "forensic-surgeon",
  "journalist-investigative-handbook",
  "journalist-keeper-rulebook",
  "journalist-reporter-handbook",
  "judge",
  "laboratory-assistant",
  "lawyer",
  "missionary-investigator-handbook",
  "missionary-keeper-rulebook",
  "museum-curator",
  "nurse",
  "police-detective",
  "police-officer",
  "professor",
  "soldier-marine",
  "student-intern",
  "gambler",
  "gentleman-lady",
  "hospital-orderly",
  "mountain-climber",
  "musician",
  "outdoorsperson",
  "pharmacist",
  "psychiatrist",
  "salesperson",
  "shopkeeper",
  "spy",
  "stunt-performer",
  "undertaker",
  "union-activist",
  "zookeeper",
  "bounty-hunter",
  "acrobat",
  "animal-trainer",
  "athlete",
  "bartender",
  "boxer-wrestler",
  "butler-valet-maid",
  "craftsperson",
  "cult-leader",
  "designer",
  "dilettante",
  "diver",
  "drifter",
  "editor",
  "engineer",
  "entertainer-keeper-rulebook",
  "entertainer-investigator-handbook",
  "farmer",
  "federal-agent",
  "foreign-correspondent",
  "hobo",
  "librarian",
  "mechanic",
  "occultist",
  "parapsychologist",
  "private-investigator",
  "prospector",
  "psychologist-psychoanalyst",
  "researcher",
  "scientist",
  "secretary",
  "sex-worker",
  "waiter",
  "zealot",
  "cowboy",
  "tribe-member",
  "actor-stage",
  "actor-film-star",
  "computer-professional-programmer-technician",
  "computer-professional-hacker",
  "driver-chauffeur",
  "driver-general",
  "driver-taxi",
  "gangster-boss",
  "gangster-underling",
  "military-officer-keeper-rulebook",
  "military-officer-investigator-handbook",
  "laborer-unskilled",
  "laborer-lumberjack",
  "laborer-miner",
  "photographer-general",
  "photographer-photojournalist",
  "pilot-general",
  "pilot-stunt",
  "sailor-naval",
  "sailor-commercial",
  "white-collar-worker-middle-senior-manager",
  "criminal-assassin",
  "criminal-bank-robber",
  "criminal-bootlegger-thug",
  "criminal-burglar",
  "criminal-conman",
  "criminal-freelance-solo",
  "criminal-gun-moll",
  "criminal-fence",
  "criminal-forger-counterfeiter",
  "criminal-smuggler",
  "criminal-street-punk",
]);
assert(productionIds.size === expectedProductionIds.size,
  `official inventory: expected ${expectedProductionIds.size} mapped production IDs, found ${productionIds.size}`);
assert([...expectedProductionIds].every((id) => productionIds.has(id)),
  "official inventory: mapped production IDs do not match current production coverage");
assert(actualProductionIds.size === 116,
  `production modules: expected 116 definitions, found ${actualProductionIds.size}`);
assert(actualProductionIds.size === productionIds.size
    && [...actualProductionIds].every((id) => productionIds.has(id)),
  "official inventory: mapped production IDs do not match actual production modules");
const pendingPoliceEntries = inventory.filter((row) => row.normalized_family_key === "police"
  && row.implementation_status === "pending");
assert(pendingPoliceEntries.length === 0,
  "official inventory: police must have no pending source entry after Police Officer production import");

const familyRows = Map.groupBy(inventory, (row) => row.normalized_family_key);
const familyPlan = new Map();
for (const [family, rows] of familyRows) {
  const pendingBatches = new Set(rows
    .filter((row) => ![
      "production-pilot",
      "production-batch-1",
      "production-batch-2",
      "production-batch-3",
    ].includes(row.implementation_status))
    .map((row) => row.recommended_batch));
  assert(pendingBatches.size <= 1, `official inventory: ${family} is assigned to multiple pending batches`);
  familyPlan.set(family, pendingBatches.values().next().value ?? "already implemented");
}
const expectedFamilyPlanCounts = {
  "already implemented": 88,
  "Batch 2 - structured": 0,
  "Batch 3 - complex / review": 3,
};
for (const [batch, expected] of Object.entries(expectedFamilyPlanCounts)) {
  const actual = [...familyPlan.values()].filter((value) => value === batch).length;
  assert(actual === expected, `official inventory: ${batch} expected ${expected} families, found ${actual}`);
}

assert(crosswalk.length === 230, `Excel crosswalk: expected 230 rows, found ${crosswalk.length}`);
assertUnique(crosswalk, "excel_index", "Excel crosswalk");
assertRequired(crosswalk, [
  "excel_row",
  "excel_index",
  "excel_name",
  "normalized_name",
  "classification",
  "recommended_action",
  "confidence",
], "Excel crosswalk");
const indices = crosswalk.map((row) => Number(row.excel_index)).sort((left, right) => left - right);
assert(indices[0] === 1 && indices.at(-1) === 230, "Excel crosswalk: expected indices 1 through 230");
assert(indices.every((value, index) => value === index + 1), "Excel crosswalk: missing or non-contiguous index");
assert(crosswalk.filter((row) => Number(row.excel_index) >= 2).length === 229,
  "Excel crosswalk: expected 229 numbered occupations");
assert(crosswalk.filter((row) => row.classification === "custom-template").length === 1,
  "Excel crosswalk: expected one custom template");
assert(crosswalk
  .filter((row) => ["confirmed-standard", "confirmed-standard-variant"].includes(row.classification))
  .every((row) => row.official_family_key && row.matched_source_entries),
  "Excel crosswalk: confirmed Standard rows must map to an official family and source entry");

const classifications = new Set([
  "confirmed-standard",
  "confirmed-standard-variant",
  "standard-alias-or-duplicate",
  "confirmed-out-of-scope",
  "unverified",
  "custom-template",
]);
assert(crosswalk.every((row) => classifications.has(row.classification)),
  "Excel crosswalk: illegal classification");
const expectedClassifications = {
  "confirmed-standard": 77,
  "confirmed-standard-variant": 37,
  "standard-alias-or-duplicate": 0,
  "confirmed-out-of-scope": 115,
  "unverified": 0,
  "custom-template": 1,
};
for (const [classification, expected] of Object.entries(expectedClassifications)) {
  const actual = crosswalk.filter((row) => row.classification === classification).length;
  assert(actual === expected, `Excel crosswalk: ${classification} expected ${expected}, found ${actual}`);
}

console.log("Occupation audit CSV validation passed.");
console.log(`Official inventory: 142 rows, 91 families, 22 pilot, 5 Batch 1, ${batch2aSourceEntryIds.size + batch2bSourceEntryIds.size + batch2PressureSourceEntryIds.size} Batch 2, and ${batch3aSourceEntryIds.size + batch3bSourceEntryIds.size + batch3cSourceEntryIds.size + batch3dSourceEntryIds.size + batch3eSourceEntryIds.size} Batch 3 production source entries.`);
console.log("Excel crosswalk: 230 rows, 229 numbered occupations, 1 custom template.");
