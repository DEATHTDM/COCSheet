# Current State

Last updated: 2026-08-10

## Current phase

Phase 5 — Occupation Engine & Standard Occupations (In Progress)

Phase 5A — Occupation Engine Foundation is completed. Phase 5B — Verified Standard Occupation Data and Phase 5C — Creation UI have not started.

## Git baseline

Phase 4B branch was created from `main` at `fa59171ffa28a9bb1790a3d803dfb9e3d4fa3892`.

## Implemented

- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- five registered SettingPacks, with the complete core skill catalog only in Standard and empty content placeholders for the other settings
- internal Extension Registry and allow-listed extension IDs
- minimal `Character`, `CreationSession`, and `CreationPreset` schemas
- Occupation schema, occupation point formula calculation, and attribute prerequisite validation foundations
- closed OccupationRequirement + SkillSelector model with stable requirement IDs, cardinality, fixed-name custom specialization, finite candidates, exclusions and declarative composition
- hardened OccupationPointFormula schema with duplicate-free best-of attributes and all verified Standard formula shapes
- OccupationRegistry sourced only from SettingPack.occupations, with localized search and category/tag/era filters plus registration validation
- explicit source mechanics variants through variantOf, while guidance-only source wording shares canonical mechanics and multiple sourceRefs
- strongly typed CreationSession occupation mechanics snapshot and skill creation state containing requirement selections, SkillRef allocation rows, Credit Rating override and reasoned Keeper approvals
- pure occupation/interest budget, selection uniqueness, creation-point policy, Credit Rating range, skill final-limit and unused-point warning rules
- pure structured-allocation conflict detection for existing Phase 4 Character.skills, with no silent adoption, reverse engineering or overwrite
- pure finalize plan rebuilding CharacterSkill values from current resolved base + occupation allocation + interest allocation
- optional lightweight Character occupation identity snapshot without copied occupation mechanics
- explicit custom occupation foundation with UUID identity and eight-requirement-slot limit
- skills CreationStep and pure occupation-switch/reset draft actions that preserve allocations until explicit reset
- atomic skills completion through Creation Workflow Repository, writing Character occupation/skills and advancing CreationSession to review in one Dexie transaction
- legacy CreationPreset.skillCaps read compatibility without inferred mapping or validator effect, alongside explicit final-value skillLimits
- source-annotated Phase 5A test fixtures for ten occupation families (eleven definitions including two Missionary mechanics variants), not production occupation content
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

- production Standard occupation data (Phase 5B)
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

Phase 5B verified Standard occupation data is the next intended work, but is not authorized by this document.

## Known technical risks

- IndexedDB and domain Schema migration
- future import/export compatibility
- Setting-specific extension evolution
- full Standard occupation data still requires entry-by-entry source verification in Phase 5B
- browser storage can be cleared, and long-term file backup is not implemented
