# Changelog

## [1.0.0] - 2026-08-28

### Added

- CoC 7版标准规则的新手引导与快速建卡。
- 可长期使用的人物卡，包含技能、背景、资源、财富、物品与武器管理。
- 打印版人物卡与浏览器打印／保存 PDF。
- 单人物导入导出、完整资料库备份与恢复。
- 建卡预设、纯前端分享链接与接收方本地保存。
- 调查员资料库的搜索、建卡状态筛选与排序。
- 本地数据安全说明、运行异常恢复、隐私安全诊断与 production browser validation。
- 非官方粉丝项目、Fan Material 与许可边界披露。

### Compatibility

- 保持 `cocsheet-character`、`cocsheet-library` 与 `cocsheet-kp-preset-share` 的 version-1 格式。
- 保留历史不受支持 Setting identity 的读取、展示、备份与删除能力，不回退套用 Standard 内容。

### Deployment

- 通过 GitHub Pages 提供纯前端静态站点。
- 保持 Local First / Zero Server；人物数据默认只存在当前浏览器。
