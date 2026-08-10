# COCSheet

中文 Call of Cthulhu 7th Edition 建卡工具。

COCSheet 是纯前端、本地优先的调查员人物卡与建卡器工程骨架：不需要账号，不依赖自建服务器，正式人物与 KP 建卡预设保存在浏览器 IndexedDB 中。

本轮只建立稳定的工程、领域模型、持久化层和极简页面，尚未实现完整建卡规则与正式人物卡界面。

## 开发

需要 Node.js 与 pnpm。

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

开发服务器默认由 Vite 提供。生产构建位于 `dist/`，使用 Hash Router，可部署到 GitHub Pages、Cloudflare Pages或普通静态托管。

## 架构边界

- `src/coc7/rules`：不依赖 Vue 的纯规则函数
- `src/coc7/types`：COC7 领域类型与 Zod Schema
- `src/content`：五个 Setting 数据包与统一 Registry
- `src/creation`：建卡会话、KP 预设及流程状态
- `src/db`：Dexie 数据库、记录 Schema 与 Repository
- `src/app`：路由与全局 Pinia Store
- `src/pages`：极简页面，仅负责交互与展示

`Character` 是最终调查员数据源；`CreationSession` 只保存创建流程状态。SettingPack 是数据与内部扩展声明，不允许从 JSON 注入或执行任意 JavaScript。

## 当前支持的 Setting 占位包

- Standard COC7
- Cthulhu by Gaslight
- Down Darker Trails
- Cthulhu Dark Ages
- Regency Cthulhu

这些包本轮不包含完整职业、技能或装备数据库。

## Project documentation

- [Project context](docs/PROJECT_CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product decisions](docs/PRODUCT_DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Current state](docs/CURRENT_STATE.md)

## 许可证与第三方代码

项目代码以 `GPL-3.0-only` 授权。

本轮未直接复用第三方业务代码。项目依赖 Vue、Vue Router、Pinia、Dexie、Zod、Vite、Vitest 等开源软件，各依赖遵循其自身许可证。
