# COCSheet Codex Instructions

## Project

COCSheet 是中文 Call of Cthulhu 7th Edition 人物卡与建卡工具。

## Before doing work

开始任何代码或架构任务前，必须依次阅读：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/CURRENT_STATE.md`
5. `docs/ROADMAP.md`

`CURRENT_STATE.md` 用于确认当前真正已经完成的内容。`ROADMAP.md` 只表示计划方向；Roadmap 中存在某项功能，不代表当前任务允许实现它。

## Source of truth priority

发生冲突时，优先级如下：

1. 当前用户任务
2. `AGENTS.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/CURRENT_STATE.md`
6. `docs/ROADMAP.md`
7. `README.md`

不要因为 README 或旧代码与已确认决策冲突，就自行恢复旧设计。发现明显冲突时应停止猜测并明确指出。

## Development principles

- 保持 TypeScript strict，避免 `any`。
- 规则逻辑优先使用纯函数。
- Vue Component 不直接访问 Dexie；保持 `Component → Pinia Store → Repository → Dexie` 数据流。
- 保持 `Character` 与 `CreationSession` 分离：最终人物数据进入 `Character`；创建过程、中间选择与候选结果进入 `CreationSession`。
- 保持 rules、content、UI、storage 分离。
- `SettingPack` 不允许执行任意代码；Setting 特殊规则通过内部 Extension Registry 实现。
- 持久化 Schema 变化必须考虑已有 IndexedDB 数据。
- 不为“以后可能用到”提前实现业务，不顺手实现当前任务范围外的 Roadmap 功能。

## Player-facing UI

- 玩家可见界面默认使用中文，不直接暴露开发者内部英文标识。
- 玩家可见 CoC 术语必须遵守 `docs/UI_TERMINOLOGY.md`。
- occupation skill 必须写作“本职技能”，不得写作“专业化技能”；本职技能与技能专攻不得混淆。
- 修改玩家可见页面后，除自动测试外必须进行实际浏览器验收：至少覆盖一个桌面 viewport、一个约 390px 手机 viewport、touched workflow 的真实点击路径、console errors 与页面级横向 overflow。

## Validation

修改代码后至少运行：

```text
pnpm test
pnpm build
```

任一检查失败时，不得把任务描述为完成。

## Git workflow

除非当前任务另有明确要求：

- 从最新 `main` 创建功能分支，不直接在 `main` 开发。
- 不 force push `main`。
- 完成后 commit、push，并创建 Draft PR。
- 不自动 merge。

## Documentation maintenance

- 新的、已确定的长期设计决策：更新 `docs/PRODUCT_DECISIONS.md`。
- 技术架构改变：更新 `docs/ARCHITECTURE.md`。
- 开发阶段完成或当前实现状态实质变化：更新 `docs/CURRENT_STATE.md`。
- 路线改变：更新 `docs/ROADMAP.md`。
- 不要因普通 bug fix 机械修改所有文档。

## Important

不要根据推测改写 Call of Cthulhu 规则。规则实现必须有明确来源或明确任务要求。若当前代码、旧数据、第三方项目与已确认规则冲突，停止实现并指出冲突。

## Fan material and licensing P0

- 原创软件代码的 GPL 与第三方 game/fan content 权利边界必须分开；不得把 Chaosium／Call of Cthulhu fan material 错误标成 GPL 或 ORC open content。
- 不得提交规则书扫描件、官方 artwork／logos、专有字体或大段复制的书籍文本。
- 修改第三方 game content 前必须核对明确来源与适用授权／当前 Fan Material Policy；source reference 本身不是授权证明。
- 每次正式 release 前必须重新检查 Chaosium 当前 Fan Material Policy 与 required notice，因为政策可能变化。
