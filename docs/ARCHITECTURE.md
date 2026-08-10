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

`Character` 是最终调查员状态的数据源。当前 Schema 包含 `version`、`id`、`name`、`settingId`，以及完成属性阶段后写入的可选 `age`、`characteristics` 与 `luck`。Half / Fifth 由纯函数实时计算，不进入持久化字段。

`Character` 不保存当前向导步骤、随机候选、未完成分配、UI 状态或 KP 预设编辑状态。

`CreationSession` 负责建卡流程状态。当前 Schema 包含 `version`、`characterId`、`settingId`、`currentStep`、可选 `presetSnapshot`、草稿年龄及强类型属性阶段状态。属性状态以 discriminated union 区分六种生成方式，并保存原始骰值、分配、候选组、Base Characteristics、年龄减值、EDU 成长记录与 Luck 来源。

属性完成时，`Character` 最终值与 `CreationSession` 流程推进在同一 Dexie 事务中写入。年龄改变只清除并重建年龄相关过程，始终从保存的 Base Characteristics 重新推导 Final Characteristics。

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

当前五个 SettingPack 只是占位包，不含正式职业、技能或装备数据。

## Occupation architecture

职业领域按三层理解：

1. Occupation Engine：职业点公式、技能选择要求、前置要求、信用评级和验证。
2. Occupation Data：具体职业记录。
3. Setting / Content：决定职业、技能和装备属于哪个建卡环境。

当前只有 Schema、职业点公式计算与属性前置验证基础；没有正式职业数据或职业 UI。职业数据不得硬编码进 Vue 页面。

## Schema evolution

正式持久化 Schema 的变化必须考虑旧版本解析、数据迁移、IndexedDB version，以及未来导入/导出兼容。项目尚未正式发布，早期可以合理重构，但不得无说明破坏已有本地测试数据。
