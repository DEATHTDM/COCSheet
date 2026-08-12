# Current State

Last updated: 2026-08-12

## Current phase

Phase 5 — Occupation Engine & Standard Occupations (In Progress)

Phase 5A — Occupation Engine Foundation is completed. Phase 5B — Verified Standard Occupation Data is in progress: Phase 5B-1 pilot, Phase 5B-2-A full Standard intake audit, Batch 1, Batch 2A, Batch 2B, the Batch 2 Engine-pressure cleanup, and the Batch 3A and Batch 3B engineering sub-batches are completed. Formal Batch 2 is completed; Batch 3 remains in progress for the source-variant families and `deprogrammer`. Phase 5C — Creation UI has not started.

## Git baseline

Phase 5B-2 Batch 3B branch was created from `main` at `5dc4acd63e9c0438efce21770459f5f31e1d6c79`.

## Implemented

- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- five registered SettingPacks, with the complete core skill catalog only in Standard and empty content placeholders for the other settings
- internal Extension Registry and allow-listed extension IDs
- minimal `Character`, `CreationSession`, and `CreationPreset` schemas
- Occupation schema, occupation point formula calculation, and attribute prerequisite validation foundations
- closed OccupationRequirement + SkillSelector model with stable requirement IDs, cardinality, fixed-name custom specialization, finite candidates, exclusions, declarative composition, and exclusive `one-branch` selection with branch-local cardinality
- hardened OccupationPointFormula schema with duplicate-free best-of attributes and all verified Standard formula shapes
- OccupationRegistry sourced only from SettingPack.occupations, with localized search and category/tag/era filters plus registration validation
- explicit source mechanics variants through variantOf, while guidance-only source wording shares canonical mechanics and multiple sourceRefs
- strongly typed CreationSession occupation mechanics snapshot and skill creation state containing requirement selections, SkillRef allocation rows, Credit Rating override and reasoned Keeper approvals
- pure occupation/interest budget, selection uniqueness, one-of child-selector one-to-one assignment, one-branch whole-selection exclusivity, creation-point policy, occupation-scoped Credit Rating range override, skill final-limit and unused-point warning rules
- pure structured-allocation conflict detection for existing Phase 4 Character.skills, with no silent adoption, reverse engineering or overwrite
- pure finalize plan rebuilding CharacterSkill values from current resolved base + occupation allocation + interest allocation, followed by Phase 4 Character.skills domain validation
- optional lightweight Character occupation identity snapshot without copied occupation mechanics
- explicit custom occupation foundation with UUID identity and an eight-occupational-skill capacity proof based on requirement cardinality; one-branch counts the maximum capacity of one branch rather than summing mutually exclusive branches
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
- deterministic OccupationRegistry cardinality hardening for impossible exact, one-of and all-of requirement structures
- IndexedDB version 1 with `characters`, `creationSessions`, and `kpPresets`
- repositories for Character, CreationSession, creation workflow, and KP Preset
- basic Home, character creation/editor, and KP preset pages
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

- verified Standard occupation production data beyond completed Phase 5B-2 Batch 3B
- occupation browsing, requirement selection and skill allocation UI (Phase 5C)
- post-creation improvement-roll workflow
- independent final character sheet UI/module
- guide overlay
- import/export and printing/export
- URL / Hash preset sharing
- Setting-specific rules and full Setting content
- static-host deployment automation
- MP natural recovery rules and recovery limits

## Next intended work

Phase 5B-2 Batch 3 is in progress after Batch 3B. Remaining work is the 11 known source-variant families plus the separately reviewed `deprogrammer` pressure case, but this document does not authorize that later import or Engine work.

## Known technical risks

- IndexedDB and domain Schema migration
- future import/export compatibility
- Setting-specific extension evolution
- `deprogrammer` remains the only unresolved Engine pressure because its Keeper-approved Hypnosis replacement of one existing occupation skill is not yet expressible
- the 11 remaining Standard source-variant families still require entry-by-entry source verification; `deprogrammer` separately requires a deliberate Engine-pressure decision
- browser storage can be cleared, and long-term file backup is not implemented
