# Current State

Last updated: 2026-08-27

## Current phase

Phase 19A — Fan Material & Licensing Compliance (Completed)

公开 repository 与网站现在明确分开原创软件代码的 GPL-3.0-only 范围，以及 Call of Cthulhu／Chaosium 第三方商标、fan/game content、publication-derived data 与 source references 的独立权利边界。新增静态 `/legal`、官方 required notice、root NOTICE、内容审计与 release guard；网站仍免费、非商业、非官方、Zero Server，版本保持 0.1.0。Phase 19A 不构成法律意见，也不表示 v1.0 已获确认可发布；公开 source distribution 与 bundled structured game data 仍需独立许可复审。

## Git baseline

Phase 19A was created from exact `main@a292647e9df9f776dd54735b3867dcfb306fd4e0`, the merged Phase 18 closure baseline.

## Implemented

- official Chaosium Fan Material Policy, Fan-Use and Licensing Q&A, Trademarks and Copyrights, and BRP ORC information rechecked on 2026-08-27, using only Chaosium official sources
- exact current required Fan Material notice kept in one static application source and rendered in plainly legible English on the independent `/legal` route, with no runtime policy fetch, API, analytics or telemetry
- Legal page and global footer disclosure for an unofficial fan project, free/no-charge/no-paid-feature operation, trademark ownership, original-code GPL scope, excluded third-party/fan content, NOTICE, repository and official-policy links
- root `NOTICE.md`, README, CONTRIBUTING, AGENTS, Issue Forms, release checklist, product/context/architecture docs and content audit aligned on the separate code-license versus fan-content boundary
- conservative redistribution guidance: GPL rights in original code do not promise commercial rights in bundled Chaosium material; commercial users must obtain applicable permission or remove/replace the affected bundled material
- complete tracked-tree audit covering `src/content/standard/**`, `src/coc7/rules/**`, `src/coc7/types/**`, tests, fixtures, audit scripts/data, docs, UI, assets and static build inputs; no long book prose or scenario text found, while structured occupation audit tables remain called out for independent review
- current tree and full-history filename/blob audit finding no PDF, scan, screenshot, official artwork/logo/sign, map, font, archive or other binary candidate, with no current deletion or history rewrite required
- release compliance static guard for package version 0.1.0, `private: true`, GPL metadata, required notice clauses and `/legal` route, included in CI validation
- route/page/footer/NotFound-safe unit coverage plus desktop/mobile production-preview E2E for required notice visibility, safe external links, return Home, console/page errors and document overflow
- unchanged Character, CreationSession, CreationPreset and Record schemas; unchanged Dexie version/tables/indexes, v1 portability/share formats, dependencies and CoC rules mechanics
- unresolved release review remains explicit: Fan Policy treatment of downloadable public source plus bundled CoC data, the scope of structured catalogs/audit CSV, and GPL/fan-policy distribution compatibility require independent legal/licensor review before v1.0 is described as publishable

- pure `characterLibraryPresentation` derivation from `CharacterStore.records` plus the existing CreationSession step map, with one creation-status calculation per visible candidate and no Repository/Dexie/N+1 search path
- trimmed, immediate substring search across Character name, occupation Chinese/English display-name snapshot, residence and birthplace only; English matching is case-insensitive and internal UUIDs, machine IDs, source/provenance and full domain text are excluded
- orthogonal all/complete/incomplete/missing-session filters reusing `getCharacterCreationStatus(...)`, while historical unsupported Setting compatibility remains independent and all existing safe card actions are preserved
- default updatedAt descending, explicit ascending and zh-CN name sorting, with deterministic Record-ID tie-breaks and no mutation of `CharacterStore.records`
- total versus filtered visible counts, true-empty versus filtered-empty states, and a clear action that resets only query/status while preserving sort and every unrelated preference
- deletion and single/full-library imports recomputing the visible list from existing reactive Store refresh behavior without resetting query, status or sort; no portability architecture change was required
- responsive desktop/mobile controls with production-preview Chromium coverage for real search, filtering, sorting, clearing, console/page errors and document-level overflow
- unchanged Character, CreationSession, CreationPreset and Record version 1; unchanged Dexie version/tables/indexes and all three v1 portability/share formats; unchanged dependencies and CoC rules mechanics

- compact, permanently visible Home “本地数据安全” guidance covering local-only storage, no automatic upload/sync, site-data clearing, private browsing, browser/profile/device loss and regular full-backup practice without a blocking modal
- isolated browser Storage Persistence adapter that checks `persisted()` on Home, calls `persist()` only after the explicit “请求持久保存” action, and keeps persisted/not-persisted/unsupported/rejected states nonfatal without Dexie or domain access
- accurate UI contract that persistent storage only reduces automatic eviction risk and never means backup, permanent safety, cloud protection or resistance to explicit clearing/device loss
- local runtime error state fed by Vue `app.config.errorHandler`, `window error` and `unhandledrejection`, with continued `console.error` plus a Chinese App recovery panel for reload, Home, privacy-safe diagnostics and GitHub feedback
- mount/bootstrap `try/catch` static DOM fallback independent from Vue Router, Pinia and Dexie, using only safe text nodes and no raw error message/stack presentation
- single build metadata source combining `package.json` version 0.1.0 with build-time SHA; local fallback is `dev`, ordinary footer uses a 12-character SHA, and diagnostics retain the full injected SHA
- CI exact metadata injection: Validate builds PR exact head SHA or dispatched/push `github.sha`; Pages builds exact main `github.sha`; static artifact checks assert the expected full SHA is embedded
- local privacy-safe diagnostics containing version, build SHA, timestamp, userAgent, language, sanitized route and optional runtime error count, with every query removed and Character/Preset dynamic paths normalized so share tokens and UUIDs are absent
- Clipboard failure-safe readonly manual diagnostics plus no Character, CreationSession, Preset, IndexedDB, localStorage, backup or clipboard reads and no analytics, telemetry, remote logging or crash upload
- formal catch-all Hash Router Not Found page with Home/Create recovery, and App navigation terminology corrected from “KP 建卡预设” to “建卡预设”
- committed fictitious historical fixtures for `cocsheet-character v1`, `cocsheet-library v1` including non-Standard identities, and one already-encoded `cocsheet-kp-preset-share v1` token, all verified through current parser/Repository boundaries
- `@playwright/test` as the only new dev dependency, with production build + Vite preview Chromium projects split into desktop 1280×900 core smoke and mobile 390×844 small smoke
- real-page E2E for Home safety/version/backup, deterministic manual Basic Info → Attributes completion, incomplete Character Home/Final Sheet/print, Standard Preset edit/persistence/share URL, full-backup download/JSON protocol, fixed library fixture import, Not Found recovery and mobile Home/Create/Editor/Final Sheet
- shared E2E assertions for unfiltered `console.error`, `pageerror` and document-level horizontal overflow; Validate installs Chromium and runs E2E, while PR Pages build/deploy remain skipped and main Pages still waits for Validate
- public release README, practical `CONTRIBUTING.md`, privacy-warning Bug/Feature Issue Forms and reusable `docs/RELEASE_CHECKLIST.md`
- unchanged Character, CreationSession, CreationPreset and Record version 1; unchanged Dexie version/tables/indexes and all three v1 portability/share formats; no CoC rules mechanics change

- durable player-facing terminology contract in `docs/UI_TERMINOLOGY.md`, including the strict separation of 本职技能 and 技能专攻
- concise reusable desktop/mobile browser acceptance contract in `docs/UX_QA_CHECKLIST.md` plus matching `AGENTS.md` requirements
- Chinese-first player presentation across Home, creation, occupations, skills, background, wealth/possessions, Review, Final Sheet, print, KP Presets and shared-Preset reception
- readable compatibility and missing-catalog messages that explain available actions without exposing snapshot, orphan, definition, validator, provenance, stale or similar implementation vocabulary
- semantic regression coverage for 本职技能、兴趣技能、技能专攻、本职技能点、兴趣技能点、信用评级与守秘人确认
- production-like 1280 × 900 and 390 × 844 browser acceptance with real workflow actions, route reuse, console and document-overflow checks
- unchanged Character, CreationSession, CreationPreset and Record schemas; unchanged Dexie version/tables/indexes and all version-1 portability/share envelopes; no dependency or rules-mechanics change

- explicit receiver-local save action for valid supported shared KP Presets, with opening the link remaining zero-write
- Preset Store-owned fresh UUID creation that preserves every other normalized CreationPreset field without mutating or substituting the shared preview
- ordinary KPPresetRepository create semantics and Store list refresh, so the saved copy naturally supports existing edit/share/delete/create and `cocsheet-library v1` backup workflows without origin metadata or special badges
- same-shared-ID local collision independence: an existing global Preset remains untouched while every explicit save creates a distinct fresh-ID copy, with no overwrite, merge, name/content dedupe or fingerprint state
- page-local idle/saving/saved/error UX that prevents same-instance duplicate clicks, keeps preview and direct creation usable after failure, provides an optional editor link after success, and resets on token change/removal
- route request-sequence guarding for save completion/error UI, so an already-started A write may finish but cannot publish transient state into token B
- direct creation after local save continuing to snapshot the original shared Preset ID, while later creation from the ordinary local copy snapshots its fresh local ID
- unsupported historical and invalid/future shares exposing no save action; Store independently rejects unsupported save before Repository/DB write with no Standard fallback
- exactly one new KPPreset Record write per successful save, with no Character, CreationSession or Guided / Quick preference write
- unchanged `cocsheet-kp-preset-share v1` and `cocsheet-library v1` formats; unchanged Character, CreationSession, CreationPreset, Record and Dexie version 1, tables and indexes
- realtime Guided readiness presentation with `needs-attention`, `ready`, and `ready-with-warning`, plus structurally separate blockers, pending approvals, and warnings
- Basic Info readiness and `goToAttributes()` sharing one pure precondition helper without adding a name requirement or other new field rule
- direct Attributes `getCompletionErrors()`, Skills `getSkillFinalizePlan()`, Background `validateCreationBackstory()`, and Possessions `validateCreationWealth()` reuse, with thrown skill-plan preconditions converted to readable Guide blockers instead of page errors
- Occupation Guide readiness and the real Continue button sharing one transition status for missing era/selection, Preset bans, custom-occupation policy, and era compatibility
- Review terminal guidance for checking results, returning to edits, or opening the Final Character Sheet without a new Character completion flag
- compact seven-step Guided progress derived only from `CreationSession.currentStep` plus `creationGuideSteps` ordering; earlier steps are “已走过”, later steps are pending again after a return, with no visited state or clickable navigation
- reactive Guide updates from existing Vue / Pinia state with zero Guide writes, no automatic scroll/focus/coachmark, and unchanged real action error handling
- Quick mode hiding all Phase 15 progress/readiness while retaining its existing browser preference and full-width workspace semantics
- unsupported historical Setting Editor continuing to stop before Guide/readiness or Standard workflow validators, with no Standard fallback
- unchanged Character / CreationSession / CreationPreset and Record version 1, unchanged Dexie version/tables/indexes, and unchanged `cocsheet-character` / `cocsheet-library` / `cocsheet-kp-preset-share` v1 formats
- independent supported Setting boundary with `supportedSettingIds = ["standard"]` and `isSupportedSetting(...)`, while `settingIdSchema` deliberately retains all five historical IDs as a backward-compatible domain/file identity enum
- production Setting Registry and `getAvailableSettings()` containing only `standardSettingPack`; four empty non-Standard placeholder packs removed, with a separate display-only historical label map that does not expose content or imply support
- same-Setting Skill / Occupation / Weapon registries returning empty content for historical unsupported IDs, preserving orphan presentation and proving no Standard catalog or rules fallback
- one explicit Standard CoC 7E Create entry with Guided / Quick unchanged, supported local KP Presets available, and historical local Presets visibly disabled for creation
- Creation Store `start` boundary rejecting programmatic unsupported Setting creation before Character or CreationSession writes, without normalization or fallback
- new KP Presets fixed to Standard, Standard editor identity shown read-only instead of a single-option select, Store save boundary rejecting unsupported IDs, and historical global Presets remaining identifiable, read-only, exportable through Library backup, and deletable
- valid historical non-Standard `cocsheet-kp-preset-share v1` tokens still decoding to a transient preview, with an explicit unsupported message, removable `kp` query, no create action, and zero Character / Session / global Preset writes
- historical non-Standard Character and CreationSession schemas, single-Character export/import, full-library backup, Home listing/export/delete, Final Sheet, and printable presentation preserved without conversion or load-time writeback
- unsupported historical Creation Editor safe state before Guide or rule-workspace mount, with direct Final Sheet/Home navigation and no claim that the incomplete legacy creation flow remains supported
- unchanged Character / CreationSession / CreationPreset and Record version 1, unchanged Dexie version/tables/indexes, unchanged `cocsheet-character` / `cocsheet-library` / `cocsheet-kp-preset-share` v1 envelopes, and no migration or user-data deletion
- Phase 13A `CI & Pages` GitHub Actions workflow for Pull Requests, `main` pushes, and manual validation runs, with no production deployment path for Pull Requests or arbitrary feature branches
- isolated `validate` job on Node.js 22 with frozen pnpm 11.21.0 installation, committed-range whitespace checks, the complete Vitest suite, Vite production build, lightweight `dist/index.html` and relative-asset verification, occupation audit, and Standard weapon audit
- job-scoped least privilege: validation has only `contents: read`; Pages artifact construction has only repository/Pages read access; only deployment receives `pages: write` and `id-token: write`, with no `contents: write`, `write-all`, secrets, or failure suppression
- validated-main-only Pages artifact construction with an exact-commit checkout, the same Node/frozen-install toolchain, a fresh production build, and `dist/` as the sole upload boundary
- standard `github-pages` environment deployment with the action-produced Page URL, validation/build dependency gating, and `github-pages` concurrency cancellation to prevent competing production deployments
- retained Hash Router plus relative Vite base portability, verified under a nested `/COCSheet/` static path without hardcoded owner, repository path, production origin, history-router rewrite, or 404 fallback
- application-code-only deployment boundary: no IndexedDB, localStorage preference, Character, CreationSession, CreationPreset, portability file, test fixture, dependency tree, environment file, or other user/local data enters the Pages artifact
- production `main` push run [32646779385](https://github.com/DEATHTDM/COCSheet/actions/runs/32646779385), rerun attempt 2, completed successfully at `e9f0f65e2c7dc35d9f42fc9ec3cc68071a2efa4f`: Validate, Build Pages artifact, and Deploy GitHub Pages all succeeded, with the artifact produced from `dist/` and deployment through the `github-pages` environment
- live production endpoint <https://deathtdm.github.io/COCSheet/> verified with root, JavaScript, and CSS HTTP 200 responses, successful application startup, working Hash Router `#/` and `#/create` routes, an application-level missing-Character state instead of a server 404, and zero browser console errors
- independent `/characters/:id/print` route and Final Sheet “打印 / PDF” entry, with Character A → B route reuse reload and a Character-name document title suitable for browser Save as PDF
- Character-only print loading through `CharacterStore.loadById`; complete, incomplete, legacy no-session and optional-field-missing Characters remain printable without CreationSession, presetSnapshot, Review reconstruction or read-time writeback
- true read-only paper markup instead of mutation workspace reuse, so Final Sheet unsaved input drafts, search/filter controls, catalog browsers, save/delete actions and mutation error state never enter printed output
- pure print-oriented presentation shaping that reuses existing Standard derived values, Maximum SAN, default sparse-skill resolver, stable backstory order, Standard money formatting, same-Setting SkillRegistry and same-Setting orphan-safe weapon presentation with no Standard fallback
- complete persisted identity snapshot, resources/references, eight Characteristics with Half/Fifth, reliable Standard MOV/Damage Bonus/Build, default Final Sheet skills with growth marks, non-empty backstory categories and Key Connection marking, current wealth/assets, ordered duplicate-safe possessions and individually preserved owned weapon instances
- Standard current money plus optional derived Spending Level presentation, while non-Standard legacy wealth stays explicit raw minor-unit data and missing wealth/resources/Characteristics remain visible safe empty states without initialization
- A4 portrait `@page` output with 12 mm margins, black-and-white-readable borders/labels, hidden site header and screen toolbar, full printable app-shell area, natural multi-page flow, and per-row/card break protection without preventing long Skills or Backstory sections from spanning pages
- centered readable screen preview at 1280px plus single-column 390px layout with wrapping skill names, backstory, inventory and weapon mechanics and no A4-forced horizontal overflow
- `window.print()` as the only print / Save as PDF action, with non-fatal fallback guidance if the browser cannot open the print dialog; no Blob, canvas, server conversion or direct PDF binary generation
- zero schema, table, index, migration, DB version, portability format, dependency, package or lockfile changes; print output adds no settings, history, cache or backup metadata
- strict independent `cocsheet-kp-preset-share / formatVersion 1` envelope containing only the full normalized CreationPreset domain data, with no KPPresetRecord metadata, timestamps, Character, CreationSession, exportedAt or creation-experience preference
- stable `1.<base64url(gzip(UTF8(JSON-envelope)))>` token wire format using browser-native CompressionStream / DecompressionStream, unpadded URL-safe alphabet, typed readable errors and no dependency changes
- bounded untrusted-input decoding with 12,000-character token, 8 KiB compressed payload and 64 KiB incrementally-read decompressed JSON limits; unsupported browser compression remains non-fatal
- Hash Router `#/create?kp=...` URL generation through `router.resolve`, preserving origin and GitHub Pages-style base pathname without a second hash or server-visible payload
- per-saved-Preset KPPresetsPage share action using persisted `record.data`, one active readonly URL panel, accessible controls, successful clipboard feedback and manual-copy fallback that retains the URL on Clipboard API absence/denial/failure
- CreateCharacterPage transient shared-Preset loading from `route.query.kp`, explicit multiple-query rejection, valid/loading/error states, name/Setting/attribute-method preview, safe invalid-link UX, and router.replace removal that preserves unrelated query values
- zero-write shared-link opening: no Character, CreationSession, global KPPreset, IndexedDB mutation or Guided / Quick preference mutation occurs before the explicit create action
- explicit `creationStore.start(sharedPreset.settingId, sharedPreset)` semantics preserving every normalized field and original Preset ID in the new CreationSession.presetSnapshot, without temporary/global Preset records
- legal same-ID/different-content receiver global KPPreset independence with no collision, overwrite, merge, local substitution or import write
- request-sequence protection against async route A → B decode races, so only the newest route query can update the preview
- Guided / Quick browser preference isolation from supported Setting enforcement, with no Standard fallback or new Setting content
- unchanged Character/CreationSession/CreationPreset and Record version 1, Dexie version/tables/indexes, `cocsheet-character` v1 and `cocsheet-library` v1
- seven-step contextual Creation Guide covering Basic Info, Attributes, Occupation, Skills, Background, Possessions and Review through exhaustive pure presentation metadata
- persistent Guided / Quick browser UI preference with first-use Guided default, versioned `localStorage` key, safe unknown/read-failure fallback, and in-memory switching that survives write failure
- accessible Create Character mode selector plus persisted CharacterEditor hide/reopen controls shared across Characters, with no mode argument passed into Setting or KP Preset creation
- controlled `CreationGuidePanel` presentation API and Quick full-width workspace with no empty desktop sidebar, while Guided retains the existing responsive Guide rail
- complete mode isolation from currentStep, Character/CreationSession drafts and writes, KP Preset semantics, domain/Record/Dexie version 1, and both version-1 portability formats
- direct Guide synchronization from the real `CreationSession.currentStep`, with no independent guide step, duplicate completion state, second Next/Previous controls, Store mutation or Repository/Dexie access
- Standard-only Guide metadata plus an unsupported historical Creation Editor boundary that mounts no attributes, occupation, skills, wealth, or weapon workflow components
- responsive desktop rail/current-step composition and normal-flow mobile stacking, plus active-step `aria-current="step"`, labelled Guide landmark and accurate `aria-expanded` controls without focus trap or automatic focus movement
- independent strict `Full Library Backup v1` with fixed `cocsheet-library` format, complete Character + corresponding optional CreationSession entries, complete global CreationPreset data, nonnegative export metadata, and no IndexedDB Record wrappers/timestamps
- deterministic outer Character-entry and KPPreset ID ordering while preserving nested Character, Session, allocation, backstory, asset, possession, weapon, SkillRef, Key Connection and Preset domain array order and identity
- one-read-transaction `characters + creationSessions + kpPresets` export snapshot with validation of every local Record, zero writes, explicit orphan Session rejection, empty-library support, and no best-effort skipping or repair
- prevalidated append-only full-library import with strict wrong-format/future-version/domain/cross-object/duplicate rejection before writes, plus conservative local Character/orphan Session/global KPPreset collision checks that cancel the entire package
- one three-table write transaction for all Characters, optional Sessions, and global Presets, with rollback on any entity insertion failure, fresh shared import-time Record timestamps, safe append to a non-empty no-conflict library, and unrelated local data preservation
- CreationSession presetSnapshot and global KPPreset independence even when IDs match and contents differ, with no snapshot linkage reconstruction or mutual overwrite
- independent Home “本地数据备份” controls, confirmation wording, success counts, readable import/export errors, same-file reselection, and immediate Character/session/Preset Store refresh without disturbing Phase 9A controls
- strict `Portable Character Package v1` with fixed `cocsheet-character` format, independent file `formatVersion`, nonnegative epoch-millisecond `exportedAt`, complete Character and optional complete CreationSession domain data
- pure BOM-safe parser/serializer with distinct readable errors for empty/malformed/wrong-format/unsupported-version/Character/Session/cross-object failures, strict top-level validation, two-space JSON and trailing newline
- deterministic safe per-Character `.cocsheet.json` filename plus browser Blob download with object URL revocation and no third-party file library
- one-read-transaction Character + optional Session export consistency using latest persisted domain data and zero writes, without Record wrappers or timestamps
- prevalidated atomic import that creates fresh import-time Character/Session Record metadata, preserves every domain identity and currentStep/provenance, rejects Character or orphan Session collisions, and rolls back Character if Session insertion fails
- legacy/orphan/non-Standard-safe import with no Registry cleanup, Standard fallback, completion validation, recalculation, normalization, fake Session, or unrelated Character mutation
- Session `presetSnapshot` round-trip without importing or conflicting with the global KPPreset library
- Home local file import state, readable errors, same-file reselection, immediate Character/session-step refresh, correct complete/incomplete/missing-session badges, and export controls for all three states
- independent `/characters/:id/sheet` Final Character Sheet route and responsive long-term sheet layout, separate from the seven-step creation editor and creation Review
- Character-only final-sheet data loading: CreationSession is optional and used only for completion status/navigation; missing sessions, incomplete/legacy Character fields, and missing Character error states do not trigger automatic writeback
- Home actions that distinguish Open Character Sheet from Continue/Modify Creation, with explicit completed, incomplete, and missing-session status derived from existing `CreationSession.currentStep`
- Review-to-Final-Sheet completion entry plus Final-Sheet-to-Editor return for Characters that retain a CreationSession, without adding a workflow step or schema enum
- priority final-sheet presentation for identity, final Characteristics with Half/Fifth, Standard derived values, Luck, current resources, and Maximum SAN, followed by stable sorted skills and secondary backstory/wealth/possessions/weapons regions
- direct current HP, current MP, and current SAN editing through existing Character Store APIs, including existing HP/SAN maximum validation, unbounded nonnegative current MP semantics, refresh persistence, and explicit legacy SAN reconciliation without load-time mutation
- focused `FinalSheetResourceWorkspace` owning HP/MP/SAN/Current Luck drafts, validation, busy/error state and prop/route synchronization while `FinalCharacterSheetPage` remains responsible for loading, routing, optional session status and page composition
- direct long-term Current Luck 0～99 maintenance through `CharacterStore.setCurrentLuck → CharacterRepository → Dexie`, including explicit creation of a legacy missing field, refresh persistence, zero read-time writeback and strict isolation from resources, age, Characteristics, skills and CreationSession Luck provenance
- Current Luck maintenance intentionally does not call creation Luck generation/validation or enable Optional Luck spending, roll modification, history, recovery or session-end improvement workflows
- final skill presentation using stable SkillRef and same-Setting SkillRegistry for standard/predefined/custom names, current/Half/Fifth values, improvementChecked state, deterministic sorting, and orphan-safe fallback
- pure Final Sheet skill resolver that combines same-Setting standard unspecialized baselines with sparse Character skills, exposes valid predefined candidates only behind an independent specialization browser, preserves persisted uncommon/predefined/incompatible/custom/orphan rows without synthetic custom UUIDs, and never falls back Standard
- read-only unpersisted catalog baselines resolved from current Characteristics, with no load/view/search/toggle writeback; first explicit current or growth-mark mutation alone instantiates the target CharacterSkill through existing Store validation
- compact responsive Final Sheet skill workspace with zh/en/alias/custom-name search, orthogonal uncommon and predefined-specialization catalog browsing, modern-only/missing-era/incompatible badges, prominent current plus derived Half/Fifth, growth controls, and orphan read-only presentation
- direct game-time current value and improvementChecked editing with refresh persistence, not-eligible growth disabling, and existing atomic Mythos → Maximum SAN/current SAN confirmation semantics without creation budgets, finalization, caps, or advancement rolls
- compact custom-specialization create/rename/remove interaction using Store-owned UUIDs, stable rename identity, explicit remove confirmation, and existing allowMultiple/domain validation
- compact Final Sheet identity editor for long-term name, sex, residence, and birthplace mutation through existing Character Store actions; age, era, Setting, occupation, Characteristics, and Luck remain read-only within that identity editor, while Current Luck has its independent resource-workspace boundary
- all ten closed Character backstory categories in stable compact sections with empty-category collapsing, long-term add/edit/cancel/stable-ID delete, Store-owned UUID persistence, and no creation-count gating or read-time aggregate creation
- explicit Key Connection display, eligible creation-category set, clear, and key-safe delete using existing Store semantics; game-time categories never expose set-key controls
- legacy/no-session narrative safety: missing identity details, missing/empty backstory, absent Key Connection, and absent CreationSession remain readable and receive no writeback until explicit user mutation
- focused Final Sheet wealth, possessions, and weapon workspaces that mutate only `Character.wealth`, `Character.possessions`, and `Character.weapons` through Character Store → CharacterRepository → Dexie, with no CreationSession dependency or second inventory draft
- explicit legacy/no-session Standard current-wealth creation from user-entered Cash/Assets only, rejecting overwrite and creating empty asset entries without CR/era defaults or creation provenance; non-Standard missing wealth remains absent and existing legacy amounts are safe raw minor-unit read-only values
- direct Standard Current Cash/Assets editing plus stable-ID asset add/edit/cancel/confirmed-delete, with optional estimates and no estimate-total equality, Spending Level persistence, or automatic assets-total synchronization
- ordinary possession add/edit/cancel/confirmed-delete with Store-owned UUIDs, legal duplicate names, optional notes, refresh persistence, and no catalog, purchasing, pricing, quantity, or cash/assets synchronization
- compact collapsed same-Setting weapon catalog with zh/en/skill/stable-ID search and closed category filter, source-faithful mechanics, availability/reference-price presentation, available/rare/unavailable add eligibility even without era, duplicate instances, stable-ID notes edit/clear, confirmed remove, orphan-safe mutation, and no Standard fallback
- Vue 3 / TypeScript / Vite project with strict type checking
- Hash Router, Pinia, Dexie, Zod, Vitest, and pnpm
- `GPL-3.0-only` license
- one production-registered Standard SettingPack plus display-only historical Setting identity metadata; no non-Standard placeholder content packs
- strict independent `WeaponDefinition` with stable ID, closed category, standard/predefined-only typed SkillRef, structured impale/era/malfunction/source metadata, and source-faithful display text for damage, range, attacks, capacity, and reference prices
- optional `SettingPack.weapons` plus a cached same-Setting `WeaponRegistry` that rejects duplicate IDs, unknown skills, specialization-required parent standard refs, and missing predefined specializations without Standard fallback
- complete 104-row Standard production weapon catalog across all eight closed categories: 28 melee/other, 16 handguns, 12 rifles, 9 shotguns, 9 assault rifles, 6 submachine guns, 8 machine guns, and 16 explosive/heavy/other definitions; historical unsupported same-Setting weapon registries remain empty without registered placeholder packs
- complete Keeper table 17 plus Investigator tables 10-2～10-9 source inventory with 104 production mappings, zero duplicate mechanics mappings, `needs-review = 0`, explicit discrepancy resolution, all 8 Phase 7C-1 pilots reconciled in place, and an independently runnable full-catalog audit
- pure weapon SkillRef formatting, catalog filtering, reference-price formatting, classic/modern availability status, Character instance presentation, and orphan fallback helpers
- optional Character version-1 weapon instances containing only Store-owned UUID, WeaponDefinition stable ID, and optional trimmed notes; duplicate definitions are legal while instance UUIDs stay unique
- Character Store weapon add/notes/remove APIs through CharacterRepository, with same-Setting Registry validation, no Standard fallback, presentation-only availability whose available/rare/unavailable states all permit add with or without an era, refresh persistence, and orphan-safe edit/delete
- dedicated Weapons area inside Possessions with name/skill/ID search, eight-category filtering, useful catalog mechanics, rare/unavailable badges, duplicate add, instance notes and instance-specific delete; non-Standard empty registries remain empty
- separate Review weapons summary resolving mechanics from the Character Setting Registry, preserving zero-weapon legality, unavailable owned weapons, orphan fallback, and Review ↔ Possessions persistence without adding an eighth workflow step
- pure Standard 1920s/Modern wealth table for CR 0～99 with closed lifestyle IDs, integer US-cent amounts, exact/minimum asset semantics, and presentation-only dollar formatting
- optional Character version-1 wealth containing mutable cash/assets totals and UUID-backed asset descriptions with optional estimates; no spending-level persistence or asset-entry sum invariant
- Character Store cash/assets and asset CRUD APIs with Store-owned UUIDs, stable edit identity, refresh persistence, and no CreationSession side effects
- optional CreationSession version-1 wealth initialization provenance, pure current/stale comparison against Character era + finalized Credit Rating, and no Dexie/Record/version bump or read-time writeback
- explicit transactional Standard wealth initialization that resets cash/assets totals, preserves asset descriptions, and atomically writes Character wealth plus session provenance without mount/read/stale auto-recalculation
- seven-step Basic Info → Attributes → Occupation → Skills → Background → Possessions → Review workflow with legacy Review preservation
- dedicated Possessions step showing CR, lifestyle, spending level, official/current cash/assets, CR99 minimum wording, explicit initialize/reinitialize, editable asset descriptions, and creation validation requiring a description only for positive assets
- Review wealth summary with Credit Rating, lifestyle, current cash/assets, spending level, asset entries, and a return-to-Possessions action without becoming a final character sheet
- optional Character version-1 possessions with Store-owned UUID identity, trimmed non-empty names, optional non-blank notes, duplicate-name support, stable array ordering, legacy compatibility, and no Dexie/version change
- Character Store possession CRUD through the existing CharacterRepository, independent from wealth initialization, CreationSession, Setting, and era; wealth initialization, stale state, and reset preserve possessions without synchronizing them with asset entries
- Possessions-step free-form ordinary gear editing that remains available before wealth initialization and while wealth is stale, plus a separate Review summary; no ordinary Standard product catalog, prices, purchasing, automatic cash deduction, quantity, encumbrance, armor, or weapon mechanics
- optional Character `sex`, `residence`, and `birthplace` identity details with trimmed non-empty persistence and legacy missing-field compatibility
- optional Character backstory aggregate with ten closed categories, globally unique UUID entry identity, trimmed text, and an entry-ID Key Connection reference
- Character Store identity/backstory aggregate APIs with Store-owned UUID creation, stable edit identity, key-safe removal, and no separate BackgroundRepository
- pure creation-background validation that counts only the six creation categories, requires 3～6 entries and one initial Key Connection, and excludes four game-time categories from completion
- Phase 6 background workflow in which skills atomically hand off to Background and Background validates the persisted Character before Phase 7A advances to Possessions
- dedicated Background step UI with multi-entry categories, six-entry add limit, editing/removal, single Key Connection selection and validation-backed completion
- creation Review summaries for identity and all ten backstory categories, including Key Connection marking and non-destructive returns to Background or Skills
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
- atomic skills completion through Creation Workflow Repository, writing Character occupation/skills, clamping current SAN to finalized Mythos when required, and advancing CreationSession to background in one Dexie transaction without changing HP/MP or restoring SAN
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
- seven-step creation stepper with explicit skills, background, possessions, and review branches; the Phase 4 manual SkillEditor is no longer embedded in the structured occupation creation step
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
- focused allocation Store APIs for unique SkillRef upsert/remove, draft-safe over-budget and eligibility-invalid persistence, refresh restoration, and Store-owned custom interest specialization UUIDs without schema changes
- pure current-occupation allocation roster derivation from valid requirement identities, active replacement and Credit Rating, with stale requirement IDs ignored and stable SkillRef de-duplication
- Phase 5C-3A skill allocation workspace with occupation plus interest point inputs, Credit Rating allocation/range guidance, interest-only catalog search, custom interest specializations, base/allocation/final previews, Engine-owned budgets, row issues, warnings and pending-approval presentation
- current-plan-validated Keeper approval Store actions with exact reason/subject grants, precise revocation, optional trimmed notes, and stale approval rejection
- occupation-scoped Credit Rating override approval/revocation through the existing dedicated state, without synthetic Keeper approval grants
- fuzzy requirement approval invalidation when the selected SkillRef identity set changes, while order-only changes preserve the grant
- dedicated skill finalization UI for Engine-owned errors, approvals and warnings, local-only unused-point acknowledgement, and the existing transactional `completeSkills` path
- minimal persisted Review summary for identity, Setting/Era, age, occupation, final characteristics, Luck, resources, Registry-formatted final skills and grouped backstory, with non-destructive returns to background or skill adjustment
- explicit manual-skill rebuild confirmation that persists only the future structured-finalize decision and never changes existing `Character.skills` before `completeSkills()`
- stale occupation draft presentation derived only from existing finalizer errors, with raw Engine messages and no duplicate occupation validator
- explicit occupation reset that drains pending allocation writes, reuses the existing pure reset semantics, preserves interest allocations and skill-scoped creation approvals, and restores deterministic exact requirements for the current occupation
- Review-to-skills round-trip recognition of the structured finalize resolution, preventing completed structured `Character.skills` from being misclassified as manual data
- current-investigator Custom Occupation Builder with local-only incomplete drafts, UUID occupation identity, stable requirement-slot identities, friendly closed point-formula controls, up to eight Engine-supported skill categories, era-filtered Setting skill choices, and fixed custom source/all-era metadata
- custom occupation creation and same-UUID editing through the existing Creation Store snapshot action, preserving structured skill drafts and delegating stale conflicts, capacity proof, Preset approvals, allocation, finalization, refresh persistence, and Background handoff to the existing Phase 5 Engine and 4A UX
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

- portrait upload
- Key Connection SAN loss, self-help, Keeper locks, insanity/background automatic mutation, investigator development, and experience packages
- post-creation HP/MP/SAN recovery, insanity, combat, ammunition, purchasing, automatic cash deduction, and improvement-roll workflows
- Optional Luck spending/roll-modification and session-end Luck improvement workflows
- richer field-level guided focus, advanced coachmarks, and further Guide overlay refinements
- generic Settings and broader UI preference infrastructure
- arbitrary multi-file batch import/export, selective restore, replace/merge/import-as-copy, and file migrations beyond current v1 formats
- non-Standard Setting rules and content, which are outside the current product scope and Roadmap
- MP natural recovery rules and recovery limits

## Next intended work

Phase 19A is complete as a documentation/product boundary remediation. Phase 19B remains planned and must not start until the unresolved content-licensing questions receive independent review or explicit release-owner resolution.

## Known technical risks

- Chaosium Fan Material Policy may change; every release must recheck the official policy and required notice
- public source distribution plus bundled CoC-specific structured data has not been confirmed by this technical audit as covered by the web-based generator allowance
- the precise GPL aggregation/distribution treatment of original code beside non-commercial fan material requires independent legal review; NOTICE is disclosure, not a compatibility opinion

- IndexedDB and domain Schema migration
- future Portable Package and Full Library Backup migrations or advanced conflict-resolution compatibility
- future explicitly authorized Setting extension evolution
- Deprogrammer's former `keeper-approved-single-occupation-skill-replacement` pressure is resolved by an occupation-level singular exact replacement policy with explicit target and target-scoped Keeper approval; there is no active Engine pressure
- Keeper Criminal's former `choice-pool-with-repeatable-specialization-branch` pressure is resolved by the top-level-only `choice-pool` selector, which separates selected category count from selected SkillRef count
- browser storage can still be explicitly cleared or lost with the browser profile/device; persistent storage protection is best-effort and single-Character/full-library files remain the user-controlled backup boundary, with no automatic/cloud backup or encrypted archive
