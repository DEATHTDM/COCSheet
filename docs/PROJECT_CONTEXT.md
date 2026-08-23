# COCSheet Project Context

## Product

COCSheet 是中文 Call of Cthulhu 7th Edition 调查员建卡器，也是可持续使用的电子人物卡。它不是对纸质人物卡的简单复制，核心目标是降低 CoC 新玩家第一次建卡时的信息负担，同时保留熟悉规则的玩家需要的直接编辑能力。

## Core user experience

### 萌新向导模式

建卡向导围绕最终人物卡进行引导，不维护一套完成后再转换为人物卡的独立 Wizard 数据。

```text
建卡向导引导编辑
        ↓
同一份 Character
```

最终人物卡始终是人物数据源，向导只负责创建流程控制。向导体验应支持当前步骤验证、Previous / Next、相关区域突出、不相关区域弱化，以及流程状态与人物数据实时联动。

### 老玩家快速模式

熟悉规则的玩家可以直接编辑、快速车卡、跳过解释并使用手动数据。快速模式与萌新模式共享同一份 `Character`，不得维护两套人物数据。

## Product constraints

COCSheet 必须保持：

```text
Pure Frontend
Local First
Zero Server
```

这意味着：

- 不需要账号、自建服务器或云数据库，也不依赖用户自己的服务器。
- 人物默认保存在浏览器 IndexedDB。
- 文件导入/导出是计划中的长期保存与迁移方式。
- KP Preset 计划通过压缩 URL / Hash 分享，不为分享功能引入服务器。
- 当前 production deployment 位于 GitHub Pages；架构继续兼容 Cloudflare Pages 或其他普通静态 Hosting，以保留未来迁移可能。

若未来需求确实无法在零服务器架构下实现，必须先明确提出架构变化，不能因实现方便擅自引入后端。

## Rules and setting scope

规则基础是 Call of Cthulhu 7th Edition。计划支持五种主要建卡环境：

| ID | Setting |
| --- | --- |
| `standard` | Standard COC7 |
| `gaslight` | Cthulhu by Gaslight |
| `down-darker-trails` | Down Darker Trails |
| `dark-ages` | Cthulhu Dark Ages |
| `regency` | Regency Cthulhu |

这些 Setting 是彼此独立的主要建卡环境；普通玩家不应被要求同时勾选五个时代包。

当前明确不支持 Pulp Cthulhu，也不规划日本职业或日系扩展。不得为了“规则完整”自行加入这些范围。

## UX reference

`RidRisR/DaggerHeart-CharacterSheet` 的 Character Creation Guide 可作为交互参考，尤其是围绕最终人物卡引导编辑的思路。它不是 CoC 规则来源，不得复制 Daggerheart 特定业务规则。
