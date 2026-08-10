# Current State

Last updated: 2026-08-10

## Current phase

Phase 4 — Skills (In Progress)

Phase 4A — Skills Foundation & Representative Catalog completed. Phase 4B — Standard Skill Catalog remains pending.

## Git baseline

Phase 4A branch was created from `main` at `1084d5c220fde1055d4286e4963aded08c09f142`.

## Implemented

- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- five registered SettingPacks, with representative skills only in Standard and empty content placeholders for the other settings
- internal Extension Registry and allow-listed extension IDs
- minimal `Character`, `CreationSession`, and `CreationPreset` schemas
- Occupation schema, occupation point formula calculation, and attribute prerequisite validation foundations
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
- Character Store APIs for current HP constrained by Maximum HP, nonnegative integer current MP without an Initial MP cap, and current SAN constrained to 0～99, all with refresh persistence
- strict SkillDefinition, SkillRef, predefined/custom specialization, CharacterSkill, improvement policy, and creation-point policy models
- closed pure skill base-value rules for fixed and Characteristic full / half / fifth values, reusing existing Half / Fifth helpers
- deterministic SkillRef keys, semantic duplicate validation, policy validation, and real-time base/current/Half/Fifth resolution
- Standard Setting representative skill catalog and skill registry with duplicate definition/specialization detection
- representative Accounting, Credit Rating, Cthulhu Mythos, Dodge, Library Use, Spot Hidden, Fighting, Firearms, Language, Science, Art / Craft, and Survival data
- optional `Character.skills` persistence with legacy Character read compatibility and no Dexie/version change or read-time writeback
- Character Store APIs for skill value and improvement mark editing plus custom specialization create/rename/remove
- reusable searchable skill editor embedded in the existing occupation placeholder, without adding a creation step or point-allocation UI

## Foundation hardening

- Characteristic and Luck are separate at the type and Zod Schema level.
- Occupation formulas and attribute prerequisites accept Characteristic only, not Luck.
- persistent Character and KP Preset record metadata is checked against nested domain data.
- obsolete `occupationName` is absent and rejected by strict record validation.
- the attribute generation enum foundation is present.
- `OccupationSkillRequirement` is explicitly marked unfrozen pending real-data pressure tests.

## AttributeGenerationMethod implemented

Merged in the current enum:

- `standard-roll`
- `low-roll-boost`
- `assign-roll`
- `multi-roll`
- `point-buy`
- `manual`

## Not implemented

- complete Standard skill catalog (Phase 4B)
- skill allocation and improvement-roll workflows
- occupation data and occupation UI
- independent final character sheet UI/module
- guide overlay
- import/export and printing/export
- URL / Hash preset sharing
- Setting-specific rules and full Setting content
- static-host deployment automation
- MP natural recovery rules and recovery limits

## Next intended work

Phase 4B remains pending and requires a new explicit task. Phase 5 is not started or authorized by this document.

## Known technical risks

- IndexedDB and domain Schema migration
- future import/export compatibility
- Setting-specific extension evolution
- Occupation schema not yet pressure-tested with full real data
- browser storage can be cleared, and long-term file backup is not implemented
