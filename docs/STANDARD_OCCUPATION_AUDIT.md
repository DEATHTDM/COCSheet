# Standard Occupation Full Intake Audit

Last updated: 2026-08-13

## 1. Audit scope

This document records the completed Phase 5B-2-A Standard occupation intake boundary and tracks subsequent production-import batches. The frozen primary source system is:

- `coc7-keeper-rulebook-40th-zh`: 《克苏鲁的呼唤 40 周年纪念版》
- `coc7-investigator-handbook-zh-1-21`: 《克苏鲁的呼唤第七版调查员手册》

The official PDFs are the mechanical authority. `COC7空白卡CY23Final(1).xlsx` is used only as an intake checklist and crosswalk source. Batch 2A and Batch 2B completed the lossless imports supported by the prior Engine. The subsequent Engine-pressure cleanup added the minimal `one-branch` selector and moved `bounty-hunter`, `cowboy`, and `tribe-member` into production. Formal Phase 5B-2 Batch 2 is completed. Batch 3 is also completed: the Batch 3A through Batch 3F imports, the Keeper Criminal Engine-pressure cleanup, and the final Clerk / Executive source clarification contain 68 production definitions and map 79 source rows. The Criminal family contains the Keeper generic definition and all 11 Investigator Handbook subtypes; Deprogrammer is production through an occupation-level replacement policy; White-collar Worker contains both verified mechanical variants. There is no active Engine pressure, unresolved source ambiguity, or `needs-review` Standard source row. Phase 5B and Phase 5B-2 are complete. Phase 5C has not started.

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
| Families containing mechanical variants | 15 |
| Expected production definitions | 119 |
| Additional definitions above one-per-family | 28 |
| Definitions contained in the 15 variant families | 43 |

The 142 source entries are not 142 production definitions. Mechanically identical entries across the two official sources share one definition and retain both source references. Distinct formulas, Credit Rating ranges, deterministic requirements, cardinality, or approval semantics remain separate mechanics keys under a family.

## 3. Current production coverage

The merged Phase 5B-1 pilot plus Phase 5B-2 Batch 1, completed Batch 2, and Batch 3A through Batch 3F cover:

| Measure | Covered | Total |
| --- | ---: | ---: |
| Canonical families touched | 91 | 91 |
| Fully implemented families | 91 | 91 |
| Production definitions | 119 | 119 expected |
| Official source entries mapped to those definitions | 142 | 142 |

The 142 source-entry rows map to 119 definitions because several canonical definitions retain matching Keeper Rulebook and Investigator Handbook references, while genuine source mechanics variants retain distinct production IDs.

Those definitions fully implement all 91 family identities. Batch 3A added 17 definitions after PDF re-verification, including two Entertainer source mechanics variants. Batch 3B added 16 canonical definitions after re-verifying all 20 applicable source entries. Batch 3C added 11 definitions across five source-variant families after re-verifying 12 source entries. Batch 3D now contains 11 definitions mapping 12 source rows: Laborer, Photographer, Pilot, Sailor, and White-collar Worker are complete. Batch 3E added the 11 Handbook Criminal variants; the follow-up Engine-pressure cleanup added the Keeper generic Criminal through top-level-only `choice-pool`, completing the 12-variant family without changing `one-of` or `one-branch`. Batch 3F adds Deprogrammer through the occupation-level replacement policy without adding a selector.

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
- `deprogrammer`
- `designer`
- `dilettante`
- `diver`
- `drifter`
- `editor`
- `engineer`
- `entertainer-keeper-rulebook`
- `entertainer-investigator-handbook`
- `farmer`
- `federal-agent`
- `foreign-correspondent`
- `hobo`
- `librarian`
- `mechanic`
- `occultist`
- `parapsychologist`
- `private-investigator`
- `prospector`
- `psychologist-psychoanalyst`
- `researcher`
- `scientist`
- `secretary`
- `sex-worker`
- `waiter`
- `zealot`
- `missionary-keeper-rulebook`
- `missionary-investigator-handbook`
- `actor-stage`
- `actor-film-star`
- `computer-professional-programmer-technician`
- `computer-professional-hacker`
- `driver-chauffeur`
- `driver-general`
- `driver-taxi`
- `gangster-boss`
- `gangster-underling`
- `military-officer-keeper-rulebook`
- `military-officer-investigator-handbook`
- `laborer-unskilled`
- `laborer-lumberjack`
- `laborer-miner`
- `photographer-general`
- `photographer-photojournalist`
- `pilot-general`
- `pilot-stunt`
- `sailor-naval`
- `sailor-commercial`
- `white-collar-worker-clerk-executive`
- `white-collar-worker-middle-senior-manager`
- `criminal-assassin`
- `criminal-bank-robber`
- `criminal-bootlegger-thug`
- `criminal-burglar`
- `criminal-conman`
- `criminal-freelance-solo`
- `criminal-gun-moll`
- `criminal-fence`
- `criminal-forger-counterfeiter`
- `criminal-smuggler`
- `criminal-street-punk`

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

The audit finds 15 variant families. The full source-entry fingerprints and mechanics keys are in the official inventory CSV.

| Family | Expected mechanics | Reason to remain distinct |
| --- | ---: | --- |
| `actor` | 2 | Stage and film actors differ in CR, fixed skills, and free-pick cardinality. |
| `computer-professional` | 2 | Programmer/technician and hacker requirements differ; the core Hacker matches the Handbook Hacker. |
| `criminal` | 12 | The Keeper generic Criminal and 11 Handbook subtypes differ across CR, formula, requirements, and cardinality. |
| `driver` | 3 | Chauffeur, general driver, and taxi driver have different CR/formula/requirements. |
| `entertainer` | 2 | Keeper fixes Art / Craft (Acting) and unrestricted other skills; Handbook allows a Keeper-reviewed performance-related Art / Craft specialization and personal/era specialties. |
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

No confirmed Standard source row remains `needs-review`. Clerk / Executive was correctly withheld when the audited Chinese text exposed only `Language`; later upstream English wording and correction evidence resolved the omitted qualifier as `Language (Own or Other)`. This is a source evidence refinement, not a correction of the earlier audit boundary and not an Engine change.

## 8. Engine pressure cases

### Active Engine pressure

None.

### Resolved Engine pressure — `deprogrammer`

#### Investigator Handbook printed page 77

Stable pressure ID: `keeper-approved-single-occupation-skill-replacement`.

The official mechanics allow, with Keeper permission, Hypnosis to replace any one of the eight occupation-skill categories. Resolution: an optional singular policy on `OccupationDefinition` names an exact replacement ref and the eligible requirement IDs. `CreationSession` explicitly stores one policy/target draft; the target requirement must represent one category, its normal selection must be absent, and the replacement ref enters the ordinary occupation eligibility and allocation pipeline. Keeper approval is scoped to occupation + policy + target. This is a 1-for-1 occupation-level requirement replacement policy, not a new `SkillSelector`.

### Resolved Engine pressure — `criminal`

#### Keeper Rulebook printed page 40

The source fixes one social skill, Stealth, Psychology, and Spot Hidden, then requires choosing four categories from Fighting, Appraise, Mechanical Repair, Sleight of Hand, Disguise, Firearms, and Locksmith. Keeper Rulebook printed page 54 defines broad skills as collections of specializations to which points are assigned instead of the umbrella skill, and printed pages 60 and 69 repeat that rule for Fighting and Firearms. Under the project's frozen generic combat semantics, selecting either generic category permits one or more distinct specializations.

The frozen `one-of` model treats every child as a distinct one-use slot. It can enforce four selected `SkillRef` values, but it cannot distinguish four selected categories from multiple refs produced by one selected Fighting or Firearms category. `one-branch` is also not lossless: it chooses one exclusive branch for an entire requirement, whereas this source requires four categories from one seven-category pool and allows two pool children to be repeatable internally.

Stable pressure ID: `choice-pool-with-repeatable-specialization-branch`.

Resolution: add top-level-only `choice-pool`, whose atomic branches carry their own SkillRef cardinality and whose `selectedBranches` counts active categories separately from the outer requirement's selected SkillRef count. Deterministic backtracking assigns each ref to exactly one branch; inactive branch minima do not apply. `criminal-keeper-rulebook` is now production, and the 12-variant Criminal family is complete.

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

## 9. Phase 5B-2 production completion

Every one of the 91 confirmed Standard families is assigned exactly once and is fully implemented. The completed Batch 2A sub-batch added the uniformed-officer definition and only corrected `police-detective` family identity; its mechanics remain unchanged.

### Implemented — 91 complete families

Complete: `accountant`, `acrobat`, `actor`, `agency-detective`, `alienist`, `animal-trainer`, `antiquarian`, `antique-dealer`, `archaeologist`, `architect`, `artist`, `asylum-attendant`, `athlete`, `author`, `bartender`, `big-game-hunter`, `book-dealer`, `bounty-hunter`, `boxer-wrestler`, `butler-valet-maid`, `clergy`, `computer-professional`, `cowboy`, `craftsperson`, `criminal`, `cult-leader`, `deprogrammer`, `designer`, `dilettante`, `diver`, `doctor-of-medicine`, `drifter`, `driver`, `editor`, `elected-official`, `engineer`, `entertainer`, `explorer`, `farmer`, `federal-agent`, `firefighter`, `foreign-correspondent`, `forensic-surgeon`, `gambler`, `gangster`, `gentleman-lady`, `hobo`, `hospital-orderly`, `journalist`, `judge`, `laboratory-assistant`, `laborer`, `lawyer`, `librarian`, `mechanic`, `military-officer`, `missionary`, `mountain-climber`, `museum-curator`, `musician`, `nurse`, `occultist`, `outdoorsperson`, `parapsychologist`, `pharmacist`, `photographer`, `pilot`, `police`, `private-investigator`, `professor`, `prospector`, `psychiatrist`, `psychologist-psychoanalyst`, `researcher`, `sailor`, `salesperson`, `scientist`, `secretary`, `sex-worker`, `shopkeeper`, `soldier-marine`, `spy`, `stunt-performer`, `student-intern`, `tribe-member`, `undertaker`, `union-activist`, `waiter`, `white-collar-worker`, `zealot`, `zookeeper`.

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

### Batch 3 — complex / review — completed

The formal audit batch began with 44 families / 68 expected definitions. Batch 3A completed 17 production definitions across 16 families: `acrobat`, `animal-trainer`, `athlete`, `bartender`, `boxer-wrestler`, `butler-valet-maid`, `craftsperson`, `cult-leader`, `designer`, `dilettante`, `diver`, `drifter`, `editor`, `engineer`, two `entertainer` source variants, and `farmer`. Their 22 source rows retain `recommended_batch=Batch 3 - complex / review` and use `implementation_status=production-batch-3`.

The five canonical cross-source families—`athlete`, `dilettante`, `drifter`, `engineer`, and `farmer`—were re-compared against both official PDFs. CR, formula, fixed skills, choice grouping, cardinality, specialization, and era match. The Keeper Rulebook's page 40 occupation/era adaptation rule and the Handbook's personal/era wording support one broad-selection mechanic with guidance and Keeper review for those families. `farmer` uses the canonical `drive-auto` identity because the Keeper Rulebook skill chapter explicitly treats Wagon Driving as the period-appropriate name for that generic skill. `butler-valet-maid` keeps CR 9–40; the employer-household status sentence is source guidance within that range, not a new dynamic CR formula.

Batch 3B completed 16 canonical production definitions: `federal-agent`, `foreign-correspondent`, `hobo`, `librarian`, `mechanic`, `occultist`, `parapsychologist`, `private-investigator`, `prospector`, `psychologist-psychoanalyst`, `researcher`, `scientist`, `secretary`, `sex-worker`, `waiter`, and `zealot`. Their 20 source rows retain `recommended_batch=Batch 3 - complex / review` and use `implementation_status=production-batch-3`.

The four Batch 3B cross-source families remain canonical after field-by-field PDF comparison. `librarian` has the same CR, `EDU×4`, fixed skills, and four personal/professional-reading choices in both books. `parapsychologist`, `private-investigator`, and `zealot` have matching CR, formulas, fixed skills, and cardinality; the Keeper Rulebook's printed-page-40 occupation/era adaptation rule supports normalizing its “other skill” wording with the Handbook's personal/era wording as one broad selector with guidance and Keeper review. None has a deterministic source difference.

The Handbook-only fuzzy mechanics are represented without Engine expansion: `mechanic` keeps separate fixed Electrical Repair and Mechanical Repair plus Keeper-reviewed trade and personal/era/technical slots; `researcher` keeps three Keeper-reviewed academic-field choices; `secretary` expresses Typing or Shorthand through existing fixed-name Art / Craft custom specializations; and `scientist` requires three distinct Science specializations. `occultist` can select Cthulhu Mythos in its Keeper-reviewed broad slot, while the existing Cthulhu Mythos allocation approval supplies the separate creation-point approval and the source's suggested starting 10% remains guidance.

Batch 3C completed 11 production definitions across five source-variant families: two Actor variants, two Computer Professional variants, three Driver variants, two Gangster variants, and two Military Officer variants. Their 12 source rows retain `recommended_batch=Batch 3 - complex / review`, `mechanical-variant-candidate`, and `variant_candidate=yes`, and now use `implementation_status=production-batch-3` with definition-level production mappings.

Core and Handbook Hacker are mechanically identical after field-by-field comparison and therefore share `computer-professional-hacker` with both source references. Programmer / Technician remains a separate modern-only variant because its fixed Mathematics requirement replaces Hacker's social requirement and its personal/era slots retain Keeper review. The three Driver subtypes, two Actor subtypes, and two Gangster roles retain deterministic CR, formula, fixed-skill, and/or cardinality differences. Military Officer remains source-specific: Keeper fixes an open Survival specialization and an unrestricted other skill, while the Handbook fixes First Aid and a Keeper-reviewed personal/era specialty. Generic Fighting and Firearms requirements retain 1+ specialization cardinality.

Batch 3D initially completed 10 production definitions mapping 11 source rows. Laborer has three variants; Photographer, Pilot, and Sailor each have two. The mechanically identical Keeper and Handbook general Pilot rows share `pilot-general` with two source references after guidance-only normalization, while classic-only Stunt Pilot remains distinct. White-collar Worker initially added only the confirmed Middle / Senior Manager variant because printed pages 91-92 exposed `Language` without the Own/Other qualifier. After upstream English wording and correction evidence resolved the omitted qualifier, `white-collar-worker-clerk-executive` entered the same module as the eleventh Batch 3D definition and twelfth mapped source row, completing the two-variant family.

Batch 3E completed 11 Handbook Criminal production definitions mapping 11 source rows. Generic Fighting and Firearms remain independent 1+ requirements where both are listed; Freelance / Solo uses the existing `one-branch` selector for exclusive Fighting 1+ or Firearms 1+; Gun Moll is classic-only and fixes Brawl or Handgun; Conman fixes Acting and Law or Other Language; Fence and Forger both fix Forgery while retaining distinct free-slot approval semantics; Smuggler fixes a three-way Drive Auto / Pilot (Aircraft) / Pilot (Boat) choice. The follow-up cleanup adds the Keeper generic Criminal with `choice-pool`, making 12 definitions and 12 mapped source rows in the complete family.

Batch 3F completes Deprogrammer as one modern-only canonical definition from Investigator Handbook printed page 77. Its eight slots are two distinct social requirements, Drive Auto, the existing Brawl-or-generic-Firearms `one-branch`, History, Occult, Psychology, and Stealth. Stable pressure `keeper-approved-single-occupation-skill-replacement` is resolved by a singular occupation-level exact Hypnosis replacement policy with all eight target IDs and target-scoped Keeper approval.

### AUDIT CONFLICT — Batch 3A

`entertainer` was previously classified as `canonical-match-across-sources`. Re-verification found different specialization-selection mechanics: Keeper Rulebook printed page 40 fixes Art / Craft (Acting), while Investigator Handbook printed page 79 allows one performance-related Art / Craft specialization and gives Acting, Singing, and Comedy as examples. The Keeper variant also has two unrestricted other skills, while the Handbook variant has two personal/era specialties. The family is corrected to two definitions—`entertainer-keeper-rulebook` and `entertainer-investigator-handbook`—with `variantOf: entertainer`. This is a source mechanics variant, not Engine pressure.

NEW ENGINE PRESSURE — Batch 3A: none. `deprogrammer` is unchanged and remains the sole `needs-review` family.

### AUDIT CONFLICT — Batch 3B

None.

### NEW ENGINE PRESSURE — Batch 3B

None. `deprogrammer` is unchanged and remains the sole `needs-review` family.

### AUDIT CONFLICT — Batch 3C

None.

### NEW ENGINE PRESSURE — Batch 3C

None. `deprogrammer` is unchanged and remains the sole `needs-review` family.

### AUDIT CONFLICT — Batch 3D

None. The planned mechanics, source matching, and era classifications for the ten produced definitions were confirmed against the PDFs.

### Clerk / Executive source ambiguity — resolved

The audited Chinese Investigator Handbook printed pages 91-92 show only `Language`, so the original decision to withhold `white-collar-worker-clerk-executive` was correct under the evidence then available. Subsequent upstream English verification shows `Language (Own or Other)`, and the older English PDF correction/errata record independently states that White Collar Worker — Clerk / Executive should be corrected from `Language` to `Language (Own or Other)`.

Production therefore requires exactly one SkillRef selected through the existing ordinary `one-of`: either a `specialization-of("language-own")` custom Own Language instance or a `specialization-of("language-other")` custom Other Language instance. This clarification introduces no generic Language selector, no source variant, no Engine change, and no occupation-ID special-case. The production `sourceRef` remains the audited Chinese Investigator Handbook; the upstream English evidence is used only to restore the qualifier omitted by the Chinese wording.

### NEW ENGINE PRESSURE — Batch 3D

At Batch 3D completion, `deprogrammer` was the sole active Engine pressure.

### AUDIT CONFLICT — Batch 3E

None. The planned Handbook mechanics, source pages, CR ranges, formulas, era markers, specialization granularity, choice grouping, and approval semantics were confirmed against printed pages 75–76.

### NEW ENGINE PRESSURE — Batch 3E

Keeper Rulebook printed page 40 Criminal added `choice-pool-with-repeatable-specialization-branch`: a choose-four pool contains generic Fighting and Firearms children that may each consume multiple distinct specialization refs while still counting as one selected category. The follow-up cleanup resolves this with the top-level-only `choice-pool` selector and maps the source row to `criminal-keeper-rulebook`.

No Batch 3 family or expected Standard definition remains. There is no active Engine pressure or unresolved source ambiguity.

## 10. Final production numbers

| Measure | Count |
| --- | ---: |
| Current production definitions | 119 |
| Fully implemented families | 91 |
| Partially implemented families with work remaining | 0 |
| Wholly unimplemented families | 0 |
| Families not fully implemented | 0 |
| Expected production definitions remaining | 0 |
| Completed Batch 1 families | 4 |
| Completed Batch 1 definitions | 4 |
| Completed Batch 2A production definitions | 14 (13 new families + 1 `police` follow-up) |
| Completed Batch 2B production families / definitions | 15 / 15 |
| Completed Batch 2 Engine-pressure cleanup families / definitions | 3 / 3 |
| Production Batch 2 source entries | 36 |
| Completed Batch 3A production families / definitions | 16 / 17 |
| Completed Batch 3B production families / definitions | 16 / 16 |
| Completed Batch 3C production families / definitions | 5 / 11 |
| Completed Batch 3D fully implemented families / definitions | 5 / 11 |
| Completed Batch 3E + Keeper Criminal cleanup fully implemented families / definitions | 1 / 12 |
| Completed Batch 3F fully implemented families / definitions | 1 / 1 |
| Production Batch 3 source entries | 79 |
| Batch 3 families remaining | 0 |
| Batch 3 definitions remaining | 0 |
| `needs-review` families | 0 |

Phase 5B-2-A intake audit, Batch 1, Batch 2A, Batch 2B, the Batch 2 Engine-pressure cleanup, Batch 3A through Batch 3F, the Keeper Criminal cleanup, and the final Clerk / Executive source clarification are complete. Formal Batch 2 and Batch 3 are completed. Phase 5B and Phase 5B-2 are completed; Phase 5C has not started.
