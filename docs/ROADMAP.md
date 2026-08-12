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

Status: In Progress

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

Status: In Progress

#### Phase 5B-1 — Verified Standard Occupation Data Pilot

Status: Implemented

- first production pilot: 12 canonical families / 15 definitions
- verified PDF source/page metadata and explicit Journalist / Missionary mechanics variants
- production module, Registry static validation, source audit document, and dataset regression tests

#### Phase 5B-2 — Full Verified Standard Dataset

Status: In Progress

##### Phase 5B-2-A — Full Standard Occupation Intake Audit

Status: Completed

- complete Keeper Rulebook + Investigator Handbook source-entry inventory
- canonical-family and mechanical-variant analysis
- complete Excel crosswalk, duplicate audit, source-boundary classification, and import-batch plan

##### Phase 5B-2-B — Bulk Verified Production Import

Status: In Progress

- Batch 1 completed: `clergy`, `elected-official`, `judge`, and `museum-curator`
- Batch 2 completed: Batch 2A added 14 production definitions, Batch 2B added 15 production definitions, and the Engine-pressure cleanup added `one-branch` plus `bounty-hunter`, `cowboy`, and `tribe-member`
- Batch 2 coverage is 32 production definitions across its imports and 36 mapped official source entries; the former `exclusive-selector-branch-with-repeatable-selection` pressure is resolved without changing `one-of`
- Batch 3 in progress: Batch 3A completed 17 production definitions across 16 families, Batch 3B completed 16 canonical definitions across 16 families, Batch 3C completed 11 definitions across five source-variant families, and Batch 3D added 10 definitions while fully completing four of five touched families; together they map 65 official source entries as `production-batch-3`
- Batch 3D withheld only Clerk / Executive because the official Chinese source leaves `Language` ambiguous between Own and Other; current coverage is 89 touched family identities / 88 fully implemented families / 105 definitions, with 3 families / 14 expected definitions remaining: Clerk / Executive, `criminal` (12), and the separately reviewed `deprogrammer` pressure case
- enter the remaining confirmed Standard occupation definitions in complexity-based batches
- preserve mechanical source variants and source/page metadata
- use the Excel only as an intake checklist and re-verify every production mechanical field against official PDFs

### Phase 5C — Creation UI

Status: Not Started

- occupation search, categories, tags and era filters
- requirement/custom specialization selection
- occupation/interest point allocation, approvals and warnings
- explicit handling of stale drafts and Phase 4 manual skill conflicts

## Later

- background
- equipment
- weapons
- final character sheet UX
- guide overlay
- KP preset sharing
- import / export
- printing / export
- Gaslight
- Down Darker Trails
- Dark Ages
- Regency

Order after Phase 5 is not frozen.
