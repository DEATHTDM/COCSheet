# COCSheet Content Licensing Audit

本文件是发布前内容盘点与保守风险记录，不是法律意见，也不表示项目“100% legally safe”。

- Audit baseline: `main@a292647e9df9f776dd54735b3867dcfb306fd4e0`
- Audit date: 2026-08-27
- Scope: 当前 tracked tree、全 Git history 的文件名与大 blob、production source/build 输入、repository-only tests/audit data、文档与 Issue Forms

## Official policy checked

仅使用 Chaosium 官方来源：

- [Fan Material Policy](https://www.chaosium.com/fan-material-policy/)（页面标注 Revised: October 13, 2023）
- [Fan-Use and Licensing Q&A](https://www.chaosium.com/fan-use-and-licensing-q-a/)（页面标注 Revised: October 13, 2023）
- [Trademarks and Copyrights](https://www.chaosium.com/trademarks-and-copyrights/)
- [BRP ORC License](https://www.chaosium.com/orc-license/)

核对结果：官方政策允许符合其条件的 web-based character sheets 与 web-based character generators；要求 non-commercial、non-retail、unofficial、unbranded，不得仿制 trade dress，并要求每个使用相关材料的网站以 plainly legible and accessible 形式展示指定 notice。Q&A 同时说明收费／monetise 或 app-based generator 需要 Commercial License。ORC 页面只说明 BRP: Universal Game Engine 的 ORC 边界，并把 Call of Cthulhu 等商标列为 Product Identity；COCSheet 没有据此声明自身或 bundled CoC 内容属于 ORC。

## A. Original application code

- `src/app/**`、`src/pages/**`、`src/components/**`、Store/Repository、portability、build、CI 与 E2E 构成 COCSheet 的应用实现。
- 本轮未发现源文件中的 copied/adapted/ported-from 标记；`trpg-saikou` 与 DaggerHeart 项目只在产品文档中作为规则／UX 参考边界出现。
- 作者拥有权利的原创软件代码在适用范围内声明 GPL-3.0-only；第三方依赖继续遵循各自许可。本审计不对每一行代码作著作权归属鉴定。
- 按 2026-08-27 本地安装包 manifest 复核，直接依赖／开发依赖中 Vue、Pinia、Vue Router、Vite、Vitest、jsdom、Zod、Vue Test Utils 与相关 Vue tooling 标注 MIT；Dexie、Playwright、TypeScript 与 fake-indexeddb 标注 Apache-2.0。这是 metadata inventory，不代替 transitive dependency、NOTICE 或许可证全文复审。

## B. CoC-specific mechanics and data

以下区域包含 Call of Cthulhu 7th Edition 相关 mechanics 或 publication-derived data，不能因为与 GPL 代码同仓而被描述成已获得 GPL 或 ORC 授权：

- `src/content/standard/**`: 54 项技能目录、91 个职业 family／119 个 definition、104 项武器目录、名称、数值、选择结构、短 guidance 与 source refs。
- `src/coc7/rules/**`: 属性、年龄、Luck、派生值、技能、职业分配与 Standard 财富等 mechanics 实现及测试。
- `src/coc7/types/**`: 对应领域结构与 source-reference schema。
- `src/coc7/testing/occupationFixtures.ts`: repository-only 职业 Engine fixture。
- `src/creation/**`、人物卡 presentation 与 tests/fixtures 中会呈现或固定上述规则身份和值的部分。

本轮没有删除技能、职业、武器、Credit Rating、公式或 validator，也没有改变 rules mechanics。

## C. Source references

- 生产 `sourceRefs` 记录 Keeper Rulebook／Investigator Handbook 的 title、source ID、页码与极短 note。
- `docs/STANDARD_OCCUPATION_SOURCES.md`、`docs/STANDARD_WEAPON_SOURCES.md` 与 `docs/STANDARD_OCCUPATION_AUDIT.md` 保存规则核对过程。
- `docs/data/STANDARD_OCCUPATION_OFFICIAL_INVENTORY.csv` 与 `docs/data/STANDARD_OCCUPATION_EXCEL_CROSSWALK.csv` 保存职业 source inventory/crosswalk。

这些 metadata 对纠错和 provenance 有维护价值，但不是授权证明。CSV 含结构化职业名称、公式与技能列表，属于 publication-derived audit material，仍需和 bundled production catalogs 一并进行独立许可复审。

## D. Trademark mentions

- `Call of Cthulhu`、`Chaosium`、若干历史 Setting／产品标题出现在 README、项目文档、source refs、compatibility labels 与 UI。
- 本轮在首次正式产品描述中使用 `Call of Cthulhu®`，并在 Legal 页面说明商标归属；普通 CoC 社区缩写和每个 UI label 不重复堆叠 `®`。
- 未发现 Chaosium logo、官方 Elder Sign、官方 Yellow Sign 或模仿官方 branding 的素材。

## E. Repository-only tests and audit material

- `src/**/*.test.ts`、`tests/fixtures/**`、`e2e/**`、`scripts/**` 与 `docs/data/**` 不进入 Vite `dist/`。
- Occupation/skill/weapon tests 固定了名称、规则数值、source rows 与 compatibility identity；它们仍属于 repository 的公开内容，不因未进入 build 而自动获得 GPL 或 ORC 权利。
- 没有发现 scenario text、连续叙事段落或大段 Keeper Rulebook／Investigator Handbook 原文。职业 CSV 中的表格化技能列表和简短注记不是长篇 prose，但其保留范围仍列入人工复审。

## F. Static site-visible material

- Vite production build 只发布 `dist/`，不会发布 `docs/**`、audit CSV、tests、scripts、Issue Forms、repository root 或本地用户数据。
- `dist` 会包含运行应用所需的 Standard 技能／职业／武器数据、规则 mechanics、source-reference metadata、玩家 UI 文案与 Legal 页面。
- Legal 页面静态内置 required Fan Material notice，不在运行时 fetch Chaosium、政策或任何 API；没有 analytics、telemetry 或 remote logging。

## G. Binary, art, assets, and history result

- Baseline tracked tree 共 268 个文件；NUL-byte scan 结果为 0 个 binary file。
- 当前 tree 没有 PDF、电子书、Word／Excel／PowerPoint、扫描件、图片、地图、压缩包、音视频、设计源文件或 font file。
- CSS 没有 `@font-face`、图片 URL 或外部字体下载；只使用 Georgia、Noto Sans/Serif SC、Microsoft YaHei 与 system UI 的本机 fallback 名称。
- 全 Git history 的 tracked path scan 没有上述候选二进制扩展；全历史没有大于等于 500 KiB 的 blob。因此本轮未发现需要删除当前文件或 rewrite history 的官方素材。

## H. Items removed or reworded

- 新增根级 `NOTICE.md`，把原创代码 GPL 与第三方/fan material 权利边界分开。
- README、Legal 页面、footer、index description、CONTRIBUTING、AGENTS、Issue Forms 与 release checklist 改为非官方、免费、非商业和不重新许可第三方内容的保守表达。
- 未删除规则数据或 source refs；未发现需要改写的长段书籍 prose。
- 根 `LICENSE` 保持标准 GPL-3.0-only 正文；`package.json` 继续为 version `0.1.0`、`private: true`、`license: GPL-3.0-only`。

## I. Remaining unresolved questions

以下问题必须由独立法律复审、权利人确认或 release owner 明确接受，不能由本技术审计代替：

1. Fan Material Policy 明确允许 web-based character generators，同时排除用户下载、安装或运行的 software/apps。公开源代码 repository 本身可下载，并与 CoC-specific bundled data 一起分发；当前政策文字是否覆盖这种 source distribution，需要确认。
2. Standard 技能、职业、武器、财富表及 repository-only audit CSV 的具体范围是否全部适合在 Fan Material Policy 下公开保留，需要对实际 bundled structured data 做独立内容许可复审。
3. GPL-3.0-only 对原创代码的 grant 与 non-commercial Fan Material conditions 并置时，具体聚合／分发方式是否充分清楚且兼容，不能仅靠 NOTICE 推定。
4. `package.json` 的 `GPL-3.0-only` metadata 已按任务保持不变并限定解释为原创代码；独立复审仍应判断 repository/package 的整体呈现是否可能误导。
5. Chaosium 政策可单方更新。每个正式 release/tag 前必须重新核对官方页面与 required notice；本次 2026-08-27 快照不能代替未来检查。

在这些问题解决或由 release owner 获得合格意见前，本审计不建议把 Phase 19A 的文案整改表述成“已确认可以发布 v1.0”。
