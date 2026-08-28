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

Guided 模式实时展示当前步骤的权威 readiness 与七步流程位置；它不保存独立完成状态，也不接管真实 workflow navigation。

### 老玩家快速模式

熟悉规则的玩家可以直接编辑、快速车卡、跳过解释并使用手动数据。快速模式与萌新模式共享同一份 `Character`，不得维护两套人物数据。

### 公开发布质量

玩家可见界面默认使用自然中文和已确认的 CoC 中文术语。涉及玩家页面的改动除自动测试外，还必须在桌面与手机尺寸的真实浏览器中完成主要操作、错误状态、控制台和页面级横向溢出检查。

公开版本还必须长期清楚说明浏览器本地数据的保存与丢失风险，且只有用户显式操作才请求浏览器持久存储保护；该保护不得被宣传为备份。未处理运行异常和启动失败必须提供不依赖远端服务的恢复入口。版本诊断只在本地生成，移除 query、分享 token 与动态人物／预设 identity，不读取任何 domain data。发布验证包含 production build + Vite preview 的 Playwright Chromium desktop/mobile smoke。

公开 repository 与网站同时包含作者原创的 open-source software code，以及基于 Call of Cthulhu／Chaosium 出版物整理的 fan/game content。原创代码在适用范围内使用 GPL-3.0-only；第三方商标、规则资料、出版物衍生数据与来源引用不会因此被重新授权为 GPL 或 ORC。网站必须保持非官方、免费与非商业表达，并在每次正式 release 前重新核对 Chaosium 当前 Fan Material Policy 与 required notice。这项许可边界不改变 Pure Frontend、Local First、Zero Server 产品约束。

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
- 人物与资料库支持本地 JSON 导入 / 导出，用于长期保存与迁移。
- Home 调查员资料库提供基于已加载人物记录的轻量搜索、建卡状态筛选与排序；这些浏览条件不持久化，也不构成人物组织系统。
- KP Preset 通过压缩 URL 参数分享，不为分享功能引入服务器。
- 共享 KP Preset 除可直接用于建卡外，也可由接收方显式保存为 fresh-ID 本地副本；两种动作都保持纯前端与本地优先。
- 当前 production deployment 位于 GitHub Pages；架构继续兼容 Cloudflare Pages 或其他普通静态 Hosting，以保留未来迁移可能。

若未来需求确实无法在零服务器架构下实现，必须先明确提出架构变化，不能因实现方便擅自引入后端。

## Rules and setting scope

规则基础是 Call of Cthulhu 7th Edition。正式产品当前只支持 Standard CoC 7E。

Gaslight、Down Darker Trails、Dark Ages 与 Regency 当前不在 Roadmap。历史 domain/file 数据中的这些 Setting ID 继续作为 compatibility identity 读取，但不代表当前产品支持。未来若重新增加正式 Setting，必须另行获得产品授权并具备明确规则资料；底层 `SettingPack`、Setting Registry、same-Setting Registry 与 Extension Registry 扩展边界继续保留。

当前明确不支持 Pulp Cthulhu，也不规划日本职业或日系扩展。不得为了“规则完整”自行加入这些范围。

## UX reference

`RidRisR/DaggerHeart-CharacterSheet` 的 Character Creation Guide 可作为交互参考，尤其是围绕最终人物卡引导编辑的思路。它不是 CoC 规则来源，不得复制 Daggerheart 特定业务规则。
