# Standard Occupation Sources

本文记录 Standard COC7 职业数据的来源策略与已核验范围。它只保存结构化事实和差异摘要，不复制规则正文。

## Source strategy

- 职业机械以官方 PDF 为权威来源：`《克苏鲁的呼唤 40 周年纪念版》`与`《克苏鲁的呼唤第七版调查员手册》`。
- `COC7空白卡CY23Final.xlsx` 只作为中文职业数据池、名称参考、清单参考与后续录入 checklist；不得凭 Excel 判定机械正确。
- `src/coc7/testing/occupationFixtures.ts` 只保留 Phase 5A Engine 压力测试角色；生产代码不得依赖它。
- 两书机械一致时使用一个 canonical definition，并保留多个 `sourceRefs`。只有 point formula、Credit Rating 或确定性 requirement 等机械字段真正不同时才建立 `variantOf`。
- 来源页码均为书内印刷页，不是 PDF viewer 页码。

## Phase 5B-1 verification matrix

`era = all` 表示该职业适用于 Standard 当前声明的 `classic-1920s` 与 `modern`，且两本来源没有给出更窄的时代限制。

| Family / production ID | 中文 / English | Source printed page | Category | Era | CR | Point formula | Req. | Complex selector coverage | Other source comparison | Variant / fuzzy review |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `accountant` | 会计师 / Accountant | 调查员手册 70 | `business-professional` | all | 30-70 | EDU×4 | 7 | choose 2, any skill | 核心规则书范例表无此项 | canonical；个人或时代特长需 review |
| `antiquarian` | 文物学家（原作向） / Antiquarian | 核心 40；手册 71 | `academic` | all | 30-70 | EDU×4 | 8 | open specialization, one-of, any skill | 机械一致；自由技能措辞粒度不同 | canonical；个人或时代特长需 review |
| `artist` | 艺术家 / Artist | 核心 40；手册 71 | `media-art` | all | 9-50 | EDU×2 + best(DEX, POW)×2 | 7 | open specialization, one-of, choose 2 | 机械一致 | canonical；个人或时代特长需 review |
| `author` | 作家（原作向） / Author | 核心 40；手册 72-73 | `media-art` | all | 9-30 | EDU×4 | 8 | named custom Literature, one-of, any skill | 机械一致 | canonical；个人或时代特长需 review |
| `doctor-of-medicine` | 医生（原作向） / Doctor of Medicine | 核心 40；手册机械字段 78 | `medical` | all | 30-80 | EDU×4 | 7 | named custom Latin, predefined Biology/Pharmacy, choose 2 | 机械一致 | canonical；学术或个人特长需 review |
| `journalist-*` | 记者 / Journalist family | 核心 41；手册 81-82 | `media-art` | all | 9-30 | EDU×4 | 7 / 7 / 8 | exact predefined, one-of, any skill | 核心固定摄影；手册调查记者允许艺术或摄影；通讯记者为另一技能组 | 3 source variants；仅调查记者含 fuzzy review |
| `laboratory-assistant` | 实验室助理 / Laboratory Assistant | 手册 82 | `academic` | all | 10-30 | EDU×4 | 6 | all-of: Chemistry + 另两项 Science；one-of | 核心规则书范例表无此项 | canonical；个人特长需 review |
| `police-detective` | 警探 / Police Detective | 核心 41；手册 87 | `investigation-security` | all | 20-50 | EDU×2 + best(DEX, STR)×2 | 8 | one-of, generic Firearms, any skill | 机械一致 | canonical；无模糊 requirement |
| `professor` | 教授（原作向） / Professor | 核心 41；手册 87 | `academic` | all | 20-70 | EDU×4 | 5 | open Language specializations, choose 4 any skill | 机械一致 | canonical；学术、时代或个人特长需 review |
| `soldier-marine` | 士兵、海军陆战队士兵 / Soldier / Marine | 核心 41；手册 89-90 | `military-government-law` | all | 9-30 | EDU×2 + best(DEX, STR)×2 | 7 | generic Fighting/Firearms, open Survival, one-of choose 2 | 机械一致 | canonical；无模糊 requirement |
| `student-intern` | 学生、实习生 / Student / Intern | 手册 90 | `academic` | all | 5-10 | EDU×4 | 5 | Language one-of, choose 3 + choose 2 any skill | 核心规则书范例表无此项 | canonical；两组模糊 requirement 均需 review |
| `missionary-*` | 传教士 / Missionary family | 核心 41；手册 83 | `religion-occult` | all | 0-30 | 核心 EDU×4；手册 EDU×2 + APP×2 | 7 / 7 | open Art/Craft, social one-of, choose 2 any skill | CR 一致；point formula 与自由技能措辞不同 | 2 source variants；仅手册个人或时代特长需 review |

Pilot 共 12 个 canonical family、15 个 production `OccupationDefinition`。`journalist` 与 `missionary` 仅作为 `variantOf` family identity，不在 Registry 中伪造空壳 occupation。

## Confirmed source mechanics variants

### Journalist

- 核心规则书印刷页 41 固定 `Art / Craft (Photography)`。
- 调查员手册印刷页 81 的调查记者允许 `Art / Craft (Fine Art or Photography)`。
- 调查员手册印刷页 81-82 的通讯记者使用 Acting、Listen、Stealth、Spot Hidden 等不同技能组。
- 三者 Credit Rating 与 point formula 相同，但确定性 requirements 不同，因此保留三个 `variantOf: "journalist"` definition。

### Missionary

- 核心规则书印刷页 41：EDU×4。
- 调查员手册印刷页 83：EDU×2 + APP×2。
- 两者 Credit Rating、确定性技能集合与选择数量一致，但 point formula 与自由技能措辞不同，因此保留两个 `variantOf: "missionary"` definition。

## Excel audit

Workbook 共 13 个 sheet：`人物卡`、`简化卡 骰娘导入`、`职业列表`、`成长表（测试）`、`本职技能`、`附表`、`技能注释`、`属性注释`、`资产及物价参考`、`武器列表 战斗`、`防具表 载具表`、`疯狂表`、`更新说明`。

`职业列表`使用范围为 232 行 × 17 列，包含 229 条编号职业和 1 条自定义职业。可识别字段包括序号、中文职业名、Credit Rating、职业属性公式、本职技能、推荐关系人与职业介绍；没有逐条结构化 source，也没有结构化 era/category。229 条编号职业均有 CR、公式、技能与介绍，但联系人只有 166 条。

发现 6 组完全同名重复项：艺术家、工匠、艺人、律师、私家侦探、科学家。这些重复项实际混有其他 Setting 或其他来源，不能按名称直接去重或导入 Standard。

Spot-check 结论：

- 完全一致：会计师的 CR、EDU×4 与技能结构和调查员手册印刷页 70 一致。
- 名称不同但机械一致：Excel 的“警方(原作向)-警探”与官方“警探”名称不同，CR、公式和技能结构与核心印刷页 41 / 手册印刷页 87 一致。
- 存在机械差异：Excel 的传教士只保存调查员手册 EDU×2 + APP×2 版本，未表达核心规则书 EDU×4 版本；若直接导入会丢失官方 source variant。
- 缺失来源或无法直接验证：所有职业行都没有结构化 source/page；部分介绍文字会注明其他 Setting 或日系资料，但这不能替代逐项来源核验。

结论：Excel 适合作为 Phase 5B-2 的录入底稿、名称索引与 coverage checklist，不适合作为直接批量导入源。全量导入仍需先分离 Setting、识别 canonical family / variant、逐条回查官方 PDF，并处理重复和疑似录入错误。

## Scope status

本文件只表示 Phase 5B-1 pilot 已核验并进入生产数据。尚未出现在 pilot 中的 Standard 职业不代表“不支持”；完整 verified Standard dataset 仍属于 Phase 5B-2。
