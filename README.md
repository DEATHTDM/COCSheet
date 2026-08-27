# COCSheet

COCSheet 是面向中文玩家的 Call of Cthulhu 7th Edition 调查员建卡工具与长期电子人物卡。它是纯前端、Local First、Zero Server 应用：无需账号，也不会把人物资料自动上传到服务器。

## 在线使用

<https://deathtdm.github.io/COCSheet/>

## 当前功能

- CoC 7版标准规则建卡
- 新手引导与快速建卡
- 长期人物卡，以及背景故事、财富、物品与武器维护
- 打印版人物卡与浏览器打印 / 保存 PDF
- 本地调查员资料库搜索、建卡状态筛选与排序
- 单人物文件导入与导出
- 完整资料库备份与恢复
- 建卡预设与纯前端链接分享

## 本地数据与备份

> 人物资料、建卡进度和建卡预设默认只保存在当前浏览器与当前设备，不会自动同步。清理网站数据、使用无痕模式、更换设备、卸载或重置浏览器资料，都可能导致本地资料无法继续使用。请定期导出完整备份，并把备份文件保存在可靠位置。

浏览器持久存储保护只能降低浏览器自动回收站点数据的可能，不等于备份，也不能抵抗主动清理、浏览器资料删除、设备损坏或换设备。

## 当前支持范围与浏览器

当前正式产品只支持 CoC 7版标准规则。历史文件中的旧建卡环境 identity 可以安全读取、显示和备份，但不能用于新建调查员，也不会回退套用标准规则内容。

建议使用较新的现代浏览器。CI 会自动运行 Chromium production smoke；打印、剪贴板与持久存储能力可能因浏览器支持和权限设置而不同。项目目前不宣称未经验证的全面浏览器兼容。

## 本地开发

需要 Node.js 22。项目固定使用 Corepack 与 pnpm 11.21.0。

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

生产构建位于 `dist/`，使用 Hash Router 与相对资源路径，可部署到普通静态托管。

## 测试与验证

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
node scripts/validate-occupation-audit.mjs
node scripts/validate-standard-weapons.mjs
git diff --check
```

Playwright 运行 production build + Vite preview 的 Chromium desktop/mobile smoke，而不是开发服务器。

## 贡献与反馈

提交代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。Bug 与功能建议可通过 [GitHub Issues](https://github.com/DEATHTDM/COCSheet/issues/new/choose) 提交；请勿公开上传未经脱敏的人物文件、完整资料库备份或分享链接 token。

## 许可证

项目以 [GPL-3.0-only](LICENSE) 授权。第三方依赖分别遵循其自身许可证。
