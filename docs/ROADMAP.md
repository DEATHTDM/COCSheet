# COCSheet Roadmap

Roadmap 只表示开发方向与依赖顺序，不授权实现任何功能。进入任何 Phase 前都需要新的明确任务。

## Phase 1 — Project Foundation

Status: Completed

- Vue / TypeScript / Vite
- Router
- Pinia
- Dexie
- Zod
- Vitest
- Character / CreationSession separation
- Setting Registry
- Extension Registry
- Repository Layer
- KP Preset foundation
- Foundation hardening

## Phase 2 — Standard Attributes & Age

Status: Completed

- Attribute generation
- Age adjustment
- EDU improvement
- Luck
- Half / fifth values
- Persistence and restoration

## Phase 3 — Derived Character Values

Status: Completed

- HP
- Initial MP
- Initial SAN
- MOV
- Damage Bonus
- Build
- current HP / MP / SAN resources
- persistence, legacy compatibility, and resource restoration

## Phase 4 — Skills

Status: Completed

- Phase 4A Skills Foundation & Representative Catalog: Completed
- Phase 4B Standard Skill Catalog: Completed

- complete 54-definition Standard core skill catalog
- specialization model and stable SkillRef identity
- base-value rules
- game-time skill editing and growth-mark state
- availability and alias metadata
- Maximum SAN and Cthulhu Mythos resource integration
- legacy-compatible Maximum SAN initialization and explicit reconciliation

## Phase 5 — Occupation Engine & Standard Occupations

Status: Completed

### Phase 5A — Occupation Engine Foundation

Status: Completed

- pressure-tested Occupation requirement and SkillSelector schema
- closed occupation formulas and pure budget/finalize rules
- Occupation Registry and era validation
- CreationSession occupation snapshot and skill allocation state
- Credit Rating, approval reasons, manual-skill conflict and Preset skill limit foundations
- atomic Character.skills + review completion path
- source-annotated real occupation test fixtures only

### Phase 5B — Verified Standard Occupation Data

Status: Completed

#### Phase 5B-1 — Verified Standard Occupation Data Pilot

Status: Completed

- first production pilot: 12 canonical families / 15 definitions
- verified PDF source/page metadata and explicit Journalist / Missionary mechanics variants
- production module, Registry static validation, source audit document, and dataset regression tests

#### Phase 5B-2 — Full Verified Standard Dataset

Status: Completed

##### Phase 5B-2-A — Full Standard Occupation Intake Audit

Status: Completed

- complete Keeper Rulebook + Investigator Handbook source-entry inventory
- canonical-family and mechanical-variant analysis
- complete Excel crosswalk, duplicate audit, source-boundary classification, and import-batch plan

##### Phase 5B-2-B — Bulk Verified Production Import

Status: Completed

- Batch 1 completed: `clergy`, `elected-official`, `judge`, and `museum-curator`
- Batch 2 completed: Batch 2A added 14 production definitions, Batch 2B added 15 production definitions, and the Engine-pressure cleanup added `one-branch` plus `bounty-hunter`, `cowboy`, and `tribe-member`
- Batch 2 coverage is 32 production definitions across its imports and 36 mapped official source entries; the former `exclusive-selector-branch-with-repeatable-selection` pressure is resolved without changing `one-of`
- Batch 3 completed: Batch 3A completed 17 production definitions across 16 families, Batch 3B completed 16 canonical definitions across 16 families, Batch 3C completed 11 definitions across five source-variant families, Batch 3D now contains 11 definitions after the final Clerk / Executive source clarification, Batch 3E plus the Keeper Criminal cleanup completed all 12 Criminal variants, and Batch 3F resolved Deprogrammer through a singular occupation-level skill replacement policy; together they map 79 official source entries as `production-batch-3`
- final Standard coverage is 91 fully implemented families / 119 production definitions / 142 mapped official source entries; there is no active Engine pressure and no `needs-review` Standard source row
- preserve mechanical source variants and source/page metadata
- use the Excel only as an intake checklist and re-verify every production mechanical field against official PDFs

### Phase 5C — Creation UI

Status: Completed

#### Phase 5C-1 — Occupation Browser & Catalog Selection

Status: Completed

- search plus category, applicability-era, and dynamic tag filters
- readable occupation detail and selector presentation
- Preset occupation-policy presentation
- explicit persisted catalog selection with local-only preview
- five-step creation-flow scaffold

#### Phase 5C-1.5 — Persistent Era Context & Availability Guard

Status: Completed

- optional authoritative Character era context with explicit selection and refresh persistence
- shared pure occupation/skill availability rules
- occupation browser visibility, selection, current-draft, and missing-era guards
- structured skill finalizer era errors without destructive draft cleanup
- legacy Character compatibility with unchanged Character/Record/Dexie versions

#### Phase 5C-2 — Requirement Selection

Status: Completed

##### Phase 5C-2A — Catalog-backed Requirement Selection

Status: Completed

- era-compatible concrete catalog candidates for ordinary skills and predefined specializations
- deterministic exact requirement auto-fill with draft-safe Store APIs
- exact, specialization-of, one-of, one-branch, choice-pool, all-of, and any-skill interaction
- incomplete and invalid intermediate draft persistence with Engine-backed whole-selection status
- explicit unsupported-custom state without fabricated SkillRefs

##### Phase 5C-2B — Custom Specializations & Replacement Target

Status: Completed

- custom specialization creation
- named-custom specialization instantiation
- any-skill custom specialization path
- Deprogrammer replacement target interaction
- deterministic requirement restoration and replacement approval invalidation

#### Phase 5C-3 — Skill Point Allocation & Approvals

Status: Completed

##### Phase 5C-3A — Skill Point Allocation Workspace

Status: Completed

- occupation and interest allocations
- Credit Rating allocation
- interest-only catalog skills and custom specializations
- live base/allocation/final preview from the existing Engine plan
- budget, limit, eligibility, era, and allocation issue presentation

##### Phase 5C-3B — Keeper Approvals & Skill Finalization

Status: Completed

- Keeper approval interaction
- Credit Rating override action
- warning acknowledgement
- skill completion and review transition UI

#### Phase 5C-4 — Conflict & Custom Occupation UX

Status: Completed

##### Phase 5C-4A — Conflict & Stale Draft Resolution

Status: Completed

- explicit Phase 4 manual-skill rebuild confirmation
- stale occupation draft conflict presentation from existing Engine errors
- explicit occupation reset preserving interest skills and restoring deterministic requirements
- Review round-trip protection from false manual-skill conflicts

##### Phase 5C-4B — Custom Occupation Builder

Status: Completed

- current-investigator custom occupation Builder with safe closed formula and skill-category controls
- create/edit snapshot persistence, Preset policy handling, and full structured Skills → Finalize → Review integration

## Phase 6 — Investigator Identity & Backstory

Status: Completed

- optional Character sex, residence, and birthplace identity details with legacy-compatible persistence
- Character-owned backstory across six creation and four game-time categories
- stable entry UUID identity and entry-ID Key Connection reference
- pure creation validation for 3～6 creation entries and one initial Key Connection
- Basic Info → Attributes → Occupation → Skills → Background handoff, later extended by Phase 7A through Possessions → Review
- dedicated Background creation UI and expanded creation Review summary
- unchanged Character/Record/Dexie version 1 with no new table or read-time migration

## Phase 7 — Wealth, Gear & Weapons

Status: In Progress

### Phase 7A — Standard Wealth & Possessions Foundation

Status: Completed

- pure Standard 1920s / Modern wealth rules derived from era + finalized Credit Rating
- integer minor-unit current cash/assets in Character with UUID-backed asset descriptions
- CreationSession initialization provenance and explicit stale/reset semantics
- Background → Possessions → Review flow and dedicated wealth UI
- unchanged Character/CreationSession/Record/Dexie version 1 with no read-time writeback

### Phase 7B — Character Gear & Possessions

Status: Completed

- free-form ordinary Character possessions with Store-owned UUID identity and optional notes
- independent from wealth initialization, provenance, asset entries, Cash, and Spending Level
- Possessions-step CRUD and separate Review presentation
- no ordinary Standard equipment catalog or purchasing system

### Phase 7C — Standard Weapons Catalog & Character Weapons

Status: Not Started

## Later

- final character sheet UX
- guide overlay
- KP preset sharing
- import / export
- printing / export
- Gaslight
- Down Darker Trails
- Dark Ages
- Regency

Later-item ordering after Phase 7 is not frozen.
