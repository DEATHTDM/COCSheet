# COCSheet Product Decisions

本文只记录已经拍板的长期决定。实现进度请查看 `CURRENT_STATE.md`。

## Product

### P001 — Product identity

COCSheet 是建卡工具与最终电子人物卡，不是只有一次性的 Character Wizard。

### P002 — Shared Character

萌新模式与快速模式共享同一份 `Character` 数据，不维护两套人物。

### P003 — Zero server

零服务器是核心约束。除非产品方向重新决定，否则不引入账号、后端或云数据库。

## Settings

### S001 — Supported settings

计划支持 Standard、Gaslight、Down Darker Trails、Dark Ages 与 Regency。

### S002 — No Pulp

不支持 Pulp Cthulhu。

### S003 — No Japanese expansion

当前不做日本职业或日系扩展。

### S004 — Settings are primary environments

五个历史 Setting 是独立的主要建卡环境，不把 UX 设计成让普通玩家同时勾选五个时代包。

## Attributes

### A001 — Characteristics and Luck

Luck 与八项 Characteristic 在类型层分开。八项 Characteristic 是 `STR`、`CON`、`SIZ`、`DEX`、`APP`、`INT`、`POW`、`EDU`；Luck 单独处理。

### A002 — Age adjustment model

年龄调整必须基于：

```text
Base Characteristics
+ Age Adjustment
= Final Characteristics
```

不得通过反复破坏性修改最终值来实现。

### A003 — Player-selected reductions

需要玩家分配的年龄减值由玩家自己选择，软件不能随机或隐式决定。

### A004 — Derived values and mutable resources

Maximum HP、Initial MP、Initial SAN、MOV、Damage Bonus 与 Build 是由当前人物数据实时计算的纯派生结果，不持久化到 `Character` 或 `CreationSession`。Initial MP 等于 `floor(POW / 5)`，只表示游戏开始时的 MP，并非 current MP 的绝对上限。

游戏中会变化的 current HP、current MP 与 current SAN 作为一个整体可选的 resources 结构持久化到 `Character`。Current MP 可以因其他规则高于 Initial MP；Phase 3 不实现 MP 自然回复规则或回复上限。Maximum SAN 等于 `max(0, 99 - current Cthulhu Mythos)`，是实时派生值，不持久化；稀疏技能状态没有 Cthulhu Mythos 时按 0 计算。提高 Cthulhu Mythos 导致 current SAN 超过新上限时，技能与 SAN 在同一次 Character 更新中保存；降低 Mythos 不自动恢复 SAN。首次或重新完成属性以及显式补齐 legacy resources 时，current SAN 取 Initial SAN 与当前 Maximum SAN 的较小值。

Phase 4A 已有 Character 即使 current SAN 高于后来加入的 Maximum SAN 规则上限，也必须保持可解析和可读取；Character Schema 不以跨字段 hard rejection 阻断旧数据，Repository read 不自动写回。UI 负责显示超限提示，只有用户触发显式 reconciliation 时才将 current SAN 同步到当前上限。

## Occupations

### O001 — Source, category, and tags

职业的 `source`、`category` 与 `tags` 是三个不同概念。

### O002 — One primary category

职业只有一个主要浏览分类，可以拥有多个玩法标签。

### O003 — Canonical occupations

同名职业若只是不同书中的重复记录，不简单复制为多个职业；使用 canonical occupation、alias 与 source reference 表达。

### O004 — Standard sources

Standard COC7 默认职业体系优先以 Keeper Rulebook 与 Investigator Handbook 为标准来源体系。旧版 Investigator Companion 内容不自动视为当前标准职业。

### O005 — Excel data pool

用户已有的 Excel 职业数据库可作为中文职业数据池，但不是规则权威。导入前必须核对来源、时代、公式、技能要求与疑似录入错误。

### O006 — Closed occupation requirements

职业技能需求使用职业内稳定 requirement ID、闭合 `SkillSelector` 与 `min/max` cardinality。Selector 只表达 exact skill、predefined specialization、开放专业化、固定名称 custom specialization、有限候选、带排除的任意技能与声明式组合，不执行任意 predicate 或内容代码。

固定名称开放专业化（例如 Language Other (Latin) 与 Art/Craft (Technical Drawing)）不要求扩张 canonical Skill catalog；职业 selector 保存本地化名称约束，玩家确认时才生成带 UUID 的 custom `SkillRef`。

`one-of` 中每个子 selector 在同一个 requirement 内最多满足一个已选 SkillRef；存在重叠时必须寻找可行的一对一分配。需要从同一专业化父类选多项时，使用 `specialization-of` 配合 cardinality 表达。`specialization-of.exclude` 只能引用同一父 SkillDefinition。

`one-branch` 与 `choice-pool` 都只允许直接作为 `OccupationRequirement.selector`，不能嵌入 composable selectors。`one-branch` 从多个 exclusive atomic branches 中选择一个，完整 selection 必须由该 branch 单独接受并满足其 cardinality。`choice-pool` 从多个 atomic branches 中选择 `selectedBranches` 个 active branch；每个 SkillRef 恰好分配给一个 branch，每个 active branch 按自身 cardinality 消费 SkillRefs，inactive branch 不受 branch minimum 约束，同一 branch 内多个 refs 仍只计一个 selected branch。whole-selection assignment 使用 deterministic backtracking，不持久化可从 SkillRefs 推导出的 branch identity。

这些 selector 保持闭合、声明式与针对真实来源压力的最小结构；不扩张为 generic SAT、arbitrary predicate 或内容 callback 系统。

职业技能的 1-for-1 replacement 位于 `OccupationDefinition`，不扩张 `SkillSelector`。当前每个职业最多声明一个 optional policy：replacement 固定为 exact `SkillRef` selector，policy 显式列出可替换的 requirement IDs，且每个 target 必须能由低风险结构检查证明只代表一个职业技能 category。玩家在 `CreationSession` 显式保存 policy ID 与 target requirement ID；系统不从缺失 selection 反推 target，也不重复持久化 replacement ref。启用 replacement 后原 target selection 必须不存在，replacement ref 从职业 mechanics snapshot 推导并进入普通职业资格与点数分配流程。不引入 arbitrary replacement callback、predicate 或 occupation-ID special-case。

### O007 — Occupation source variants

只有 point formula、Credit Rating、确定性技能需求等规范化机械字段真正不同时才建立 `variantOf` source variant。仅 summary、guidance 或可统一为 broad free-pick + Keeper review 的措辞不同时，使用单一 canonical mechanics、多个 sourceRefs 与来源注释。

### O008 — Structured allocation and finalization

CreationSession 分配行持久化完整 `SkillRef`、职业点与兴趣点，不持久化派生 key、base、final、Half/Fifth、剩余预算或 validation issues。最终技能从当前 Characteristic 解析 base 后加两种分配重建，不在已有 `CharacterSkill.currentValue` 上累加。

已有 Phase 4 final skill state 与结构化分配冲突，必须由消费者显式选择重建或保留手动人物；规则层不得静默采用、反推、删除或覆盖。

结构化 finalize 生成完整 `Character.skills` 后必须复用 Phase 4 人物技能领域校验。完成 skills 时若最终 Cthulhu Mythos 收紧 Maximum SAN，必须在保存职业、技能与 review 会话推进的同一事务中收紧 current SAN；降低 Mythos 不自动恢复 SAN，也不改变 HP/MP。

### O009 — Credit Rating and approvals

Credit Rating 继续是基础值 0 的普通 SkillDefinition；职业点与兴趣点都可投入，最终值越出职业范围时需要显式 Keeper override，且 override 必须绑定当前职业身份。Keeper approval 使用带 reason 与 subject 的强类型记录，区分职业定义、Preset 职业政策、自定义职业、Credit Rating、Cthulhu Mythos 分配与模糊需求；模糊 requirement 的 subject 同时包含职业身份与 requirement ID。

职业技能 replacement 使用独立的 `occupation-skill-replacement` approval reason；subject 同时绑定 occupation ID、policy ID 与 target requirement ID。改变 replacement target 必须重新批准，未显式启用 replacement 时不产生批准要求。

自定义职业的八项限制按需求最多可产生的职业技能 category 数计算，不按 requirement 条目数计算。有限需求使用外层 `cardinality.max`；`one-branch` 取一个可选 branch 的最大容量，`choice-pool` 取最多可激活 branches 中最大的有限容量之和，并继续受外层 SkillRef max 约束。无法证明不超过八项的开放上限需求被拒绝，通用 Fighting / Firearms 专业化 branch 即使允许多个 refs 也各按一个职业技能 category 计数。

## Skills

### SK001 — Catalog and character state separation

`SkillDefinition` 属于 Setting content；`Character.skills` 只保存已经实例化或发生变化的 `SkillRef`、当前值与成长标记。静态技能名称、基础值和 Half / Fifth 不复制进人物记录。

### SK002 — Stable specialization identity

普通技能、预定义专业化与自定义专业化使用强类型 `SkillRef` 区分。预定义专业化使用稳定机器 ID；自定义专业化使用 UUID，改名不改变身份。显示名不作为去重依据。

`Language (Own)` 必须保存调查员具体母语身份，因此建模为只允许一个实例的 custom 专业化；其基础值仍为 EDU full。`Language (Other)` 保持可创建多个 custom 专业化实例。

### SK003 — Closed skill policies

技能基础值使用 `fixed` 或基于 Characteristic 的 `full`、`half`、`fifth` 闭合规则，不执行内容提供的任意公式或代码。成长资格与创建期点数政策分别使用强类型 policy；Cthulhu Mythos 的创建期政策保留 `keeper-approval` 语义。

### SK004 — Availability and aliases

技能是否出现在标准调查员卡以及是否现代限定，使用 `availability.sheet` 与 `availability.era` 的闭合枚举表达，不使用自由字符串 flags。`aliases` 是可选的本地化显示与搜索元数据，不参与 `SkillRef` identity、规则逻辑或持久化 key。

## KP Preset

### K001 — Preset scope

KP 可以创建建卡规则预设，目标包括 Setting、允许的属性生成方式、Skill caps、职业限制、年龄限制与自定义职业策略。

### K002 — Serverless sharing

Preset 计划通过纯前端 URL / Hash 分享，不为分享功能引入服务器。

### K003 — Preset snapshot

`CreationSession` 应保存 Preset Snapshot，避免 KP 后续修改原预设而改变进行中人物的规则。

### K004 — Skill final-value limits

新的 `skillLimits` 分别表达职业技能最终值、非职业兴趣技能最终值与全局最终技能值上限，不把分配贡献与最终成功率混为一谈。旧 `skillCaps` 语义从未冻结，因此只保留 deprecated 读取兼容，不猜测映射，也不影响新 allocation validator。

## Third-party projects

### T001 — trpg-saikou reference

`masquevil/trpg-saikou` 可作为 CoC 规则实现、中文职业/技能数据与可复用 GPL 代码的参考。直接复用代码时必须遵守 GPL 与署名要求。

### T002 — Independent project

不 Fork 整个 `trpg-saikou` 作为最终产品；COCSheet 是独立项目。

### T003 — DHSheet reference boundary

DHSheet 主要作为 UX 与 architecture inspiration，不复制 Daggerheart 业务规则。
