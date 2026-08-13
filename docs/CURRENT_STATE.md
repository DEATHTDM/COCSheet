# Current State

Last updated: 2026-08-13

## Current phase

Phase 5 — Occupation Engine & Standard Occupations (In Progress)

Phase 5A — Occupation Engine Foundation and Phase 5B — Verified Standard Occupation Data are completed. Phase 5B-2 closed all 91 families, 119 production definitions, and 142 official Standard source entries. Phase 5C — Creation UI is in progress: Phase 5C-1 — Occupation Browser & Catalog Selection, Phase 5C-1.5 — Persistent Era Context & Availability Guard, and Phase 5C-2 — Requirement Selection are implemented. Point allocation, approval interaction, finalize UI, conflict handling, and custom occupation UI have not started. Phase 5 overall remains in progress.

## Git baseline

Phase 5C-1.5 Persistent Era Context & Availability Guard branch was created from `main` at `12407fe1c9cff6c7771e95f37835428ea3d6b0f9`.

## Implemented

- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- five registered SettingPacks, with the complete core skill catalog only in Standard and empty content placeholders for the other settings
- internal Extension Registry and allow-listed extension IDs
- minimal `Character`, `CreationSession`, and `CreationPreset` schemas
- Occupation schema, occupation point formula calculation, and attribute prerequisite validation foundations
- closed OccupationRequirement + SkillSelector model with stable requirement IDs, cardinality, fixed-name custom specialization, finite candidates, exclusions, declarative composition, exclusive `one-branch`, and N-branch `choice-pool` selection with branch-local cardinality
- hardened OccupationPointFormula schema with duplicate-free best-of attributes and all verified Standard formula shapes
- OccupationRegistry sourced only from SettingPack.occupations, with localized search and category/tag/era filters plus registration validation
- explicit source mechanics variants through variantOf, while guidance-only source wording shares canonical mechanics and multiple sourceRefs
- strongly typed CreationSession occupation mechanics snapshot and skill creation state containing requirement selections, SkillRef allocation rows, Credit Rating override and reasoned Keeper approvals
- optional singular occupation-level exact-skill replacement policy with explicit target draft, single-category target validation, target-scoped Keeper approval, stale-switch validation, and ordinary allocation finalization
- pure occupation/interest budget, selection uniqueness, one-of child-selector one-to-one assignment, one-branch whole-selection exclusivity, choice-pool active-branch backtracking assignment, creation-point policy, occupation-scoped Credit Rating range override, skill final-limit and unused-point warning rules
- pure structured-allocation conflict detection for existing Phase 4 Character.skills, with no silent adoption, reverse engineering or overwrite
- pure finalize plan rebuilding CharacterSkill values from current resolved base + occupation allocation + interest allocation, followed by Phase 4 Character.skills domain validation
- optional lightweight Character occupation identity snapshot without copied occupation mechanics
- explicit custom occupation foundation with UUID identity and an eight-occupational-skill category capacity proof based on requirement cardinality; one-branch counts one branch and choice-pool counts only the maximum selectable branch capacities, with generic Fighting / Firearms remaining one category each
- skills CreationStep and pure occupation-switch/reset draft actions that preserve allocations until explicit reset
- atomic skills completion through Creation Workflow Repository, writing Character occupation/skills, clamping current SAN to finalized Mythos when required, and advancing CreationSession to review in one Dexie transaction without changing HP/MP or restoring SAN
- legacy CreationPreset.skillCaps read compatibility without inferred mapping or validator effect, alongside explicit final-value skillLimits
- source-annotated Phase 5A test fixtures for ten occupation families (eleven definitions including two Missionary mechanics variants), not production occupation content
- Phase 5B-1 Standard production occupation pilot with 12 canonical families and 15 definitions, including verified Journalist and Missionary source mechanics variants
- dedicated `src/content/standard/occupations.ts` production module wired through `standardSettingPack.occupations`, with no dependency on testing fixtures
- source/page audit documentation in `docs/STANDARD_OCCUPATION_SOURCES.md`, including the Excel data-pool assessment and PDF verification matrix
- Phase 5B-2-A full intake audit with a 142-row official source inventory, 91 canonical family candidates, 119 expected production definitions after the Batch 3A Entertainer variant correction, a complete 230-row Excel crosswalk, duplicate/source-boundary findings, and complexity-based import batches
- Phase 5B-2 Batch 1 production import for `clergy`, `elected-official`, `judge`, and `museum-curator`, bringing Standard production coverage to 16 touched families / 19 definitions and mapping 5 additional official source entries as `production-batch-1`
- Phase 5B-2 Batch 2A production import for 14 structured definitions (13 new complete families plus `police-officer`), bringing Standard production coverage to 29 fully implemented families / 33 definitions and mapping 16 additional official source entries as `production-batch-2`; `bounty-hunter` and `cowboy` remain Batch 2 `needs-review` pressure cases
- Phase 5B-2 Batch 2B production import for 15 structured canonical definitions, bringing Standard production coverage to 44 fully implemented families / 48 definitions and mapping 16 additional official source entries as `production-batch-2`; `tribe-member` joins `bounty-hunter` and `cowboy` as an `exclusive-selector-branch-with-repeatable-selection` pressure case
- Phase 5B-2 Batch 2 Engine-pressure cleanup with the additive `one-branch` selector and production definitions for `bounty-hunter`, `cowboy`, and `tribe-member`, bringing coverage to 47 fully implemented families / 51 definitions and 63 mapped official source entries; all 36 Batch 2 source entries are now production and formal Batch 2 is completed
- Phase 5B-2 Batch 3A canonical/fuzzy import for `acrobat`, `animal-trainer`, `athlete`, `bartender`, `boxer-wrestler`, `butler-valet-maid`, `craftsperson`, `cult-leader`, `designer`, `dilettante`, `diver`, `drifter`, `editor`, `engineer`, `entertainer`, and `farmer`, bringing coverage to 63 fully implemented families / 68 definitions and 85 mapped official source entries; Entertainer is split into two source mechanics variants after re-verification, 22 source rows are `production-batch-3`, no family was withheld, and formal Batch 3 remains in progress
- Phase 5B-2 Batch 3B canonical/fuzzy import for `federal-agent`, `foreign-correspondent`, `hobo`, `librarian`, `mechanic`, `occultist`, `parapsychologist`, `private-investigator`, `prospector`, `psychologist-psychoanalyst`, `researcher`, `scientist`, `secretary`, `sex-worker`, `waiter`, and `zealot`, bringing coverage to 79 fully implemented families / 84 definitions and 105 mapped official source entries; all 16 definitions are canonical, 42 source rows are now `production-batch-3`, no family was withheld, and formal Batch 3 remains in progress
- Phase 5B-2 Batch 3C source-variant import for `actor`, `computer-professional`, `driver`, `gangster`, and `military-officer`, bringing coverage to 84 fully implemented families / 95 definitions and 117 mapped official source entries; 12 source rows map to 11 production variants because the two mechanically identical Hacker entries share one modern-only definition, 54 source rows are now `production-batch-3`, no family was withheld, and formal Batch 3 remains in progress
- Phase 5B-2 Batch 3D source-variant import adding 10 definitions across `laborer`, `photographer`, `pilot`, `sailor`, and `white-collar-worker`, bringing coverage to 89 touched family identities / 88 fully implemented families / 105 definitions and 128 mapped official source entries; 11 source rows enter production because the two mechanically identical general Pilot entries share one definition, while Clerk / Executive is withheld after printed pages 91-92 leave `Language` ambiguous between Own and Other; 65 source rows are now `production-batch-3`, no Engine change was made, and formal Batch 3 remains in progress
- Phase 5B-2 Batch 3E Criminal source-variant import adding all 11 Investigator Handbook subtypes, bringing coverage to 90 touched family identities / 88 fully implemented families / 116 definitions and 139 mapped official source entries; 76 source rows are now `production-batch-3`; Keeper Rulebook Criminal remains withheld under `choice-pool-with-repeatable-specialization-branch` because its choose-four category pool contains repeatable generic Fighting and Firearms children that current selector composition cannot count losslessly, no Engine change was made, and the Criminal family remains partial
- Phase 5B-2 Keeper Criminal Engine-pressure cleanup adding top-level-only `choice-pool` and `criminal-keeper-rulebook`, bringing coverage to 90 touched family identities / 89 fully implemented families / 117 definitions and 140 mapped official source entries; 77 source rows are now `production-batch-3`; `choice-pool-with-repeatable-specialization-branch` is resolved while Clerk / Executive remains a source ambiguity and Deprogrammer remains a separate Engine pressure
- Phase 5B-2 Deprogrammer Engine-pressure cleanup adding the singular occupation-level 1-for-1 replacement policy and `deprogrammer`, bringing coverage to 91 touched family identities / 90 fully implemented families / 118 definitions and 141 mapped official source entries; 78 source rows are now `production-batch-3`; `keeper-approved-single-occupation-skill-replacement` is resolved, no active Engine pressure remains, and Clerk / Executive remains the sole source ambiguity
- Phase 5B-2 final Standard occupation closure adding `white-collar-worker-clerk-executive` after upstream English wording and correction evidence resolved the Chinese source's omitted Language qualifier as `Language (Own or Other)`; the definition uses the existing `one-of` selector with no Engine change, completes all 91 families / 119 definitions / 142 mapped official source entries, raises Batch 3 to 79 mapped rows, and leaves no `needs-review` row, active Engine pressure, or unresolved source ambiguity
- deterministic OccupationRegistry cardinality hardening for impossible exact, one-of, all-of, one-branch, and choice-pool requirement structures
- IndexedDB version 1 with `characters`, `creationSessions`, and `kpPresets`
- repositories for Character, CreationSession, creation workflow, and KP Preset
- basic Home, character creation/editor, and KP preset pages
- Phase 5C-1 catalog occupation browser with Registry-backed localized search, category and applicability-era filters, dynamic tag-filter infrastructure, deterministic display sorting, and result counts
- readable occupation previews covering formulas, Credit Rating, eras, sources, all selector structures, Keeper-review markers, variants, definition approval, and skill replacement policy without exposing machine JSON
- Preset occupation-policy presentation that keeps banned occupations visible but unselectable, allows approval-required occupations without creating approval grants, and derives banned status ahead of approval-required status
- explicit catalog occupation selection through the existing Creation Store action, with browse preview kept local, replacement confirmation, preserved skill drafts, catalog snapshot persistence, and custom-selection fallback
- five-step creation stepper with an explicit skills placeholder and explicit review branch; the Phase 4 manual SkillEditor is no longer embedded in the structured occupation creation step
- optional authoritative `Character.eraId` with explicit Standard basic-info selection, refresh persistence, SettingPack membership validation, legacy missing-field compatibility, and no Character/Record/Dexie version change
- era-change confirmation when occupation or skill draft state exists; acceptance preserves catalog/custom occupation, attributes, resources and every structured skill draft field, while cancellation restores the persisted selector value
- shared pure occupation/skill era-availability rules used by the browser and finalizer; browser applicability filtering initializes from Character era but remains local and independently changeable
- occupation browser missing-era, catalog/custom current-selection and per-result compatibility guards that preserve readable incompatible details while disabling selection/continue; Preset approval-required policy remains selectable when era-compatible
- finalize errors `occupation-era-incompatible` and `skill-era-incompatible`, with deduplicated structured SkillRef checks across requirements, replacement, allocations and selected refs; Creation Store blocks missing era for era-bearing settings while the pure finalizer remains legacy-compatible
- catalog-backed occupation requirement selection using only era-compatible concrete Standard SkillRefs, with pure candidate enumeration for ordinary skills and predefined specializations and no required-specialization parent refs
- deterministic exact 1/1 requirement auto-fill on skills entry, preserving existing same-ID drafts and stale selections without touching allocations, approvals, or replacement state
- focused Creation Store requirement-selection upsert/remove API that allows incomplete and temporarily invalid whole selections while preserving every unrelated skill draft field and refresh persistence
- requirement-selection UI for exact, specialization-of, one-of, all-of, one-branch, choice-pool, and any-skill selectors, delegating whole-selection legality to the existing Engine validator
- per-requirement any-skill search, finite-maximum controls, max-one replacement interaction, current-selection display, early cross-requirement duplicate disabling, progress/status presentation, and explicit Keeper guidance/review markers
- unified requirement selections in which catalog and custom refs remain visible, removable, and refresh-persistent without using display names as identity
- skills-step missing-era and incompatible-occupation guards plus Character.eraId filtering that excludes modern-only catalog candidates in the classic era without hiding uncommon skills by sheet placement
- requirement-scoped custom specialization options for open and fixed-name selectors, including era-aware any-skill custom paths and selector-exclusion enforcement
- Creation Store custom specialization creation with Store-owned UUID identity, trimmed display names, outer-cardinality behavior, selector validation, refresh persistence, and current-occupation Language Own single-instance enforcement
- production named-custom specialization instantiation using the selector's localized name without expanding the global Skill Catalog
- Deprogrammer replacement-target UI and Store transition semantics covering normal-selection removal, deterministic exact restoration, non-deterministic non-guessing, derived Hypnosis refs, target progress, refresh persistence, and exact current-occupation/policy approval invalidation
- Character creation with a paired CreationSession in one transaction
- basic character list/delete, name autosave, and refresh persistence
- basic KP preset create/read/update/delete and refresh persistence
- Standard COC7 age input and six attribute generation methods: standard roll, low-roll boost, assign roll, multi roll, point buy, and manual
- injectable random source with testable D6, D10, D100, and general dice helpers
- player-controlled low-roll boost allocation and age reduction allocation
- pure age-band rules, sequential EDU improvement checks, Luck generation, and Half / Fifth calculation
- Base Characteristics → Age Adjustment → Final Characteristics derivation without destructive repeated deductions
- final `Character.age`, `Character.characteristics`, and `Character.luck` persistence
- strongly typed `CreationSession` attribute state with raw rolls, candidates, allocations, age processing, EDU history, and Luck source
- structured `CreationPreset.attributeGeneration` configuration with legacy `attributeMethods` read compatibility
- attribute workflow UI with basic information, attributes, occupation placeholder, restoration, and return-to-edit support
- hardening for mathematically feasible Assign Roll / Point Buy preset constraints
- restorable incomplete Manual drafts and minimum-allocation Point Buy drafts without premature Base Characteristics
- cross-field age consistency plus semantic validation for EDU improvement history and rolled Luck
- overwrite confirmations for regenerated attribute rolls, EDU history, and Luck rolls
- pure Standard COC7 derived rules for Maximum HP, Initial MP, Initial SAN, age-adjusted MOV, structured Damage Bonus, and Build
- read-only derived previews during attributes and resource summaries in the occupation placeholder
- optional strict Character resources containing only current HP, current MP, and current SAN
- atomic resource initialization when attributes complete, plus reset from new final characteristics after returning to edit
- explicit legacy Phase 2 resource initialization without Repository read side effects or Dexie version changes
- legacy resource initialization and repeated attribute completion constrain Initial SAN by existing Cthulhu Mythos in their original single-write transaction paths
- Character Store APIs for current HP constrained by Maximum HP, nonnegative integer current MP without an Initial MP cap, and current SAN constrained by Maximum SAN, all with refresh persistence
- strict SkillDefinition, SkillRef, predefined/custom specialization, CharacterSkill, improvement policy, and creation-point policy models
- closed pure skill base-value rules for fixed and Characteristic full / half / fifth values, reusing existing Half / Fifth helpers
- deterministic SkillRef keys, semantic duplicate validation, policy validation, and real-time base/current/Half/Fifth resolution
- complete Standard Setting core catalog with exactly 54 top-level SkillDefinitions and skill registry duplicate definition/specialization detection
- closed availability metadata for standard/uncommon sheet placement and all/modern-only era semantics
- canonical Fighting, Firearms, Science, Art / Craft, Pilot, and Survival specializations plus open custom specialization policies where applicable
- localized definition/specialization aliases used by Skill Editor search without changing identity or persistence keys
- optional `Character.skills` persistence with legacy Character read compatibility and no Dexie/version change or read-time writeback
- Character Store APIs for skill value and improvement mark editing plus custom specialization create/rename/remove
- reusable searchable skill editor embedded in the existing occupation placeholder, with complete catalog support, alias search, uncommon and modern-only badges, and no creation step or point-allocation UI
- concrete Language (Own) custom specialization identity with EDU-full initialization, stable rename identity, and single-instance domain validation; Language (Other) remains multi-instance
- SettingPack.skills as the sole per-Setting skill content source, with dynamically created and cached Skill Registries and no hard-coded Setting dispatch
- pure `calculateMaximumSanity` derivation from current Cthulhu Mythos, defaulting sparse Mythos state to 0
- pure SAN clamping helper plus explicit legacy reconciliation that leaves over-limit Phase 4A records readable and unchanged until the user chooses to synchronize
- explicit Mythos edits atomically clamp current SAN when required, with pre-save UI confirmation and no automatic SAN recovery when Mythos decreases
- Electronics is fixed at its canonical 10% base while Computer Use remains 5%; both remain modern-only

## Foundation hardening

- Characteristic and Luck are separate at the type and Zod Schema level.
- Occupation formulas and attribute prerequisites accept Characteristic only, not Luck.
- persistent Character and KP Preset record metadata is checked against nested domain data.
- obsolete `occupationName` is absent and rejected by strict record validation.
- the attribute generation enum foundation is present.
- the former unfrozen `OccupationSkillRequirement` variants were replaced by the pressure-tested Requirement + SkillSelector model.

## AttributeGenerationMethod implemented

Merged in the current enum:

- `standard-roll`
- `low-roll-boost`
- `assign-roll`
- `multi-roll`
- `point-buy`
- `manual`

## Not implemented

- occupation/interest point allocation, Credit Rating allocation, Keeper approval interaction, warnings, and skill finalize UI (Phase 5C-3)
- stale-draft/manual-skill conflict handling and custom occupation UI (later Phase 5C work)
- post-creation improvement-roll workflow
- independent final character sheet UI/module
- guide overlay
- import/export and printing/export
- URL / Hash preset sharing
- Setting-specific rules and full Setting content
- static-host deployment automation
- MP natural recovery rules and recovery limits

## Next intended work

Phase 5C-2 is completed. The next intended work is Phase 5C-3 — Skill Point Allocation & Approvals, which remains Not Started and requires separate authorization.

## Known technical risks

- IndexedDB and domain Schema migration
- future import/export compatibility
- Setting-specific extension evolution
- Deprogrammer's former `keeper-approved-single-occupation-skill-replacement` pressure is resolved by an occupation-level singular exact replacement policy with explicit target and target-scoped Keeper approval; there is no active Engine pressure
- Keeper Criminal's former `choice-pool-with-repeatable-specialization-branch` pressure is resolved by the top-level-only `choice-pool` selector, which separates selected category count from selected SkillRef count
- browser storage can be cleared, and long-term file backup is not implemented
