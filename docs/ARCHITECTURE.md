# COCSheet Architecture

本文记录当前已建立或已确认的架构边界；实现状态以 `CURRENT_STATE.md` 为准。

## Stack

- Vue 3
- TypeScript（strict）
- Vite
- Vue Router（Hash Router）
- Pinia
- Dexie / IndexedDB
- Zod
- Vitest
- pnpm

项目使用 `GPL-3.0-only` 许可证。Vite 使用相对 `base`，构建产物不依赖服务器 Rewrite。

## Domain separation

当前已落地的主要目录是：

```text
src/coc7/rules       纯规则函数
src/coc7/types       领域类型与 Zod Schema
src/coc7/extensions  内部扩展注册
src/content          SettingPack 与 Setting Registry
src/creation         建卡会话、预设与流程 Store
src/character-sheet  最终人物卡的只读 presentation
src/kp               KP 预设 Store
src/db               Dexie、持久化记录与 Repository
src/app              Router 与应用级 Store
src/pages            当前极简页面
```

规则、内容、UI 与存储必须继续分离。Phase 8A 已建立独立的 `character-sheet` presentation 模块与 `/characters/:id/sheet` 页面；它复用现有 rules、Setting Registry 与 Store，不复制建卡 Engine 或静态 content。

## Character and CreationSession

`Character` 是最终调查员状态的数据源。当前 Schema 包含 `version`、`id`、`name`、`settingId`、可选的权威建卡时代 `eraId`，可选人物信息 `sex`、`residence`、`birthplace`，可选 `backstory`，完成属性阶段后写入的可选 `age`、`characteristics` 与 `luck`，以及整体可选的 `resources`、`wealth`、`possessions`、`weapons`、`skills` 和轻量 `occupation` 身份快照。背景条目使用 UUID 稳定 identity 与闭合类别；Key Connection 引用 entry ID。创建期 3～6 条和 Key Connection 完成条件属于纯 creation validation，不是 Character schema 的长期上限。`wealth` 只保存 integer minor-unit current cash/assets totals 与 UUID-backed 资产构成说明；spending level 不持久化。资产条目可选估值且不要求合计等于 assets total。`possessions` 保存 Store-owned UUID、非空名称与可选备注的普通随身物品自由文本，名称可以重复；它不属于 `wealth` 或 `CreationSession`，不因财富 provenance stale 而失效。`weapons` 保存 Store-owned 单件 UUID、WeaponDefinition stable ID 与可选人物级备注；同 definition 可重复，静态 mechanics 始终从人物自身 Setting 的 WeaponRegistry 解析。orphan definition 不阻断 Character 读取，也不触发补写。`assetEntries`、`possessions` 与 `weapons` 三者不自动同步或去重。最终职业只保存 catalog/custom identity、建卡时显示名与少量来源身份，不复制职业点公式、信用范围或技能需求。`resources` 一旦存在就完整保存 current HP、current MP 与 current SAN；Maximum HP、Initial MP、Initial SAN、Maximum SAN、MOV、Damage Bonus、Build 与 Half / Fifth 均由纯函数实时计算，不进入持久化字段。Maximum SAN 由当前 Cthulhu Mythos 技能值推导；稀疏技能状态中没有该项时按基础值 0 处理。

`Character` 不保存当前向导步骤、随机候选、未完成分配、UI 状态或 KP 预设编辑状态。

`CreationSession` 负责建卡流程状态，但不重复保存时代；所有时代判断都读取 `Character.eraId`。当前 Schema 包含 `version`、`characterId`、`settingId`、`currentStep`、可选 `presetSnapshot`、草稿年龄及强类型属性阶段状态。属性状态以 discriminated union 区分六种生成方式，并保存原始骰值、分配、候选组、Base Characteristics、年龄减值、EDU 成长记录与 Luck 来源。职业阶段保存完整 `OccupationDefinition` mechanics snapshot；技能阶段保存 requirement selections、完整 `SkillRef` allocation rows、可选的 occupation skill replacement policy/target draft、Credit Rating override、分理由的 Keeper approvals 与手动技能冲突处理决定。replacement SkillRef 从 mechanics snapshot 实时推导，不重复持久化。预算、base/final/Half/Fifth、剩余点数和 validation issues 均实时推导，不持久化。Phase 7A 的 optional `wealthInitialization` 只记录创建期显式初始化时的 Standard era + finalized Credit Rating provenance，用于纯 stale 检测，不复制到 Character。

Manual 的输入值以 Partial Characteristics 保存，八项完整且通过 Characteristic 校验前不生成 Base Characteristics。Point Buy 从当前预设的数学最低合法分配开始，并同样只在总点数和各项限制全部满足后生成 Base。`draftAge` 与年龄调整状态中的年龄必须一致。

属性完成时，`Character` 最终值与 `CreationSession` 流程推进在同一 Dexie 事务中写入。年龄改变只清除并重建年龄相关过程，始终从保存的 Base Characteristics 重新推导 Final Characteristics。

首次完成属性时，current HP 与 current MP 分别按 Maximum HP 与 Initial MP 初始化；current SAN 取 Initial SAN 与已有 Cthulhu Mythos 所允许 Maximum SAN 的较小值，并与最终属性和会话推进在同一事务中写入。Initial MP 为 `floor(POW / 5)`，但 current MP 只要求是非负整数，可以因其他规则高于 Initial MP；Phase 3 不实现 MP 自然回复规则。返回 attributes 重新完成会按新的最终属性重置这些初始资源，但保留已有技能并继续应用已有 Mythos 上限。没有 `resources` 的 Phase 2 Character 继续兼容读取，由 UI 调用显式 Store action 一次性补齐并应用相同 SAN 上限；Repository 读取不产生隐式写入。

显式修改 Cthulhu Mythos 时，Store 在一次 CharacterRepository update 中同时保存技能值，并在必要时把 current SAN 降至新的 Maximum SAN；降低 Mythos 不会自动恢复 SAN。是否执行破坏性 SAN 降低由 UI 在写入前确认，Repository 不包含确认逻辑。

Phase 4A 允许保存、但不满足 Maximum SAN 的旧 Character 仍可通过现有 Schema 与 Repository 正常读取；读取或页面加载不会自动改写。UI 明确提示超出上限，并只在用户点击同步后调用 Store reconciliation action；该 action 仅在需要时通过一次 CharacterRepository update 修改 current SAN，不修改 Mythos、HP、MP、属性、Luck 或其他技能。

创建 `Character` 与 `CreationSession` 时使用同一 Dexie 事务。完成 attributes 时原子写入最终属性与推进 occupation；完成 skills 时同样通过 Creation Workflow Repository 在一个事务中原子写入 `Character.occupation`、重建后的 `Character.skills` 与 `CreationSession.currentStep = background`。Background 完成 action 从持久化 Character 读取背景并通过纯 validator 检查后推进 possessions。Standard wealth 只由显式 Creation Store action 初始化：该 action 读取最新持久化 Character，以当前 era + finalized Credit Rating 调用纯表格规则，并在同一个 Creation Workflow Repository transaction 写入 Character wealth 与 session provenance；mount、Repository read 和 stale 检测均不自动初始化或重算。Possessions completion 只在 wealth 已初始化、provenance current，并且正资产至少有一条资产说明时推进 review。旧 session 若已经位于 review 会原样读取，不自动倒退或 writeback。删除 `CreationSession` 不影响 `Character`；删除 `Character` 时会同时删除对应会话。

## Final character sheet

最终人物卡、建卡编辑器与创建期 Review 的边界是：

```text
CharacterEditorPage + CharacterReviewPanel
        ↓ 创建流程控制与完成前检查
CreationSession.currentStep

FinalCharacterSheetPage
        ↓ 长期显示与已有 mutable resource 编辑
Character Store → CharacterRepository → Dexie
```

最终人物卡的所有数值、技能、背景、财富、物品与武器均直接读取 `Character`；CreationSession 只提供完成／未完成状态和返回编辑器入口，不是页面可用性的前置条件。页面加载不会调用 legacy resources 初始化，不会从会话重建最终状态，也不会对 optional 字段做 normalize writeback。HP、MP、SAN 编辑继续只调用 Character Store 的既有 action；legacy SAN 超过 Maximum SAN 时沿用显式 reconciliation，禁止加载时静默收紧。

技能显示使用人物自身 Setting 的 SkillRegistry 与稳定 SkillRef；无法解析的未来引用使用只读 fallback。武器使用人物自身 Setting 的 WeaponRegistry 与现有 orphan-safe presentation，不回退 Standard。Standard derived values 与 wealth presentation 只在当前 Character 信息足以可靠派生时显示，Half/Fifth、Maximum HP、Initial MP、Maximum SAN、MOV、Damage Bonus、Build 与 spending level 继续不持久化。

## Persistence

IndexedDB 当前为 version 1，包含：

```text
characters
creationSessions
kpPresets
```

访问链路必须保持：

```text
Vue Component
      ↓
Pinia Store
      ↓
Repository
      ↓
Dexie / IndexedDB
```

Component 不直接访问 Dexie。持久化记录在写入和读取时经过 Zod 校验，顶层记录元数据与嵌套领域数据必须保持一致。

`CreationPreset` 的属性配置使用结构化 `attributeGeneration`。旧 version 1 记录中的 `attributeMethods` 仍可读取，并在 Zod 解析后规范化为新结构；表和索引未改变，因此本阶段不提升 IndexedDB version。

Phase 3 只为 Character version 1 新增 optional `resources` 字段。CharacterRecord version 与 IndexedDB version 均保持 1，表和索引不变。

Phase 7A 只为 Character version 1 新增 optional `wealth`，为 CreationSession version 1 新增 optional `wealthInitialization` 与 `possessions` step。CharacterRecord、CreationSessionRecord、Dexie table/index 与 IndexedDB version 继续保持 1；旧 Character / session 读取不补写财富，已在 review 的 legacy session 不倒退。

Phase 7B 只为 Character version 1 新增 optional `possessions` 自由文本数组。CharacterRecord、CreationSessionRecord、Dexie table/index 与 IndexedDB version 继续保持 1；旧 Character 缺少该字段时正常读取且不补写。

Phase 7C-2B 只为 Character version 1 新增 optional `weapons` 实例数组。CharacterRecord、CreationSessionRecord、Dexie table/index 与 IndexedDB version 继续保持 1；旧 Character 缺少该字段以及 definition 已不在当前 Registry 的 orphan instance 都正常读取且不补写。

可持久化状态通过结构校验后，完成属性前还会执行领域语义校验：Preset 必须数学可完成，EDU 成长历史必须逐项连续且与骰值一致，rolled Luck 必须符合当前年龄要求的 3D6×5 次数与取高结果。

## Setting architecture

五个 Setting ID 通过统一 Setting Registry 发现与读取：

```text
standard
gaslight
down-darker-trails
dark-ages
regency
```

避免在应用各处散布 `if (setting === "gaslight")`。`SettingPack` 是数据与扩展 ID 声明，不能注入或执行任意 JavaScript。特殊人物规则由应用内部 Extension Registry 提供，并随应用代码发布。

当前 Standard SettingPack 包含完整的 54 项核心顶层 `SkillDefinition`、必要的 canonical specializations，以及 Phase 7C-2A 的 104 项完整 Standard weapon definitions；其余四个 SettingPack 仍是空内容占位包，不包含技能或武器目录，也不会隐式继承 Standard 内容。`SettingPack.skills` 是每个 Setting 技能内容的唯一入口；`src/content/skillRegistry.ts` 从对应 SettingPack 动态创建并缓存 registry，负责按稳定 definition ID 查询目录、解析预定义专业化，并在注册时拒绝重复 ID。新增 Setting 技能只需向对应 SettingPack 提供 `skills`，Registry 不维护 Setting 分派分支。

Standard wealth table 是内建的纯规则，不是 mutable Setting catalog。普通 gear / possessions 是 Character 自由文本数据，Standard 不建立普通商品目录。`SettingPack.equipment` 与 `equipmentDefinitionSchema` 当前只是未使用的 foundation hook；weapon definitions 因包含独立战斗 mechanics 而通过 `SettingPack.weapons` 保持独立，不塞入普通 possession entry。Character weapon instance 只保存 definition 引用与实例状态。

## Weapon architecture

Phase 7C 建立并完成以下内容与人物实例链路：

```text
SettingPack.weapons
        ↓
WeaponRegistry + same-Setting SkillRegistry validation
        ↓
Character weapon instances
        ↓
Possessions + Review presentation
```

`WeaponRegistry` 只读取对应 `SettingPack.weapons ?? []`，按 Setting 缓存，并在注册时验证 Weapon schema、重复 ID、standard skill ref 的非专业化约束与 predefined specialization 的真实存在；它不会回退读取 Standard catalog。Standard 当前注册 104 行 production definitions，完整映射 Keeper 表 17 的 104 个 source rows；其余四个 Setting 的 weapon registry 为空。目录由 `src/content/standard/weapons.ts` 统一导出，并按八个 closed category 拆分到 `src/content/standard/weapons/`；这只是 production content 的维护性拆分，不改变 `standardSettingPack.weapons` 对外语义。

这条链路与未使用的 `SettingPack.equipment` hook 及自由文本 `Character.possessions` 互相独立。Character Store 的 add boundary 只要求 definition 存在于人物自身 Setting Registry，不回退 Standard；availability 只用于 presentation，available、rare、unavailable 在明确时代或缺少时代时均可新增。已有实例在时代变化后保持不变并由 presentation 重新标记。Possessions 使用名称搜索与 closed category 筛选，不把 104 项做成长下拉框；Review 单独汇总。异构 damage、range、attacks、capacity、availability 与 reference price 仍是来源显示信息；当前没有武器合法性、购买、Keeper approval、弹药状态或 combat engine。`docs/STANDARD_WEAPON_SOURCES.md` 保存完整 source inventory，Vitest audit 与独立 validator 负责证明 inventory/production 双向闭环、schema/Registry 合法和 `needs-review = 0`。

## Skill architecture

技能领域保持以下分离：

```text
SettingPack / Skill Registry（静态 SkillDefinition）
                    +
Character.skills（实例化或变化的 CharacterSkill）
                    ↓
纯规则层实时解析 base / current / half / fifth
```

`SkillBaseValueRule` 是闭合联合类型，只允许固定值或 Characteristic 的 full / half / fifth；Half 与 Fifth 复用既有纯函数。`SkillRef` 区分普通技能、预定义专业化和 UUID 标识的自定义专业化。`SkillDefinition.availability` 以闭合结构记录标准角色卡/非常规与全时代/现代限定语义；可选 `aliases` 仅参与本地化显示和搜索，不参与 identity、规则或持久化 key。Store 根据 SkillDefinition 的成长政策验证成长标记，并通过 CharacterRepository 持久化；Component 不直接访问 Dexie。

`Language (Own)` 使用 `required + allowMultiple: false + allowCustom: true` 的专业化政策，具体母语名称和稳定 UUID 保存在 CharacterSkill 的 custom SkillRef 中；`Language (Other)` 则允许多个 custom 实例。

Phase 4 在 `Character.version = 1` 中新增 optional `skills`，但不改变 CharacterRecord、CreationSessionRecord 或 IndexedDB version。静态目录、availability、aliases、基础值、名称、来源、点数分配和验证错误不持久化，旧 Character 读取也不会触发隐式写回。

Phase 5C-1.5 在同一个 `Character.version = 1` 中新增 optional `eraId`。Character Store 验证该值属于人物当前 SettingPack 后经 CharacterRepository 保存；CharacterRecord、CreationSession、Dexie 表、索引和 IndexedDB version 均不改变。SettingPack 声明 eras 时，创建 UI 与 Creation Store 要求明确时代；纯 finalizer 对缺少时代的 legacy Character 保持兼容。

## Occupation architecture

职业领域按三层理解：

1. Occupation Engine：职业点公式、技能选择要求、前置要求、信用评级和验证。
2. Occupation Data：具体职业记录。
3. Setting / Content：决定职业、技能和装备属于哪个建卡环境。

Phase 5A 已建立 Occupation Engine Foundation：

- `OccupationPointFormula` 保持 `attribute / best-of / sum` 闭合联合，`best-of` 禁止重复属性。
- `OccupationRequirement` 使用职业内稳定 kebab-case ID、闭合 `SkillSelector`、`min/max` cardinality、guidance 与 Keeper review；模糊需求批准同时绑定职业身份与 requirement ID，切换职业后旧批准可保留但不再生效。
- `OccupationDefinition` 可选声明一个 singular skill replacement policy：exact replacement selector、非空且唯一的 target requirement IDs，以及 Keeper-required approval。target 必须存在并可证明只代表一个职业技能 category；该 policy 横跨 requirements，不属于 `SkillSelector`。
- Selector 可表达普通技能、canonical predefined specialization、开放专业化、固定名称 custom specialization、有限候选、带排除的任意技能和组合组，不接受字符串公式或可执行 predicate。Composable selectors 是 `exact`、`specialization-of`、`named-custom-specialization`、`one-of`、`any-skill` 与 `all-of`；top-level-only selectors 是 `one-branch` 与 `choice-pool`。
- 固定名称开放专业化只在玩家确认时产生带 UUID 与 display name 的 custom `SkillRef`；不会为 Latin、Technical Drawing 等职业措辞扩张完整技能目录。
- `OccupationRegistry` 只从 `SettingPack.occupations` 构建，负责 ID/requirement/selector/era 验证，以及按本地化名称、alias、category、tag、era 查询。
- `src/coc7/rules/availability.ts` 是职业与技能时代适用性的共享纯规则边界，不读取 Store、Vue 或全局状态。职业浏览、选择资格与技能 finalizer 都以 `Character.eraId` 调用它；浏览器自己的 era filter 只影响本地列表查询，不改变人物时代。
- Source mechanics 真正不同时以 `variantOf` 建立显式变体；仅 guidance wording 不同时保留同一 mechanics 与多个 sourceRefs。
- 结构化 final skill 值始终为当前 Characteristic 解析出的 base 加职业点与兴趣点，不在已有 `CharacterSkill.currentValue` 上叠加。
- 已有 Phase 4 final skills 由纯检测器暴露 `needsExplicitAdoptionOrReset`；不得静默采用、反推或覆盖。
- `one-of` 将多个 child selector 视为不同选择槽位：每个 child 在单项需求中最多承接一个已选 SkillRef，并以回溯匹配处理重叠；同一专业化父类需要多项时使用 `specialization-of` 与 requirement cardinality 表达。
- `one-branch` 表达多个互斥 branch 中只选择一个，并由该 branch 自己的 cardinality 接受整组 SkillRef；整组选择必须由同一个 branch 完整解释，不能跨 branch 混合。当前 branch child 仅允许可对单个 SkillRef 明确匹配的 `exact`、`specialization-of` 与 `named-custom-specialization`，不与 `one-of` 合并语义，也不持久化可从整组 SkillRef 推导出的 branch identity。`one-branch` 当前只允许作为 `OccupationRequirement.selector` 的顶层 selector，不得嵌套进 `one-of`、`all-of` 或 `any-skill.exclude`；未来只有在真实官方数据形成新的来源压力时才单独扩展组合语义。
- `choice-pool` 表达从多个 atomic branches 中选择 N 个 active branch；每个 SkillRef 通过 deterministic backtracking 恰好分配给一个 branch，active branch 按自身 cardinality 接受 refs，而 inactive branch 不要求满足 minimum。同一 repeatable branch 内多个 refs 仍只计一个 selected branch，因此 selected branch count 与外层 SkillRef count 分离。它与 `one-branch` 同为 top-level-only，不允许嵌入 composable selector，也不持久化 branch identity。
- Credit Rating 继续使用 `credit-rating` SkillDefinition；最终值越过职业范围需要显式且绑定当前职业身份的 override。Cthulhu Mythos 创建点继续需要分理由 Keeper approval。
- 未用职业点与兴趣点是 warning，不在规则层自动分配或作为 hard invalid。
- 自定义职业复用同一核心定义并限制最多八项职业技能 category：有限 requirement 按可证明的最大容量计数；`one-branch` 只取一个 branch，`choice-pool` 只取允许激活数量内的最大 branch capacities；无法证明上限的需求被拒绝，通用 Fighting / Firearms 专业化 branch 各按一项计数。
- finalize 生成完整 `Character.skills` 后复用 Phase 4 领域校验，继续执行稳定 identity、重复实例与单实例专业化约束。
- Character 存在 `eraId` 时，finalize 对职业 mechanics snapshot 以及 requirements、replacement、allocation 和最终选择中实际出现的去重 SkillRef 执行时代适用性校验；不兼容内容产生稳定错误码且不被静默丢弃。时代变化保留现有 catalog/custom 职业快照和技能草稿，由 UI 与 finalize 阻止继续。
- finalize 在普通 requirement validation 前解析可选 replacement draft。合法 target 跳过 normal selection，且 normal target selection 若仍存在会 hard fail；replacement ref 进入同一 occupation eligibility、allocation、base、limit 与 CharacterSkill validation pipeline。批准 subject 绑定 occupation + policy + target，target 改变后旧批准自然失效。职业切换保留 draft 供 stale validation，显式 occupation allocation reset 才清除 replacement target。
- 完成 skills 时，最终 Mythos 与必要的 current SAN 收紧、职业快照、最终技能和 background 会话推进在同一个 Creation Workflow Repository 事务中写入；降低 Mythos 不自动恢复 SAN，HP/MP 不受影响。

当前 Standard SettingPack 已从 `src/content/standard/occupations.ts` 接入 91 个 canonical family identity 与 119 个 production definition，完整映射 142 条官方 Standard source entry，并保留真实 source mechanics variants。Batch 2 的 `bounty-hunter`、`cowboy` 与 `tribe-member` 通过 `one-branch` 无损进入 production，Keeper Criminal 使用 top-level-only `choice-pool`，Deprogrammer 使用 occupation-level replacement policy；Clerk / Executive 通过既有 `one-of` 表达 Own Language 或 Other Language exactly-one。`src/coc7/testing/occupationFixtures.ts` 继续只用于 Engine 压力测试，生产内容不依赖 testing 目录。Phase 5B Standard occupation production 已完成；Phase 5C-1.5 已加入持久化时代上下文、浏览/选择守卫与 finalize 守卫，Phase 5C-2 已加入 catalog/custom/named-custom requirement selection、any-skill custom path，以及只持久化 policy/target 的 replacement interaction；Phase 5C-3 的独立 allocation/finalization UI 只通过 Creation Store 保存完整 SkillRef allocation rows、当前 pending Keeper approvals 与 occupation-scoped Credit Rating override，并以现有 `getSkillFinalizePlan()` 实时读取预算、final value、issues、warnings 与 approvals，完成时继续调用事务性 `completeSkills()`，不复制 Occupation Engine 规则；职业数据不得硬编码进 Vue 页面。

Occupation Registry 在注册时除 schema、技能引用与 era 检查外，还拒绝确定不可满足的 selector cardinality：`one-of` 的 min/max 不得超过 child 数量，`all-of` 的外层范围不得与内部 group minimum/maximum 矛盾，`one-branch` 的 branch cardinality 必须与外层 requirement 区间相容，且 exact branch 不可能消费多项；`choice-pool.selectedBranches` 不得超过 branch 数量，并以最小 branch minima 和可证明的有限 branch maxima 检查外层 SkillRef cardinality。该检查只处理可确定的低风险结构，不尝试通用约束求解。

## Schema evolution

正式持久化 Schema 的变化必须考虑旧版本解析、数据迁移、IndexedDB version，以及未来导入/导出兼容。Phase 5A 只增加 optional Character/CreationSession/CreationPreset 字段与 `skills` step；Deprogrammer cleanup 只在 version-1 `OccupationDefinition` snapshot 与 `SkillCreationState` 增加 optional replacement policy/target 字段；Phase 5C-1.5 只为 Character version 1 增加 optional `eraId`；Phase 6 只为 Character version 1 增加 optional identity/backstory 字段并为 CreationSession version 1 增加 `background` step；Phase 7A 只增加 optional Character wealth、optional CreationSession wealth provenance 与 `possessions` step；Phase 7B 只增加 optional Character possessions；Phase 7C-1 与 7C-2A 只增加 static Setting weapon content，Phase 7C-2B 只增加 optional Character weapons。旧 version-1 Character 缺少这些字段时继续解析且不自动补写，旧 session 若已在 review 也不迁移；不增加表、索引、主键或 migration，Character、CreationSession、Record 与 IndexedDB version 均继续为 1。旧 `CreationPreset.skillCaps` 保持 deprecated 读取兼容，但因历史语义未冻结，不映射到新的最终值 `skillLimits`，也不参与 allocation validator；Preset 时代约束留待未来单独设计。Repository read 不做 normalize writeback。项目尚未正式发布，早期可以合理重构，但不得无说明破坏已有本地测试数据。
