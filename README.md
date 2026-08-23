# COCSheet

中文 Call of Cthulhu 7th Edition 建卡工具。

COCSheet 是纯前端、本地优先的调查员人物卡与建卡器工程骨架：不需要账号，不依赖自建服务器，正式人物与 KP 建卡预设保存在浏览器 IndexedDB 中。

COCSheet 当前正式支持 Standard CoC 7E 调查员建卡、长期人物卡维护、本地备份与迁移、KP 预设分享，以及打印 / PDF 输出。自定义职业与自定义技能可用于更自由的人物配置。

## 在线使用

<https://deathtdm.github.io/COCSheet/>

人物与 KP 建卡预设仍只保存在当前浏览器本地，不会同步到服务器。

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
- `src/content`：Standard content、Setting Registry 与历史 identity 显示兼容边界
- `src/creation`：建卡会话、KP 预设及流程状态
- `src/db`：Dexie 数据库、记录 Schema 与 Repository
- `src/app`：路由与全局 Pinia Store
- `src/pages`：极简页面，仅负责交互与展示

`Character` 是最终调查员数据源；`CreationSession` 只保存创建流程状态。SettingPack 是数据与内部扩展声明，不允许从 JSON 注入或执行任意 JavaScript。

## 当前支持范围

当前正式产品环境只有 Standard CoC 7E。历史文件中的旧 Setting identity 仍可安全读取、备份和显示，但不属于当前可新建的产品环境，也不会回退套用 Standard 内容。

## Project documentation

- [Project context](docs/PROJECT_CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product decisions](docs/PRODUCT_DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Current state](docs/CURRENT_STATE.md)

## 许可证与第三方代码

项目代码以 `GPL-3.0-only` 授权。

本轮未直接复用第三方业务代码。项目依赖 Vue、Vue Router、Pinia、Dexie、Zod、Vite、Vitest 等开源软件，各依赖遵循其自身许可证。
