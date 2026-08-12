# Standard Occupation Full Intake Audit

Last updated: 2026-08-12

## 1. Audit scope

This document records the completed Phase 5B-2-A Standard occupation intake boundary and tracks subsequent production-import batches. The frozen primary source system is:

- `coc7-keeper-rulebook-40th-zh`: 《克苏鲁的呼唤 40 周年纪念版》
- `coc7-investigator-handbook-zh-1-21`: 《克苏鲁的呼唤第七版调查员手册》

The official PDFs are the mechanical authority. `COC7空白卡CY23Final(1).xlsx` is used only as an intake checklist and crosswalk source. Batch 2A and Batch 2B completed the lossless imports supported by the prior Engine. The subsequent Engine-pressure cleanup added the minimal `one-branch` selector and moved `bounty-hunter`, `cowboy`, and `tribe-member` into production. Formal Phase 5B-2 Batch 2 is completed. Batch 3 is now in progress: the Batch 3A engineering sub-batch completed 16 canonical families without changing the formal `Batch 3 - complex / review` audit classification. Phase 5C has not started.

The full row-level results are in:

- `docs/data/STANDARD_OCCUPATION_OFFICIAL_INVENTORY.csv`
- `docs/data/STANDARD_OCCUPATION_EXCEL_CROSSWALK.csv`

`source_page` records printed source pages, never PDF viewer page numbers. A range is used when a title begins on one printed page and its mechanical fields continue on another.

## 2. Official inventory totals

| Measure | Count |
| --- | ---: |
| Keeper Rulebook source occupation entries | 28 |
| Investigator Handbook source occupation entries | 114 |
| Total official source occupation entries | 142 |
| Canonical family candidates after normalization | 91 |
| Families containing mechanical variants | 14 |
| Expected production definitions | 118 |
| Additional definitions above one-per-family | 27 |
| Definitions contained in the 14 variant families | 41 |

The 142 source entries are not 142 production definitions. Mechanically identical entries across the two official sources share one definition and retain both source references. Distinct formulas, Credit Rating ranges, deterministic requirements, cardinality, or approval semantics remain separate mechanics keys under a family.

## 3. Current production coverage

The merged Phase 5B-1 pilot plus Phase 5B-2 Batch 1, completed Batch 2, and Batch 3A cover:

| Measure | Covered | Total |
| --- | ---: | ---: |
| Canonical families touched | 63 | 91 |
| Fully implemented families | 63 | 91 |
| Production definitions | 67 | 118 expected |
| Official source entries mapped to those definitions | 85 | 142 |

The 85 source-entry rows map to 67 definitions because several canonical definitions retain matching Keeper Rulebook and Investigator Handbook references.

Those definitions touch and fully implement 63 families. Batch 3A added 16 canonical definitions after PDF re-verification; it did not change the Engine.

The mapped production IDs are:

- `accountant`
- `agency-detective`
- `alienist`
- `antiquarian`
- `antique-dealer`
- `archaeologist`
- `architect`
- `artist`
- `asylum-attendant`
- `author`
- `big-game-hunter`
- `book-dealer`
- `bounty-hunter`
- `clergy`
- `cowboy`
- `doctor-of-medicine`
- `elected-official`
- `explorer`
- `firefighter`
- `forensic-surgeon`
- `gambler`
- `gentleman-lady`
- `hospital-orderly`
- `journalist-keeper-rulebook`
- `journalist-investigative-handbook`
- `journalist-reporter-handbook`
- `judge`
- `laboratory-assistant`
- `lawyer`
- `museum-curator`
- `mountain-climber`
- `musician`
- `nurse`
- `outdoorsperson`
- `pharmacist`
- `police-detective`
- `police-officer`
- `professor`
- `psychiatrist`
- `salesperson`
- `shopkeeper`
- `soldier-marine`
- `spy`
- `stunt-performer`
- `student-intern`
- `tribe-member`
- `undertaker`
- `union-activist`
- `zookeeper`
- `acrobat`
- `animal-trainer`
- `athlete`
- `bartender`
- `boxer-wrestler`
- `butler-valet-maid`
- `craftsperson`
- `cult-leader`
- `designer`
- `dilettante`
- `diver`
- `drifter`
- `editor`
- `engineer`
- `entertainer`
- `farmer`
- `missionary-keeper-rulebook`
- `missionary-investigator-handbook`

Some inventory page ranges are finer-grained than the pilot's single-page `sourceRefs`. This is citation granularity, not a mechanical mismatch.

### PILOT BLOCKER

No pilot blockers found.

## 4. Excel workbook audit

The workbook was re-read directly rather than relying on the Phase 5B-1 report.

| Measure | Result |
| --- | --- |
| Workbook sheets | 13 |
| `职业列表` effective range | `A1:Q232` (232 rows × 17 columns) |
| Index `0` control row | 1, excluded from the crosswalk |
| Custom occupation template | 1, index `1` |
| Numbered occupation rows | 229, indices `2`–`230` |
| Crosswalk data rows | 230, including the custom template |
| Numbered rows with contacts | 165 |
| Rows with contacts including the custom template | 166 |

### Classification counts

| Classification | Count |
| --- | ---: |
| `confirmed-standard` | 77 |
| `confirmed-standard-variant` | 37 |
| `standard-alias-or-duplicate` | 0 |
| `confirmed-out-of-scope` | 115 |
| `unverified` | 0 |
| `custom-template` | 1 |

The 114 confirmed Standard rows are Excel indices `2`–`115` and map one-to-one to the 114 Investigator Handbook source entries. The 115 out-of-scope rows have explicit source hints:

- Investigator Companion: 41 rows, indices `116`–`156`.
- Japanese source systems and Japanese-specific expansions: 48 rows, indices `157`–`204`.
- Gaslight: 26 rows, indices `205`–`230`.

No Excel row is classified as `unverified`: every row outside the Handbook block carries an explicit non-Standard source hint. That does not verify its mechanics; it only provides sufficient evidence to exclude it from the frozen Standard intake.

### Excel mechanical deviations inside the confirmed Standard block

Two Excel rows do not mechanically match their official Handbook entries:

1. Index `8`, `动物训练师`: Excel replaces official Animal Handling with Psychology. The official entry retains both Natural World and Animal Handling.
2. Index `22`, `管家、男仆、女仆`: Excel adds Foreign Language and reduces the official two free personal/era selections to one.

These are crosswalk findings only. They do not affect the official inventory and must not be copied into future production data.

## 5. Duplicate-name audit

All six exact duplicate-name groups are category C: the first row is a confirmed Standard Handbook occupation, while the second row is an explicitly Gaslight occupation with different mechanics. None is an alias duplicate and none should be name-deduplicated across Settings.

| Name | Standard Excel index | Other Excel index | Conclusion |
| --- | ---: | ---: | --- |
| 艺术家 | 13 | 208 | C — same name, different Setting/source mechanics |
| 工匠 | 27 | 213 | C — same name, different Setting/source mechanics |
| 艺人 | 52 | 216 | C — same name, different Setting/source mechanics |
| 律师 | 72 | 222 | C — same name, different Setting/source mechanics |
| 私家侦探 | 91 | 219 | C — same name, different Setting/source mechanics |
| 科学家 | 101 | 226 | C — same name, different Setting/source mechanics |

## 6. Mechanical variant candidates

The audit finds 14 variant families. The full source-entry fingerprints and mechanics keys are in the official inventory CSV.

| Family | Expected mechanics | Reason to remain distinct |
| --- | ---: | --- |
| `actor` | 2 | Stage and film actors differ in CR, fixed skills, and free-pick cardinality. |
| `computer-professional` | 2 | Programmer/technician and hacker requirements differ; the core Hacker matches the Handbook Hacker. |
| `criminal` | 12 | The Keeper generic Criminal and 11 Handbook subtypes differ across CR, formula, requirements, and cardinality. |
| `driver` | 3 | Chauffeur, general driver, and taxi driver have different CR/formula/requirements. |
| `gangster` | 2 | Boss and underling differ in CR, formula, and requirements. |
| `journalist` | 3 | Keeper Journalist, Handbook Investigative Journalist, and Handbook Reporter have different deterministic requirements. |
| `laborer` | 3 | Unskilled laborer, lumberjack, and miner have different deterministic requirements. |
| `military-officer` | 2 | CR/formula match, but Keeper fixes Survival while the Handbook fixes First Aid. |
| `missionary` | 2 | Keeper uses `EDU*4`; Handbook uses `EDU*2+APP*2`. |
| `photographer` | 2 | Photographer and photojournalist differ in CR and requirements. |
| `pilot` | 2 | General and stunt pilots differ in CR, formula, and requirements. |
| `police` | 2 | Detective and uniformed officer differ in CR and requirements; matching entries across books share mechanics. |
| `sailor` | 2 | Naval and commercial sailors differ in CR and requirements. |
| `white-collar-worker` | 2 | Clerk/executive and middle/senior manager differ in CR and requirements. |

Guidance-only differences continue to normalize to a broad selector plus `keeperReview`; they do not create additional variants.

No official occupation mechanics block states a Characteristic prerequisite. Real-world licensing, education, or training mentioned in occupation prose is contextual guidance, not a mechanical prerequisite; accordingly, the inventory records `prerequisite=none` rather than inventing a gate that the source does not define.

## 7. Unverified and future-source groups

There are no unverified Excel rows under the current evidence boundary. The 115 out-of-scope rows remain future Setting/source intake material and must be re-opened only with their corresponding official books. In particular, the Excel source hints are enough for exclusion but are not authority for future Gaslight, Japanese, or Investigator Companion mechanics.

One confirmed Standard family has `implementation_status=needs-review`: `deprogrammer`. Its source identity and canonicalization are verified; the review is an Engine-expression issue, not an unverified-source issue.

## 8. Engine pressure cases

### Active Engine pressure

#### `deprogrammer` — Investigator Handbook printed page 77

The official mechanics allow, with Keeper permission, Hypnosis to replace any one occupation skill. The current requirement model can express fixed selectors, one-of groups, broad selections, and Keeper review, but it cannot attach an optional approved replacement to any one member of an already composed eight-skill set without expanding that replacement across the requirement structure.

Affected layer: `OccupationRequirement` / `SkillSelector` composition and approval subject semantics.

This cleanup does not add replacement semantics. The family remains in Batch 3 with `needs-review`.

### Resolved Engine pressure — `bounty-hunter`, `cowboy`, and `tribe-member`

#### `bounty-hunter` and `cowboy` — Investigator Handbook printed pages 73–74

Both official mechanics require the player to choose one exclusive branch—Fighting or Firearms—and then select one or more specializations within that chosen branch, without mixing branches. The current `one-of` selector assigns at most one selected `SkillRef` to each child selector, so it cannot express an exclusive branch that itself allows repeatable selection.

Stable pressure description: `exclusive-selector-branch-with-repeatable-selection`.

Affected layer: `OccupationRequirement` / `SkillSelector` branch cardinality semantics.

The cleanup added `one-branch`: every selected SkillRef must be accepted by one branch under that branch's own cardinality. Both families now use exclusive Fighting 1+ / Firearms 1+ branches and are mapped to their canonical production IDs.

#### `tribe-member` — Keeper Rulebook printed page 41; Investigator Handbook printed page 91

Both official sources list generic Fighting or Throw. Under the frozen generic Fighting semantics, the Fighting branch permits one or more specializations; the choice must remain exclusive from Throw. The current `one-of` selector can consume its Fighting child only once, so an exactly-one approximation would lose official mechanics.

Stable pressure description: `exclusive-selector-branch-with-repeatable-selection`.

Affected layer: `OccupationRequirement` / `SkillSelector` branch cardinality semantics.

Both source entries now map to one canonical production definition using Fighting 1+ / Throw exactly-one branches.

The existing `one-of` behavior was deliberately not changed: its children remain distinct one-use slots, as required by social choose-two and Soldier support choose-two. `one-branch` is a different domain concept whose selected branch may consume multiple distinct SkillRefs. Branch identity is derived from the complete selected ref set and is not persisted.

The four resolved source entries retain `recommended_batch=Batch 2 - structured`, now use `implementation_status=production-batch-2`, and no longer carry the resolved Engine-pressure note.

### AUDIT CONFLICT — Engine pressure cleanup

None.

### NEW ENGINE PRESSURE — Engine pressure cleanup

None.

The Occultist's optional Keeper-approved Cthulhu Mythos selection is not a new pressure case: the existing broad selection plus Cthulhu Mythos creation-point approval can represent it, while the source's suggested starting limit of 10 remains guidance.

## 9. Phase 5B-2 production plan

Every one of the 91 confirmed Standard families is assigned exactly once in the implementation plan: 63 are fully implemented after Batch 3A, and 28 remain in Batch 3. The completed Batch 2A sub-batch added the uniformed-officer definition and only corrected `police-detective` family identity; its mechanics remain unchanged.

### Already implemented — 63 complete families

Complete: `accountant`, `acrobat`, `agency-detective`, `alienist`, `animal-trainer`, `antiquarian`, `antique-dealer`, `archaeologist`, `architect`, `artist`, `asylum-attendant`, `athlete`, `author`, `bartender`, `big-game-hunter`, `book-dealer`, `bounty-hunter`, `boxer-wrestler`, `butler-valet-maid`, `clergy`, `cowboy`, `craftsperson`, `cult-leader`, `designer`, `dilettante`, `diver`, `doctor-of-medicine`, `drifter`, `editor`, `elected-official`, `engineer`, `entertainer`, `explorer`, `farmer`, `firefighter`, `forensic-surgeon`, `gambler`, `gentleman-lady`, `hospital-orderly`, `journalist`, `judge`, `laboratory-assistant`, `lawyer`, `missionary`, `mountain-climber`, `museum-curator`, `musician`, `nurse`, `outdoorsperson`, `pharmacist`, `police`, `professor`, `psychiatrist`, `salesperson`, `shopkeeper`, `soldier-marine`, `spy`, `stunt-performer`, `student-intern`, `tribe-member`, `undertaker`, `union-activist`, `zookeeper`.

### Batch 1 — simple — completed

`clergy`, `elected-official`, `judge`, `museum-curator`.

All five corresponding official source entries retain `recommended_batch=Batch 1 - simple` and are marked `implementation_status=production-batch-1`. The four families are canonical, use already-supported formulas and selectors, and introduced no audit conflict or Engine pressure.

### Batch 2 — structured — completed

Batch 2A completed 14 production definitions: 13 new complete families—`agency-detective`, `alienist`, `antique-dealer`, `archaeologist`, `architect`, `asylum-attendant`, `big-game-hunter`, `book-dealer`, `explorer`, `firefighter`, `forensic-surgeon`, `lawyer`, and `nurse`—plus the `police` follow-up definition.

The 16 corresponding official source entries retain `recommended_batch=Batch 2 - structured` and are marked `implementation_status=production-batch-2`. At the Batch 2A checkpoint, `bounty-hunter` and `cowboy` retained the same recommended batch but were withheld as `needs-review`; the later cleanup resolved that state without changing the formal audit batch.

Batch 2B completed 15 production definitions: `gambler`, `gentleman-lady`, `hospital-orderly`, `mountain-climber`, `musician`, `outdoorsperson`, `pharmacist`, `psychiatrist`, `salesperson`, `shopkeeper`, `spy`, `stunt-performer`, `undertaker`, `union-activist`, and `zookeeper`. These map 16 source entries because `musician` retains matching Keeper Rulebook and Investigator Handbook references.

`musician` remains one canonical definition: both official sources agree on CR 9–30, `EDU×2 + best(DEX, POW)×2`, the social/Listen/Psychology/instrument/four-other-skills structure, and all-era availability. The Handbook printed page 84 note explicitly resolves the second characteristic to DEX or POW.

The Engine-pressure cleanup added `bounty-hunter`, `cowboy`, and `tribe-member` as three canonical production definitions mapping four official source entries. Together, Batch 2A, Batch 2B, and the cleanup contain 32 production definitions and map 36 official source entries. Formal Batch 2 is completed.

### AUDIT CONFLICT — Batch 2B

- The inventory previously marked `musician` as non-fuzzy. The official instrument wording requires an Art / Craft specialization relevant to a musical instrument, so both source rows now use broad Art / Craft selection with guidance and Keeper review.
- The inventory previously marked `mountain-climber` as non-fuzzy. The official Survival wording is “Alpine or similar”; determining a similar mountainous environment requires guidance and Keeper review.
- The intake audit previously left `tribe-member` as ordinary pending Batch 2 data. Reapplying the frozen generic Fighting cardinality during Batch 2B showed that “Fighting or Throw” required an exclusive selector branch with repeatable Fighting selection, so both source rows were withheld until the later `one-branch` cleanup mapped them to production.
- No CR, point-formula, source-variant, page, name, or era conflicts were found.

### Batch 3 — complex / review — in progress

The formal audit batch began with 44 families / 67 expected definitions. Batch 3A completed 16 canonical families / 16 definitions: `acrobat`, `animal-trainer`, `athlete`, `bartender`, `boxer-wrestler`, `butler-valet-maid`, `craftsperson`, `cult-leader`, `designer`, `dilettante`, `diver`, `drifter`, `editor`, `engineer`, `entertainer`, and `farmer`. Their 22 source rows retain `recommended_batch=Batch 3 - complex / review` and now use `implementation_status=production-batch-3`.

The six cross-source families—`athlete`, `dilettante`, `drifter`, `engineer`, `entertainer`, and `farmer`—were re-compared against both official PDFs. CR, formula, fixed skills, choice grouping, cardinality, specialization, and era all match. The Keeper Rulebook's page 40 occupation/era adaptation rule and the Handbook's personal/era wording support one canonical broad-selection mechanic with guidance and Keeper review; no source variant was created. `entertainer` retains a fuzzy Art / Craft parent selector because acting, singing, and comedy are examples, not an Acting-only restriction. `farmer` uses the canonical `drive-auto` identity because the Keeper Rulebook skill chapter explicitly treats Wagon Driving as the period-appropriate name for that generic skill. `butler-valet-maid` keeps CR 9–40; the employer-household status sentence is source guidance within that range, not a new dynamic CR formula.

AUDIT CONFLICT — Batch 3A: none.

NEW ENGINE PRESSURE — Batch 3A: none. `deprogrammer` is unchanged and remains the sole `needs-review` family.

The 28 remaining Batch 3 families are:

`actor`, `computer-professional`, `criminal`, `deprogrammer`, `driver`, `federal-agent`, `foreign-correspondent`, `gangster`, `hobo`, `laborer`, `librarian`, `mechanic`, `military-officer`, `occultist`, `parapsychologist`, `photographer`, `pilot`, `private-investigator`, `prospector`, `psychologist-psychoanalyst`, `researcher`, `sailor`, `scientist`, `secretary`, `sex-worker`, `waiter`, `white-collar-worker`, `zealot`.

These contain fuzzy personal/era/academic requirements, source variants, special Keeper approval, source-dependent CR guidance, or other mechanics that deserve entry-by-entry review.

## 10. Next production-import numbers

| Measure | Count |
| --- | ---: |
| Current production definitions | 67 |
| Fully implemented families | 63 |
| Partially implemented families with work remaining | 0 |
| Wholly unimplemented families | 28 |
| Families not fully implemented | 28 |
| Expected production definitions remaining | 51 |
| Completed Batch 1 families | 4 |
| Completed Batch 1 definitions | 4 |
| Completed Batch 2A production definitions | 14 (13 new families + 1 `police` follow-up) |
| Completed Batch 2B production families / definitions | 15 / 15 |
| Completed Batch 2 Engine-pressure cleanup families / definitions | 3 / 3 |
| Production Batch 2 source entries | 36 |
| Completed Batch 3A production families / definitions | 16 / 16 |
| Production Batch 3 source entries | 22 |
| Batch 3 families remaining | 28 |
| Batch 3 definitions remaining | 51 across 28 families |
| `needs-review` families | 1 (`deprogrammer`) |

Phase 5B-2-A intake audit, Batch 1, Batch 2A, Batch 2B, the Batch 2 Engine-pressure cleanup, and Batch 3A are complete. Formal Batch 2 is completed; Batch 3 is in progress with 28 families / 51 expected definitions remaining. Phase 5B and Phase 5B-2 are still in progress, and Phase 5C has not started.
