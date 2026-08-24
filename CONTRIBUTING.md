# 为 COCSheet 做贡献

感谢你帮助改进 COCSheet。请先 fork 仓库，从最新 `main` 创建范围明确的功能分支，再通过 Pull Request 提交；不要把无关重构混进同一 PR。

## 开发环境

项目使用 Node.js 22、Corepack 与 pnpm 11.21.0。

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

## 开始架构或代码修改前

请依次阅读 `AGENTS.md` 指定的项目资料：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/CURRENT_STATE.md`
5. `docs/ROADMAP.md`

`CURRENT_STATE.md` 是当前实现状态；Roadmap 不是功能授权。请保持 `Component → Pinia Store → Repository → Dexie`、Character / CreationSession 分离、TypeScript strict 与 Local First / Zero Server 边界。

玩家可见 UI 必须遵守 `docs/UI_TERMINOLOGY.md` 与 `docs/UX_QA_CHECKLIST.md`。涉及规则内容时不能凭印象修改；请在 Issue 或 PR 中说明明确的规则来源和页码。

## 提交前验证

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
node scripts/validate-occupation-audit.mjs
node scripts/validate-standard-weapons.mjs
git diff --check
```

玩家页面改动还需要在 production preview 中实际走通 touched workflow，至少检查 1280×900 与约 390×844、console errors 和 document 级横向溢出。

## Pull Request

PR 请说明问题、范围、关键设计取舍、验证结果、数据与兼容性影响。持久化 schema、IndexedDB、文件协议、规则 mechanics 或长期产品决策的变化必须单独指出，并同步维护对应项目文档。请勿提交真实人物资料、个人备份、分享 token、密钥或浏览器本地数据。
