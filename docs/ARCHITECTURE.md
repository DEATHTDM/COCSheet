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
src/kp               KP 预设 Store
src/db               Dexie、持久化记录与 Repository
src/app              Router 与应用级 Store
src/pages            当前极简页面
```

规则、内容、UI 与存储必须继续分离。最终人物卡 UI 尚未形成独立的 `character-sheet` 模块；不得把该模块写成已实现。

## Character and CreationSession

`Character` 是最终调查员状态的数据源。当前 Schema 包含 `version`、`id`、`name`、`settingId`，完成属性阶段后写入的可选 `age`、`characteristics` 与 `luck`，以及整体可选的 `resources`、`skills` 和轻量 `occupation` 身份快照。最终职业只保存 catalog/custom identity、建卡时显示名与少量来源身份，不复制职业点公式、信用范围或技能需求。`resources` 一旦存在就完整保存 current HP、current MP 与 current SAN；Maximum HP、Initial MP、Initial SAN、Maximum SAN、MOV、Damage Bonus、Build 与 Half / Fifth 均由纯函数实时计算，不进入持久化字段。Maximum SAN 由当前 Cthulhu Mythos 技能值推导；稀疏技能状态中没有该项时按基础值 0 处理。

`Character` 不保存当前向导步骤、随机候选、未完成分配、UI 状态或 KP 预设编辑状态。

`CreationSession` 负责建卡流程状态。当前 Schema 包含 `version`、`characterId`、`settingId`、`currentStep`、可选 `presetSnapshot`、草稿年龄及强类型属性阶段状态。属性状态以 discriminated union 区分六种生成方式，并保存原始骰值、分配、候选组、Base Characteristics、年龄减值、EDU 成长记录与 Luck 来源。职业阶段保存完整 `OccupationDefinition` mechanics snapshot；技能阶段保存 requirement selections、完整 `SkillRef` allocation rows、Credit Rating override、分理由的 Keeper approvals 与手动技能冲突处理决定。预算、base/final/Half/Fifth、剩余点数和 validation issues 均实时推导，不持久化。

Manual 的输入值以 Partial Characteristics 保存，八项完整且通过 Characteristic 校验前不生成 Base Characteristics。Point Buy 从当前预设的数学最低合法分配开始，并同样只在总点数和各项限制全部满足后生成 Base。`draftAge` 与年龄调整状态中的年龄必须一致。

属性完成时，`Character` 最终值与 `CreationSession` 流程推进在同一 Dexie 事务中写入。年龄改变只清除并重建年龄相关过程，始终从保存的 Base Characteristics 重新推导 Final Characteristics。

首次完成属性时，current HP 与 current MP 分别按 Maximum HP 与 Initial MP 初始化；current SAN 取 Initial SAN 与已有 Cthulhu Mythos 所允许 Maximum SAN 的较小值，并与最终属性和会话推进在同一事务中写入。Initial MP 为 `floor(POW / 5)`，但 current MP 只要求是非负整数，可以因其他规则高于 Initial MP；Phase 3 不实现 MP 自然回复规则。返回 attributes 重新完成会按新的最终属性重置这些初始资源，但保留已有技能并继续应用已有 Mythos 上限。没有 `resources` 的 Phase 2 Character 继续兼容读取，由 UI 调用显式 Store action 一次性补齐并应用相同 SAN 上限；Repository 读取不产生隐式写入。

显式修改 Cthulhu Mythos 时，Store 在一次 CharacterRepository update 中同时保存技能值，并在必要时把 current SAN 降至新的 Maximum SAN；降低 Mythos 不会自动恢复 SAN。是否执行破坏性 SAN 降低由 UI 在写入前确认，Repository 不包含确认逻辑。

Phase 4A 允许保存、但不满足 Maximum SAN 的旧 Character 仍可通过现有 Schema 与 Repository 正常读取；读取或页面加载不会自动改写。UI 明确提示超出上限，并只在用户点击同步后调用 Store reconciliation action；该 action 仅在需要时通过一次 CharacterRepository update 修改 current SAN，不修改 Mythos、HP、MP、属性、Luck 或其他技能。

创建 `Character` 与 `CreationSession` 时使用同一 Dexie 事务。完成 attributes 时原子写入最终属性与推进 occupation；完成 skills 时同样通过 Creation Workflow Repository 在一个事务中原子写入 `Character.occupation`、重建后的 `Character.skills` 与 `CreationSession.currentStep = review`。删除 `CreationSession` 不影响 `Character`；删除 `Character` 时会同时删除对应会话。

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

当前 Standard SettingPack 包含完整的 54 项核心顶层 `SkillDefinition` 与必要的 canonical specializations；其余四个 SettingPack 仍是空内容占位包，不包含技能目录，也不会隐式继承 Standard 内容。`SettingPack.skills` 是每个 Setting 技能内容的唯一入口；`src/content/skillRegistry.ts` 从对应 SettingPack 动态创建并缓存 registry，负责按稳定 definition ID 查询目录、解析预定义专业化，并在注册时拒绝重复 ID。新增 Setting 技能只需向对应 SettingPack 提供 `skills`，Registry 不维护 Setting 分派分支。

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

## Occupation architecture

职业领域按三层理解：

1. Occupation Engine：职业点公式、技能选择要求、前置要求、信用评级和验证。
2. Occupation Data：具体职业记录。
3. Setting / Content：决定职业、技能和装备属于哪个建卡环境。

Phase 5A 已建立 Occupation Engine Foundation：

- `OccupationPointFormula` 保持 `attribute / best-of / sum` 闭合联合，`best-of` 禁止重复属性。
- `OccupationRequirement` 使用职业内稳定 kebab-case ID、闭合 `SkillSelector`、`min/max` cardinality、guidance 与 Keeper review；模糊需求批准同时绑定职业身份与 requirement ID，切换职业后旧批准可保留但不再生效。
- Selector 可表达普通技能、canonical predefined specialization、开放专业化、固定名称 custom specialization、有限候选、带排除的任意技能和组合组，不接受字符串公式或可执行 predicate。
- 固定名称开放专业化只在玩家确认时产生带 UUID 与 display name 的 custom `SkillRef`；不会为 Latin、Technical Drawing 等职业措辞扩张完整技能目录。
- `OccupationRegistry` 只从 `SettingPack.occupations` 构建，负责 ID/requirement/selector/era 验证，以及按本地化名称、alias、category、tag、era 查询。
- Source mechanics 真正不同时以 `variantOf` 建立显式变体；仅 guidance wording 不同时保留同一 mechanics 与多个 sourceRefs。
- 结构化 final skill 值始终为当前 Characteristic 解析出的 base 加职业点与兴趣点，不在已有 `CharacterSkill.currentValue` 上叠加。
- 已有 Phase 4 final skills 由纯检测器暴露 `needsExplicitAdoptionOrReset`；不得静默采用、反推或覆盖。
- `one-of` 的每个子 selector 在单项需求中最多承接一个已选 SkillRef，并以回溯匹配处理子 selector 重叠；同一专业化父类需要多项时使用 `specialization-of` 与 requirement cardinality 表达。
- Credit Rating 继续使用 `credit-rating` SkillDefinition；最终值越过职业范围需要显式且绑定当前职业身份的 override。Cthulhu Mythos 创建点继续需要分理由 Keeper approval。
- 未用职业点与兴趣点是 warning，不在规则层自动分配或作为 hard invalid。
- 自定义职业复用同一核心定义并限制最多八项职业技能：有限 requirement 按外层 `cardinality.max` 计数；无法证明上限的需求被拒绝，只有通用 Fighting / Firearms 专业化需求按一项计数。
- finalize 生成完整 `Character.skills` 后复用 Phase 4 领域校验，继续执行稳定 identity、重复实例与单实例专业化约束。
- 完成 skills 时，最终 Mythos 与必要的 current SAN 收紧、职业快照、最终技能和 review 会话推进在同一个 Creation Workflow Repository 事务中写入；降低 Mythos 不自动恢复 SAN，HP/MP 不受影响。

当前 Standard SettingPack 已从 `src/content/standard/occupations.ts` 接入 Phase 5B-1 的首批生产职业数据：12 个 canonical family、15 个 definition，包含 Journalist 三个 source mechanics variants 与 Missionary 两个 source mechanics variants。`src/coc7/testing/occupationFixtures.ts` 继续只用于 Engine 压力测试，生产内容不依赖 testing 目录。完整 Standard 职业目录仍属于 Phase 5B-2；最终职业浏览与技能分配 UI 尚未实现，属于 Phase 5C。职业数据不得硬编码进 Vue 页面。

Occupation Registry 在注册时除 schema、技能引用与 era 检查外，还拒绝确定不可满足的 selector cardinality：`one-of` 的 min/max 不得超过 child 数量，`all-of` 的外层范围不得与内部 group minimum/maximum 矛盾。该检查只处理可确定的低风险结构，不尝试通用约束求解。

## Schema evolution

正式持久化 Schema 的变化必须考虑旧版本解析、数据迁移、IndexedDB version，以及未来导入/导出兼容。Phase 5A 只增加 optional Character/CreationSession/CreationPreset 字段与 `skills` step，不增加表、索引或主键；Character、CreationSession、Record 与 IndexedDB version 均继续为 1。旧 `CreationPreset.skillCaps` 保持 deprecated 读取兼容，但因历史语义未冻结，不映射到新的最终值 `skillLimits`，也不参与 allocation validator。Repository read 不做 normalize writeback。项目尚未正式发布，早期可以合理重构，但不得无说明破坏已有本地测试数据。
