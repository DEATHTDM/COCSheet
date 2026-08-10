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

`Character` 是最终调查员状态的数据源。当前 Schema 包含 `version`、`id`、`name`、`settingId`，完成属性阶段后写入的可选 `age`、`characteristics` 与 `luck`，以及整体可选的 `resources`。`resources` 一旦存在就完整保存 current HP、current MP 与 current SAN；Maximum HP、Initial MP、Initial SAN、MOV、Damage Bonus、Build 与 Half / Fifth 均由纯函数实时计算，不进入持久化字段。

`Character` 不保存当前向导步骤、随机候选、未完成分配、UI 状态或 KP 预设编辑状态。

`CreationSession` 负责建卡流程状态。当前 Schema 包含 `version`、`characterId`、`settingId`、`currentStep`、可选 `presetSnapshot`、草稿年龄及强类型属性阶段状态。属性状态以 discriminated union 区分六种生成方式，并保存原始骰值、分配、候选组、Base Characteristics、年龄减值、EDU 成长记录与 Luck 来源。

Manual 的输入值以 Partial Characteristics 保存，八项完整且通过 Characteristic 校验前不生成 Base Characteristics。Point Buy 从当前预设的数学最低合法分配开始，并同样只在总点数和各项限制全部满足后生成 Base。`draftAge` 与年龄调整状态中的年龄必须一致。

属性完成时，`Character` 最终值与 `CreationSession` 流程推进在同一 Dexie 事务中写入。年龄改变只清除并重建年龄相关过程，始终从保存的 Base Characteristics 重新推导 Final Characteristics。

首次完成属性时，current HP、current MP 与 current SAN 分别按 Maximum HP、Initial MP 与 Initial SAN 初始化，并与最终属性和会话推进在同一事务中写入。Initial MP 为 `floor(POW / 5)`，但 current MP 只要求是非负整数，可以因其他规则高于 Initial MP；Phase 3 不实现 MP 自然回复规则。返回 attributes 重新完成会按新的最终属性重置这些初始资源。没有 `resources` 的 Phase 2 Character 继续兼容读取，由 UI 调用显式 Store action 补齐；Repository 读取不产生隐式写入。

创建 `Character` 与 `CreationSession` 时使用同一 Dexie 事务。删除 `CreationSession` 不影响 `Character`；删除 `Character` 时会同时删除对应会话。

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

当前 Standard SettingPack 包含一组用于验证领域模型与 UI 的代表性 `SkillDefinition`；其余四个 SettingPack 仍是空内容占位包，不包含技能目录，也不会隐式继承 Standard 内容。`SettingPack.skills` 是每个 Setting 技能内容的唯一入口；`src/content/skillRegistry.ts` 从对应 SettingPack 动态创建并缓存 registry，负责按稳定 definition ID 查询目录、解析预定义专业化，并在注册时拒绝重复 ID。新增 Setting 技能只需向对应 SettingPack 提供 `skills`，Registry 不维护 Setting 分派分支。

## Skill architecture

技能领域保持以下分离：

```text
SettingPack / Skill Registry（静态 SkillDefinition）
                    +
Character.skills（实例化或变化的 CharacterSkill）
                    ↓
纯规则层实时解析 base / current / half / fifth
```

`SkillBaseValueRule` 是闭合联合类型，只允许固定值或 Characteristic 的 full / half / fifth；Half 与 Fifth 复用既有纯函数。`SkillRef` 区分普通技能、预定义专业化和 UUID 标识的自定义专业化。Store 根据 SkillDefinition 的成长政策验证成长标记，并通过 CharacterRepository 持久化；Component 不直接访问 Dexie。

`Language (Own)` 使用 `required + allowMultiple: false + allowCustom: true` 的专业化政策，具体母语名称和稳定 UUID 保存在 CharacterSkill 的 custom SkillRef 中；`Language (Other)` 则允许多个 custom 实例。

Phase 4A 只在 `Character.version = 1` 中新增 optional `skills`。静态目录、基础值、名称、来源、点数分配和验证错误不持久化，旧 Character 读取也不会触发隐式写回。

## Occupation architecture

职业领域按三层理解：

1. Occupation Engine：职业点公式、技能选择要求、前置要求、信用评级和验证。
2. Occupation Data：具体职业记录。
3. Setting / Content：决定职业、技能和装备属于哪个建卡环境。

当前只有 Schema、职业点公式计算与属性前置验证基础；没有正式职业数据或职业 UI。职业数据不得硬编码进 Vue 页面。

## Schema evolution

正式持久化 Schema 的变化必须考虑旧版本解析、数据迁移、IndexedDB version，以及未来导入/导出兼容。项目尚未正式发布，早期可以合理重构，但不得无说明破坏已有本地测试数据。
