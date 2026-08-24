# 玩家界面术语

本文件只约束 COCSheet 玩家可见界面中已经确认、且容易误写的核心用词。它不是完整的 CoC 规则词典，也不要求修改代码内部的 domain、rules 或 persistence 标识。

## 基本原则

- 玩家界面默认使用自然、简洁的中文，不直接显示开发者内部状态名或英文实现标识。
- 错误与兼容提示应说明发生了什么，以及玩家仍可进行哪些操作。
- CoC、HP、MP、SAN 等通行游戏记号可以在合适场景保留；面向新玩家时优先写“守秘人”，必要时写“守秘人（KP）”。
- 不确定的规则术语不得自行创造译名；先核对既有项目规则语义与权威资料。

## 核心术语

| 英文语义 | 玩家界面用词 |
| --- | --- |
| investigator | 调查员 |
| occupation | 职业 |
| custom occupation | 自定义职业 |
| occupation skill | 本职技能 |
| personal interest skill | 兴趣技能 |
| occupation skill points | 本职技能点 |
| personal interest skill points | 兴趣技能点 |
| skill specialization | 技能专攻 |
| skill base value | 技能初始值 |
| Credit Rating | 信用评级 |
| Luck | 幸运 |
| Sanity | 理智 |
| Hit Points | 生命值 |
| Magic Points | 魔法值 |
| Movement Rate | 移动力 |
| Damage Bonus | 伤害加值 |
| Build | 体格 |
| backstory | 背景故事 |
| Key Connection | 关键连接 |
| possessions | 随身物品 |
| assets | 资产 |
| spending level | 消费水平 |
| Keeper approval | 守秘人确认 |
| creation preset | 建卡预设 |
| Setting | 建卡环境／规则环境（按语境） |
| character sheet | 人物卡 |
| printable character sheet | 打印版人物卡 |

## 必须区分

“本职技能”表示调查员职业包含的技能；“技能专攻”表示格斗、射击、科学等技能下的具体专攻。两者语义完全不同。

occupation skill 必须译为“本职技能”，不得写成“专业化技能”“专攻技能”或“专业技能”。只有页面实际讨论 skill specialization 时才使用“技能专攻”。

## 常见界面表达

- Guided：新手引导／引导模式
- Quick：快速建卡／快速模式
- Standard CoC 7E：CoC 7版标准规则
- Preset：建卡预设
- Final Sheet：人物卡
- Printable Character Sheet：打印版人物卡
- approval：守秘人确认
- warning：提醒
- validation：检查／尚需完成

snapshot、orphan、provenance、stale、finalize、validator、repository、record、definition 等实现词不应直接显示给普通玩家。兼容数据缺失时，应具体说明哪类资料无法找到，并说明仍可查看、编辑或删除的操作。
