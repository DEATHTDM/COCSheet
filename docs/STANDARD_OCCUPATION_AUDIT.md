# Standard Occupation Full Intake Audit

Last updated: 2026-08-12

## 1. Audit scope

This document records the completed Phase 5B-2-A Standard occupation intake boundary and tracks subsequent production-import batches. The frozen primary source system is:

- `coc7-keeper-rulebook-40th-zh`: 《克苏鲁的呼唤 40 周年纪念版》
- `coc7-investigator-handbook-zh-1-21`: 《克苏鲁的呼唤第七版调查员手册》

The official PDFs are the mechanical authority. `COC7空白卡CY23Final(1).xlsx` is used only as an intake checklist and crosswalk source. The Batch 2A and Batch 2B engineering sub-batches are completed without changing the Occupation Engine, starting Phase 5C, or importing the workbook into Git. Batch 2 data intake is complete except for three Engine-pressure families: `bounty-hunter`, `cowboy`, and the newly withheld `tribe-member`.

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

The merged Phase 5B-1 pilot plus Phase 5B-2 Batch 1, Batch 2A, and Batch 2B cover:

| Measure | Covered | Total |
| --- | ---: | ---: |
| Canonical families touched | 44 | 91 |
| Fully implemented families | 44 | 91 |
| Production definitions | 48 | 118 expected |
| Official source entries mapped to those definitions | 59 | 142 |

The 59 source-entry rows map to 48 definitions because several canonical definitions retain matching Keeper Rulebook and Investigator Handbook references.

Those definitions touch and fully implement 44 families. Batch 2B added 15 canonical definitions; `tribe-member` was withheld after its generic Fighting-or-Throw branch was confirmed to require repeatable selection within an exclusive branch.

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
- `clergy`
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
- `undertaker`
- `union-activist`
- `zookeeper`
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

Four confirmed Standard families have `implementation_status=needs-review`: `deprogrammer`, `bounty-hunter`, `cowboy`, and `tribe-member`. Their source identity and canonicalization are verified; each review is an Engine-expression issue, not an unverified-source issue.

## 8. Engine pressure cases

### `deprogrammer` — Investigator Handbook printed page 77

The official mechanics allow, with Keeper permission, Hypnosis to replace any one occupation skill. The current requirement model can express fixed selectors, one-of groups, broad selections, and Keeper review, but it cannot attach an optional approved replacement to any one member of an already composed eight-skill set without expanding that replacement across the requirement structure.

Affected layer: `OccupationRequirement` / `SkillSelector` composition and approval subject semantics.

This audit does not change the Engine. The family remains in Batch 3 with `needs-review`.

### `bounty-hunter` and `cowboy` — Investigator Handbook printed pages 73–74

Both official mechanics require the player to choose one exclusive branch—Fighting or Firearms—and then select one or more specializations within that chosen branch, without mixing branches. The current `one-of` selector assigns at most one selected `SkillRef` to each child selector, so it cannot express an exclusive branch that itself allows repeatable selection.

Stable pressure description: `exclusive-selector-branch-with-repeatable-selection`.

Affected layer: `OccupationRequirement` / `SkillSelector` branch cardinality semantics.

This hardening does not change the Engine. Both families retain `recommended_batch=Batch 2 - structured`, return to `needs-review`, and have no production ID until the pressure is resolved.

### `tribe-member` — Keeper Rulebook printed page 41; Investigator Handbook printed page 91

Both official sources list generic Fighting or Throw. Under the frozen generic Fighting semantics, the Fighting branch permits one or more specializations; the choice must remain exclusive from Throw. The current `one-of` selector can consume its Fighting child only once, so an exactly-one approximation would lose official mechanics.

Stable pressure description: `exclusive-selector-branch-with-repeatable-selection`.

Affected layer: `OccupationRequirement` / `SkillSelector` branch cardinality semantics.

Batch 2B does not change the Engine. Both source entries retain `recommended_batch=Batch 2 - structured`, are marked `needs-review`, and have no production ID.

The Occultist's optional Keeper-approved Cthulhu Mythos selection is not a new pressure case: the existing broad selection plus Cthulhu Mythos creation-point approval can represent it, while the source's suggested starting limit of 10 remains guidance.

## 9. Phase 5B-2 production plan

Every one of the 91 confirmed Standard families is assigned exactly once in the implementation plan: 44 are fully implemented after Batch 2B, 3 remain in Batch 2 as Engine-pressure families, and 44 are assigned to Batch 3. The completed Batch 2A sub-batch added the uniformed-officer definition and only corrected `police-detective` family identity; its mechanics remain unchanged.

### Already implemented — 44 complete families

Complete: `accountant`, `agency-detective`, `alienist`, `antiquarian`, `antique-dealer`, `archaeologist`, `architect`, `artist`, `asylum-attendant`, `author`, `big-game-hunter`, `book-dealer`, `clergy`, `doctor-of-medicine`, `elected-official`, `explorer`, `firefighter`, `forensic-surgeon`, `gambler`, `gentleman-lady`, `hospital-orderly`, `journalist`, `judge`, `laboratory-assistant`, `lawyer`, `missionary`, `mountain-climber`, `museum-curator`, `musician`, `nurse`, `outdoorsperson`, `pharmacist`, `police`, `professor`, `psychiatrist`, `salesperson`, `shopkeeper`, `soldier-marine`, `spy`, `stunt-performer`, `student-intern`, `undertaker`, `union-activist`, `zookeeper`.

### Batch 1 — simple — completed

`clergy`, `elected-official`, `judge`, `museum-curator`.

All five corresponding official source entries retain `recommended_batch=Batch 1 - simple` and are marked `implementation_status=production-batch-1`. The four families are canonical, use already-supported formulas and selectors, and introduced no audit conflict or Engine pressure.

### Batch 2 — structured — data intake completed except three Engine-pressure families

Batch 2A completed 14 production definitions: 13 new complete families—`agency-detective`, `alienist`, `antique-dealer`, `archaeologist`, `architect`, `asylum-attendant`, `big-game-hunter`, `book-dealer`, `explorer`, `firefighter`, `forensic-surgeon`, `lawyer`, and `nurse`—plus the `police` follow-up definition.

The 16 corresponding official source entries retain `recommended_batch=Batch 2 - structured` and are marked `implementation_status=production-batch-2`. `bounty-hunter` and `cowboy` retain the same recommended batch but are `needs-review`, not production entries. This engineering split does not rename the formal audit batch.

Batch 2B completed 15 production definitions: `gambler`, `gentleman-lady`, `hospital-orderly`, `mountain-climber`, `musician`, `outdoorsperson`, `pharmacist`, `psychiatrist`, `salesperson`, `shopkeeper`, `spy`, `stunt-performer`, `undertaker`, `union-activist`, and `zookeeper`. These map 16 source entries because `musician` retains matching Keeper Rulebook and Investigator Handbook references.

`musician` remains one canonical definition: both official sources agree on CR 9–30, `EDU×2 + best(DEX, POW)×2`, the social/Listen/Psychology/instrument/four-other-skills structure, and all-era availability. The Handbook printed page 84 note explicitly resolves the second characteristic to DEX or POW.

`tribe-member` joined `bounty-hunter` and `cowboy` as a withheld Batch 2 Engine-pressure family. Formal Batch 2 cannot be marked complete until those three families can be represented without loss.

### AUDIT CONFLICT — Batch 2B

- The inventory previously marked `musician` as non-fuzzy. The official instrument wording requires an Art / Craft specialization relevant to a musical instrument, so both source rows now use broad Art / Craft selection with guidance and Keeper review.
- The inventory previously marked `mountain-climber` as non-fuzzy. The official Survival wording is “Alpine or similar”; determining a similar mountainous environment requires guidance and Keeper review.
- The intake audit previously left `tribe-member` as ordinary pending Batch 2 data. Reapplying the frozen generic Fighting cardinality shows that “Fighting or Throw” requires an exclusive selector branch with repeatable Fighting selection, so both source rows are now `needs-review` with no production ID.
- No CR, point-formula, source-variant, page, name, or era conflicts were found.

### Batch 3 — complex / review — 44 families

`acrobat`, `actor`, `animal-trainer`, `athlete`, `bartender`, `boxer-wrestler`, `butler-valet-maid`, `computer-professional`, `craftsperson`, `criminal`, `cult-leader`, `deprogrammer`, `designer`, `dilettante`, `diver`, `drifter`, `driver`, `editor`, `engineer`, `entertainer`, `farmer`, `federal-agent`, `foreign-correspondent`, `gangster`, `hobo`, `laborer`, `librarian`, `mechanic`, `military-officer`, `occultist`, `parapsychologist`, `photographer`, `pilot`, `private-investigator`, `prospector`, `psychologist-psychoanalyst`, `researcher`, `sailor`, `scientist`, `secretary`, `sex-worker`, `waiter`, `white-collar-worker`, `zealot`.

These contain fuzzy personal/era/academic requirements, source variants, special Keeper approval, source-dependent CR guidance, or other mechanics that deserve entry-by-entry review.

## 10. Next production-import numbers

| Measure | Count |
| --- | ---: |
| Current production definitions | 48 |
| Fully implemented families | 44 |
| Partially implemented families with work remaining | 0 |
| Wholly unimplemented families | 47 |
| Families not fully implemented | 47 |
| Expected production definitions remaining | 70 |
| Completed Batch 1 families | 4 |
| Completed Batch 1 definitions | 4 |
| Completed Batch 2A production definitions | 14 (13 new families + 1 `police` follow-up) |
| Completed Batch 2B production families / definitions | 15 / 15 |
| Batch 2 Engine-pressure families | 3 |
| Batch 3 families | 44 |
| Batch 3 definitions | 67 across 44 families |
| `needs-review` families | 4 |

Phase 5B-2-A intake audit, Batch 1, Batch 2A, and Batch 2B are complete. Formal Batch 2 is still in progress because three selector-pressure families remain; Batch 3 is pending. Phase 5B and Phase 5B-2 are still in progress, and Phase 5C has not started.
