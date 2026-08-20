# Standard Weapon Sources

## Scope

Phase 7C-1 只建立 `WeaponDefinition`、Setting weapon registry 与 8 行 production pilot。本文不是完整武器 inventory，也不表示表 17 已经全部核验或导入。完整 Standard 武器目录留给 Phase 7C-2。

## Primary sources

- `coc7-keeper-rulebook-40th-zh`：`《克苏鲁的呼唤 40 周年纪念版》`，表 17：武器列表，印刷页 401、403～404。
- `coc7-investigator-handbook-zh-1-21`：`《克苏鲁的呼唤第七版调查员手册》`，表 10-2、10-5～10-8，印刷页 250、252～253。

页码均为书内印刷页，不是 PDF viewer 页码。两份本地 PDF 已用于核对本阶段 8 行 pilot；没有对表 17 的其他行作完整核验。

## Official columns and notation

正式表格提供武器名称、所用技能、伤害、贯穿、基础射程、每轮攻击次数、弹容量、1920 年代／现代参考价格、故障值与时代。表内显示单元格允许保留异构记法，例如：

- 伤害：`1D8+DB`、`1D6+半DB`、`4D6/2D6/1D6`。
- 射程：`接触`、`STR ft`、`30m`、`10/20/50m`。
- 每轮：`1`、`1或2`、`1(2)或3发点射`、`1或全自动`、`1(2)或全自动`。
- 弹容量与价格：`20/30/50`、`一次性`、`独立装弹`、`$200+` 等官方参考文本。

Phase 7C-1 只把 stable ID、category、typed `SkillRef`、impales、era availability、malfunction 与 `sourceRefs` 结构化。Damage、range、attacks、capacity 与 reference prices 在没有 combat engine 前保持 source-faithful display text，不解析为 dice AST、射击模式、射程引擎或购买系统。

## Verified pilot mapping

| Weapon ID | Keeper Rulebook | Investigator Handbook | Phase 7C-1 exact mapping |
| --- | --- | --- | --- |
| `bow` | 表 17，401 | 表 10-2，250 | `1D6+半DB`、`30m`、`1`、容量 `1`、`$7/$75`、故障 97；射程采用 Keeper 公制显示 |
| `chainsaw` | 表 17，401 | 表 10-2，250 | `2D8`、贯穿、`接触`、`1`、现代 `$300`、故障 95、modern-only |
| `large-knife` | 表 17，401 | 表 10-2，250 | 名称采用 Handbook 的“大型刀（甘蔗刀等）”；`1D8+DB`、贯穿、`接触`、`1`、`$4/$50` |
| `thrown-rock` | 表 17，401 | 表 10-2，250 | `1D4+半DB`、非贯穿、`STR ft`、`1`；射程采用 Handbook 显示，Keeper 公制表记为 `STR/5m` |
| `12-gauge-double-barrel-shotgun` | 表 17，403 | 表 10-5，252 | `4D6/2D6/1D6`、非贯穿、`10/20/50m`、`1或2`、容量 `2`、`$40/$200`、故障 100 |
| `fn-fal` | 表 17，404 | 表 10-6，253 | `2D6+4`、`110m`、`1(2)或3发点射`、容量 `20`、现代 `$1500`、故障 97、modern-only |
| `thompson-submachine-gun` | 表 17，404 | 表 10-7，253 | `1D10+2`、`20m`、`1或全自动`、`20/30/50`、`$200+/$1600`、故障 96、classic-only |
| `m1918-browning-automatic-rifle` | 表 17，404 | 表 10-8，253 | `2D6+4`、`90m`、`1(2)或全自动`、容量 `20`、`$800/$1500`、故障 100、classic-only |

两书的单位与个别中文名称存在正式表内差异。本阶段只采用任务指定且能在对应正式行中逐项核实的显示值，并在上表标明具体来源；没有把两书差异静默“纠正”为新的第三种表示。
