# COCSheet 发布检查清单

正式发布或创建 tag 前完成以下检查；本页是可复用清单，不记录单次发布日志。

## 自动验证

- [ ] `corepack pnpm test`
- [ ] `corepack pnpm build`
- [ ] `corepack pnpm test:e2e`（Chromium production-preview）
- [ ] `node scripts/validate-occupation-audit.mjs`
- [ ] `node scripts/validate-standard-weapons.mjs`
- [ ] `git diff --check`
- [ ] 固定 v1 character / library / share fixtures 继续通过

## 产品与浏览器验收

- [ ] 1280×900 desktop 与 390×844 mobile touched workflows 实操通过
- [ ] 本地数据安全说明清楚，持久存储保护没有被描述成备份
- [ ] version 与 exact build SHA 在普通页面和诊断报告中一致
- [ ] runtime recovery、启动失败 fallback、Not Found 与反馈入口可用
- [ ] console errors 为 0，document 无页面级横向 overflow

## 发布与上线

- [ ] GitHub Pages build 使用准备发布的 exact commit
- [ ] Pages deployment 成功
- [ ] live production 首页、创建、人物卡、打印、预设、备份与未知路由 smoke 通过
- [ ] live production version/build metadata 与发布 commit 一致
