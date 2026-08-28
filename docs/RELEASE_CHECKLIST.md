# COCSheet 发布检查清单

正式发布或创建 tag 前完成以下检查；本页是可复用清单，不记录单次发布日志。

## v1.0.0 RC acceptance

### Pre-merge RC

- [ ] `package.json` version 精确为 `1.0.0`
- [ ] 全量 Vitest 与固定 v1 character / library / share compatibility fixtures 通过
- [ ] production build 通过，artifact 同时包含 `1.0.0` 与 exact RC head SHA
- [ ] Playwright desktop 1280×900 与 mobile 390×844 的 9 项 production-preview tests 通过
- [ ] occupation audit 与 Standard weapon audit 通过
- [ ] generic release compliance 与 `EXPECTED_APP_VERSION=1.0.0` exact compliance 通过
- [ ] Chaosium 当前 Fan Material Policy / required notice 已重新核对
- [ ] README、NOTICE、Legal、CHANGELOG 与 v1.0.0 release notes 一致
- [ ] `git diff --check` 通过
- [ ] desktop/mobile 真实浏览器 RC QA 通过，normal paths `console.error = 0`、`pageerror = 0`、document horizontal overflow = 0

### Post-merge release closure

- [ ] 记录 main exact merge SHA，确认 main Validate success
- [ ] 确认 Pages artifact build 与 Pages deploy success
- [ ] live footer 精确为 `v1.0.0` + merge short SHA
- [ ] live root、Create、Character workflow、Final Sheet、Print、Presets、Backup、Legal 与 unknown route 通过
- [ ] live normal paths `console.error = 0`、`pageerror = 0`，mobile document horizontal overflow = 0
- [ ] 仅在上述项目全部通过后创建 annotated 或 lightweight `v1.0.0` tag
- [ ] 仅在上述项目全部通过后创建 GitHub Release，target 精确等于已验证的 production main commit

## 自动验证

- [ ] `corepack pnpm test`
- [ ] `corepack pnpm build`
- [ ] `corepack pnpm test:e2e`（Chromium production-preview）
- [ ] `node scripts/validate-occupation-audit.mjs`
- [ ] `node scripts/validate-standard-weapons.mjs`
- [ ] `corepack pnpm validate:release-compliance`
- [ ] `git diff --check`
- [ ] 固定 v1 character / library / share fixtures 继续通过

## 产品与浏览器验收

- [ ] 1280×900 desktop 与 390×844 mobile touched workflows 实操通过
- [ ] 本地数据安全说明清楚，持久存储保护没有被描述成备份
- [ ] version 与 exact build SHA 在普通页面和诊断报告中一致
- [ ] runtime recovery、启动失败 fallback、Not Found 与反馈入口可用
- [ ] console errors 为 0，document 无页面级横向 overflow

## Fan material 与许可边界

- [ ] Chaosium 当前 Fan Material Policy 已在 release 当日或 release review 中重新核对
- [ ] 网站 required Fan Material notice 与当前官方 wording 一致且 `/legal` 可访问
- [ ] README、NOTICE 与 Legal page 的 GPL／third-party content 范围一致
- [ ] 当前 tree 与待发布 artifact 没有官方 scans、PDF、artwork、logos、signs、trade dress 或专有字体
- [ ] 没有未经审查的大段书籍原文；结构化 game content 与 source refs 已纳入 release review
- [ ] original code GPL 与 fan/game content 的独立权利边界清楚，没有把 bundled content 宣称为 GPL 或 ORC
- [ ] 免费／non-commercial 表达与实际产品、hosting、funding 和 fork/redistribution guidance 不冲突
- [ ] `docs/CONTENT_LICENSING_AUDIT.md` 的 unresolved questions 已由合格复审处理或被 release owner 明确接受，不能仅凭 NOTICE 判定可发布

## 发布与上线

- [ ] GitHub Pages build 使用准备发布的 exact commit
- [ ] Pages deployment 成功
- [ ] live production 首页、创建、人物卡、打印、预设、备份与未知路由 smoke 通过
- [ ] live production version/build metadata 与发布 commit 一致
