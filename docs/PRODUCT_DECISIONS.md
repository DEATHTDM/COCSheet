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
