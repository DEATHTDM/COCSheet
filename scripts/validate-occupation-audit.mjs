import fs from "node:fs/promises";

const inventoryPath = new URL("../docs/data/STANDARD_OCCUPATION_OFFICIAL_INVENTORY.csv", import.meta.url);
const crosswalkPath = new URL("../docs/data/STANDARD_OCCUPATION_EXCEL_CROSSWALK.csv", import.meta.url);

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
  "pending",
  "needs-review",
]);
assert(inventory.every((row) => implementationStatuses.has(row.implementation_status)),
  "official inventory: illegal implementation_status");
assert(inventory.filter((row) => row.implementation_status === "production-pilot").length === 22,
  "official inventory: pilot must map 22 source entries");
assert(inventory.filter((row) => row.implementation_status === "needs-review").length === 1
    && inventory.find((row) => row.implementation_status === "needs-review")?.normalized_family_key === "deprogrammer",
  "official inventory: Deprogrammer must be the sole needs-review family");
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
  ["bounty-hunter", "bounty-hunter"],
  ["cowboy", "cowboy"],
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
  "handbook-73-bounty-hunter",
  "handbook-74-cowboy-cowgirl",
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
  "official inventory: all 16 Batch 2A families must have the correct production mapping and retain the formal Batch 2 assignment");
assert(inventory.filter((row) => row.implementation_status === "production-batch-2").length === batch2aSourceEntryIds.size,
  "official inventory: production-batch-2 must currently contain exactly the Batch 2A source entries");
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
  "bounty-hunter",
  "clergy",
  "cowboy",
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
]);
assert(productionIds.size === expectedProductionIds.size,
  `official inventory: expected ${expectedProductionIds.size} mapped production IDs, found ${productionIds.size}`);
assert([...expectedProductionIds].every((id) => productionIds.has(id)),
  "official inventory: mapped production IDs do not match current production coverage");
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
    ].includes(row.implementation_status))
    .map((row) => row.recommended_batch));
  assert(pendingBatches.size <= 1, `official inventory: ${family} is assigned to multiple pending batches`);
  familyPlan.set(family, pendingBatches.values().next().value ?? "already implemented");
}
const expectedFamilyPlanCounts = {
  "already implemented": 31,
  "Batch 2 - structured": 16,
  "Batch 3 - complex / review": 44,
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
console.log("Official inventory: 142 rows, 91 families, 22 pilot, 5 Batch 1, and 18 Batch 2 production source entries.");
console.log("Excel crosswalk: 230 rows, 229 numbered occupations, 1 custom template.");
