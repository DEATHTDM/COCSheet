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

### O006 — Unfrozen skill requirement schema

`OccupationSkillRequirement` 当前支持 `fixed`、`choice`、`group-choice`、`any` 与 `specialization`，但 Schema 尚未冻结。正式录入 Standard 职业前，必须用真实复杂职业进行压力测试。

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

## Third-party projects

### T001 — trpg-saikou reference

`masquevil/trpg-saikou` 可作为 CoC 规则实现、中文职业/技能数据与可复用 GPL 代码的参考。直接复用代码时必须遵守 GPL 与署名要求。

### T002 — Independent project

不 Fork 整个 `trpg-saikou` 作为最终产品；COCSheet 是独立项目。

### T003 — DHSheet reference boundary

DHSheet 主要作为 UX 与 architecture inspiration，不复制 Daggerheart 业务规则。
