# Current State

Last updated: 2026-08-10

## Current completed phase

Project Foundation

## Git baseline

Foundation PR: [#1 feat: initialize COCSheet project foundation](https://github.com/DEATHTDM/COCSheet/pull/1)

Merged to `main` as `ac41a9a186d1b9d48d619390814ac3d3a82d1c72`.

## Implemented

- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- five minimal SettingPack placeholders and a unified Setting Registry
- internal Extension Registry and allow-listed extension IDs
- minimal `Character`, `CreationSession`, and `CreationPreset` schemas
- Occupation schema, occupation point formula calculation, and attribute prerequisite validation foundations
- IndexedDB version 1 with `characters`, `creationSessions`, and `kpPresets`
- repositories for Character, CreationSession, creation workflow, and KP Preset
- basic Home, character creation/editor, and KP preset pages
- Character creation with a paired CreationSession in one transaction
- basic character list/delete, name autosave, and refresh persistence
- basic KP preset create/read/update/delete and refresh persistence

## Foundation hardening

- Characteristic and Luck are separate at the type and Zod Schema level.
- Occupation formulas and attribute prerequisites accept Characteristic only, not Luck.
- persistent Character and KP Preset record metadata is checked against nested domain data.
- obsolete `occupationName` is absent and rejected by strict record validation.
- the attribute generation enum foundation is present.
- `OccupationSkillRequirement` is explicitly marked unfrozen pending real-data pressure tests.

## AttributeGenerationMethod currently known

Merged in the current enum:

- `standard-roll`
- `assign-roll`
- `multi-roll`
- `point-buy`
- `manual`

`low-roll-boost` is planned but is not present in the current enum or merged implementation.

## Not implemented

- real attribute generation
- age adjustment
- Character attribute fields and derived values
- skills and skill allocation
- occupation data and occupation UI
- independent final character sheet UI/module
- guide overlay
- import/export and printing/export
- URL / Hash preset sharing
- Setting-specific rules and full Setting content
- static-host deployment automation

## Next intended work

Standard COC7: Attributes + Age.

This is intent only. Implementation requires a new explicit task.

## Known technical risks

- IndexedDB and domain Schema migration
- future import/export compatibility
- Setting-specific extension evolution
- Occupation schema not yet pressure-tested with full real data
- browser storage can be cleared, and long-term file backup is not implemented
