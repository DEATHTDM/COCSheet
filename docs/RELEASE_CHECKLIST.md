# COCSheet 发布检查清单

正式发布或创建 tag 前完成以下检查；本页是可复用清单，不记录单次发布日志。

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
