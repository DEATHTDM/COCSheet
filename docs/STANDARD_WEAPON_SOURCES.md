# Standard Weapon Sources

## Scope and closure

Phase 7C-2A 完整核验并注册 Standard COC7 核心武器表。Inventory 只包含正式武器表中具有独立 weapon stats 的行；普通商品、瞄具和纯弹药价格清单不进入武器目录。

- Primary：`coc7-keeper-rulebook-40th-zh`，`《克苏鲁的呼唤 40 周年纪念版》`，第十六章附录表 17，印刷页 401～405。
- Secondary：`coc7-investigator-handbook-zh-1-21`，`《克苏鲁的呼唤第七版调查员手册》`，第十章附录表 10-2～10-9，印刷页 250～254。
- Source precedence：Keeper 表 17 → Investigator 对应表 → 7C-1 pilot mapping。
- 官方 source rows：104。
- Production definitions：104。
- 共享同一 mechanics definition 的重复 source rows：0。
- `needs-review`：0。
- Phase 7C-1 的 8 个 pilot 全部包含在下表；没有建立第二份 definition。

Category closure：

| Category | Source rows | Production definitions |
| --- | ---: | ---: |
| `melee-other` | 28 | 28 |
| `handgun` | 16 | 16 |
| `rifle` | 12 | 12 |
| `shotgun` | 9 | 9 |
| `assault-rifle` | 9 | 9 |
| `submachine-gun` | 6 | 6 |
| `machine-gun` | 8 | 8 |
| `explosive-heavy-other` | 16 | 16 |
| **Total** | **104** | **104** |

Era shorthand：`A` = available，`R` = rare，`U` = unavailable；顺序始终是 `classic1920s/modern`。单独标为“稀有”的来源行映射为 `R/R`；“1920s，稀有”映射为 `A/R`；“1920s稀有”映射为 `R/U`。这里表达来源表的可获得性，不表达现实世界中是否仍然存在。

## Full source inventory

<!-- STANDARD_WEAPON_INVENTORY_START -->
| Source row | Canonical ID | 中文名称 | Primary | Secondary | Category | Skill mapping | Era | Status | Discrepancy / rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KR17-401-01 / IH10-2-250-01 | bow | 弓箭 | p401 常规 | p250 表10-2 | melee-other | predefined firearms/bow | A/A | production | Pilot；采用 Keeper 30m，Handbook 为 30yd |
| KR17-401-02 / IH10-2-250-02 | brass-knuckles | 黄铜指虎 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-03 / IH10-2-250-03 | bullwhip | 长鞭 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/whip | A/U | production | Keeper 3m；Handbook 10ft |
| KR17-401-04 / IH10-2-250-04 | burning-torch | 燃烧的火把 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-05 / IH10-2-250-05 | chainsaw | 链锯 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/chainsaw | U/A | production | Pilot |
| KR17-401-06 / IH10-2-250-06 | leather-sap | 包革金属棒（大头棍、护身棒） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-07 / IH10-2-250-07 | large-club | 大型棍棒（棒球棒、板球棒、拨火棍） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-08 / IH10-2-250-08 | small-club | 小型棍棒（警棍） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-09 / IH10-2-250-09 | crossbow | 弩 | p401 常规 | p250 表10-2 | melee-other | predefined firearms/bow | A/A | production | Keeper 50m；Handbook 50yd |
| KR17-401-10 / IH10-2-250-10 | garrote | 绞索 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/garrote | A/A | production | — |
| KR17-401-11 / IH10-2-250-11 | hand-axe-hatchet | 手斧／镰刀 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/axe | A/A | production | — |
| KR17-401-12 / IH10-2-250-12 | large-knife | 大型刀（甘蔗刀等） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | Pilot；Keeper 行名为大型刀具（骑兵军刀等），沿用 Handbook 中文名 |
| KR17-401-13 / IH10-2-250-13 | medium-knife | 中型刀具（切肉刀等） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-14 / IH10-2-250-14 | small-knife | 小型刀具（折叠刀等） | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | — |
| KR17-401-15 / IH10-2-250-15 | 220v-live-wire | 220V通电导线 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | U/A | production | 正式价格为空 |
| KR17-401-16 / IH10-2-250-16 | tear-gas-spray | 催泪喷雾 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | A/A | production | Keeper 2m、晕眩；Handbook 6ft、晕 |
| KR17-401-17 / IH10-2-250-17 | nunchaku | 双节棍 | p401 常规 | p250 表10-2 | melee-other | predefined fighting/flail | A/A | production | — |
| KR17-401-18 / IH10-2-250-18 | thrown-rock | 投石 | p401 常规 | p250 表10-2 | melee-other | standard throw | A/A | production | Pilot；沿用 Handbook STR ft，Keeper 为 STR/5m |
| KR17-401-19 / IH10-2-250-19 | shuriken | 手里剑 | p401 常规 | p250 表10-2 | melee-other | standard throw | A/A | production | Keeper STR/5m；Handbook 接触 |
| KR17-402-01 / IH10-2-250-20 | lance | 矛（骑枪） | p402 常规 | p250 表10-2 | melee-other | predefined fighting/spear | A/A | production | — |
| KR17-402-02 / IH10-2-250-21 | thrown-spear | 投矛 | p402 常规 | p250 表10-2 | melee-other | standard throw | R/R | production | 来源只标稀有；Keeper STR/5m，Handbook STRyd |
| KR17-402-03 / IH10-2-250-22 | large-sword | 大型刀剑（马刀） | p402 常规 | p250 表10-2 | melee-other | predefined fighting/sword | A/A | production | — |
| KR17-402-04 / IH10-2-250-23 | medium-sword | 中型刀剑（长剑、重剑） | p402 常规 | p250 表10-2 | melee-other | predefined fighting/sword | A/A | production | — |
| KR17-402-05 / IH10-2-250-24 | light-sword | 轻型刀剑（花剑、剑杖） | p402 常规 | p250 表10-2 | melee-other | predefined fighting/sword | A/A | production | — |
| KR17-402-06 / IH10-2-250-25 | stun-gun | 电击器 | p402 常规 | p250 表10-2 | melee-other | predefined fighting/brawl | U/A | production | 接触版本；与下一行射击版本 mechanics 不同 |
| KR17-402-07 / IH10-2-250-26 | taser | 泰瑟枪 | p402 常规 | p250 表10-2 | melee-other | predefined firearms/handgun | U/A | production | 射击版本；未与电击器合并 |
| KR17-402-08 / IH10-2-250-27 | combat-boomerang | 战斗回力镖 | p402 常规 | p250 表10-2 | melee-other | standard throw | R/R | production | 来源只标稀有；Keeper STR/5m，Handbook 20yd |
| KR17-402-09 / IH10-2-250-28 | wood-axe | 伐木斧 | p402 常规 | p250 表10-2 | melee-other | predefined fighting/axe | A/A | production | — |
| KR17-402-H01 / IH10-3-250-H01 | flintlock-pistol | 燧发手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | R/R | production | 来源只标稀有 |
| KR17-402-H02 / IH10-3-250-H02 | 22-automatic-pistol | .22自动手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H03 / IH10-3-250-H03 | 25-derringer-single-barrel | .25德林杰手枪（单管） | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/U | production | — |
| KR17-402-H04 / IH10-3-250-H04 | 32-revolver | .32／7.65mm左轮手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H05 / IH10-3-250-H05 | 32-automatic-pistol | .32／7.65mm自动手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H06 / IH10-3-250-H06 | 357-magnum-revolver | .357马格南左轮手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | U/A | production | — |
| KR17-402-H07 / IH10-3-250-H07 | 38-revolver | .38／9mm左轮手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H08 / IH10-3-250-H08 | 38-automatic-pistol | .38／9mm自动手枪 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H09 / IH10-3-250-H09 | beretta-m9 | 贝瑞塔M9 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | U/A | production | — |
| KR17-402-H10 / IH10-3-250-H10 | glock-17 | 9mm格洛克17 | p402 手枪 | p250 表10-3 | handgun | predefined firearms/handgun | U/A | production | — |
| KR17-402-H11 / IH10-3-251-H11 | luger-p08 | 9mm鲁格P08 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H12 / IH10-3-251-H12 | 41-revolver | .41左轮手枪 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | A/R | production | 来源为 1920s、稀有；Handbook 记 C稀 |
| KR17-402-H13 / IH10-3-251-H13 | 44-magnum-revolver | .44马格南左轮手枪 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | U/A | production | — |
| KR17-402-H14 / IH10-3-251-H14 | 45-revolver | .45左轮手枪 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H15 / IH10-3-251-H15 | 45-automatic-pistol | .45自动手枪 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | A/A | production | — |
| KR17-402-H16 / IH10-3-251-H16 | imi-desert-eagle | IMI沙漠之鹰 | p402 手枪 | p251 表10-3 | handgun | predefined firearms/handgun | U/A | production | — |
| KR17-403-R01 / IH10-4-252-R01 | 58-springfield-flintlock-rifle | .58春田燧发步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | R/R | production | 来源只标稀有 |
| KR17-403-R02 / IH10-4-252-R02 | 22-bolt-action-rifle | .22栓动步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/A | production | — |
| KR17-403-R03 / IH10-4-252-R03 | 30-lever-action-rifle | .30杠杆步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/A | production | — |
| KR17-403-R04 / IH10-4-252-R04 | 45-martini-henry-rifle | .45马蒂尼-亨利步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/U | production | — |
| KR17-403-R05 / IH10-4-252-R05 | colonel-morans-air-rifle | 莫兰上校的气动步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/U | production | — |
| KR17-403-R06 / IH10-4-252-R06 | m1-m2-garand-rifle | 加兰德M1、M2步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | U/A | production | 二战及以后映射为 U/A |
| KR17-403-R07 / IH10-4-252-R07 | sks-semi-automatic-rifle | SKS半自动步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-R08 / IH10-4-252-R08 | 303-lee-enfield-rifle | .303李-恩菲尔德步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/A | production | Keeper 弹容量 10；Handbook 为 5，采用 primary |
| KR17-403-R09 / IH10-4-252-R09 | 30-06-bolt-action-rifle | .30-06（7.62mm）栓动步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/A | production | — |
| KR17-403-R10 / IH10-4-252-R10 | 30-06-semi-automatic-rifle | .30-06（7.62mm）半自动步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-R11 / IH10-4-252-R11 | 444-marlin-lever-action-rifle | .444马林杠杆步枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-R12 / IH10-4-252-R12 | double-barrel-elephant-gun | 双管猎象枪 | p403 步枪 | p252 表10-4 | rifle | predefined firearms/rifle-shotgun | A/A | production | Keeper 现代价格 $1800；Handbook $1000，采用 primary |
| KR17-403-S01 / IH10-5-252-S01 | 20-gauge-double-barrel-shotgun | 20号双管霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | A/U | production | 现代价格显示为稀有 |
| KR17-403-S02 / IH10-5-252-S02 | 16-gauge-double-barrel-shotgun | 16号双管霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | A/U | production | 现代价格显示为稀有 |
| KR17-403-S03 / IH10-5-252-S03 | 12-gauge-double-barrel-shotgun | 12号双管霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | A/A | production | Pilot |
| KR17-403-S04 / IH10-5-252-S04 | 12-gauge-pump-action-shotgun | 12号泵动式霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-S05 / IH10-5-252-S05 | 12-gauge-semi-automatic-shotgun | 12号半自动霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-S06 / IH10-5-252-S06 | 12-gauge-sawed-off-double-barrel-shotgun | 12号双管霰弹枪（锯短枪管） | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | A/U | production | 价格正式显示 N/A |
| KR17-403-S07 / IH10-5-252-S07 | 10-gauge-double-barrel-shotgun | 10号双管霰弹枪 | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | R/U | production | 来源显示 1920s稀有／C稀 |
| KR17-403-S08 / IH10-5-252-S08 | 12-gauge-benelli-m3-folding-stock | 12号伯奈利M3霰弹枪（折叠枪托） | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-403-S09 / IH10-5-252-S09 | 12-gauge-spas-folding-stock | 12号SPAS霰弹枪（折叠枪托） | p403 霰弹枪 | p252 表10-5 | shotgun | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-AR01 / IH10-6-253-AR01 | ak-47-akm | AK-47或AKM | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-AR02 / IH10-6-253-AR02 | ak-74 | AK-74 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | Keeper 伤害 2D6+1；Handbook 2D6，采用 primary |
| KR17-404-AR03 / IH10-6-253-AR03 | barrett-m82-anti-materiel-rifle | 巴雷特M82反器材步枪 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-AR04 / IH10-6-253-AR04 | fn-fal | FN FAL突击步枪 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | Pilot |
| KR17-404-AR05 / IH10-6-253-AR05 | galil-assault-rifle | 加利尔突击步枪 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-AR06 / IH10-6-253-AR06 | m16a2 | M16A2 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | 价格正式显示 N/A |
| KR17-404-AR07 / IH10-6-253-AR07 | m4 | M4 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | 价格正式显示 N/A |
| KR17-404-AR08 / IH10-6-253-AR08 | steyr-aug | 斯太尔AUG | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-AR09 / IH10-6-253-AR09 | beretta-m70-90 | 贝雷塔M70/90 | p404 突击步枪 | p253 表10-6 | assault-rifle | predefined firearms/rifle-shotgun | U/A | production | — |
| KR17-404-SMG01 / IH10-7-253-SMG01 | bergmann-mp18-mp28 | 贝格曼MP18I／MP28II | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | A/U | production | 型号罗马数字规范显示 |
| KR17-404-SMG02 / IH10-7-253-SMG02 | hk-mp5 | H&K MP5 | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | U/A | production | 价格正式显示 N/A |
| KR17-404-SMG03 / IH10-7-253-SMG03 | mac-11 | MAC-11 | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | U/A | production | — |
| KR17-404-SMG04 / IH10-7-253-SMG04 | skorpion-submachine-gun | 蝎式冲锋枪 | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | U/A | production | 价格正式显示 N/A |
| KR17-404-SMG05 / IH10-7-253-SMG05 | thompson-submachine-gun | 汤普森冲锋枪 | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | A/U | production | Pilot |
| KR17-404-SMG06 / IH10-7-253-SMG06 | uzi-submachine-gun | 乌兹冲锋枪 | p404 冲锋枪 | p253 表10-7 | submachine-gun | predefined firearms/submachine-gun | U/A | production | — |
| KR17-404-MG01 / IH10-8-253-MG01 | 1882-hand-cranked-gatling-gun | 1882年式手摇加特林 | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/R | production | 来源为 1920s、稀有；Handbook 记 C稀 |
| KR17-404-MG02 / IH10-8-253-MG02 | m1918-browning-automatic-rifle | M1918勃朗宁自动步枪 | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/U | production | Pilot |
| KR17-404-MG03 / IH10-8-253-MG03 | browning-m1917a1-machine-gun | 勃朗宁M1917A1（.30-06／7.62mm） | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/U | production | — |
| KR17-404-MG04 / IH10-8-253-MG04 | bren-light-machine-gun | 布伦轻机枪 | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/U | production | — |
| KR17-404-MG05 / IH10-8-253-MG05 | lewis-mark-i-machine-gun | 刘易斯MK.I型机枪 | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/U | production | Keeper 弹容量 47/97；Handbook 27/97，采用 primary |
| KR17-404-MG06 / IH10-8-253-MG06 | rotary-machine-gun-7-62mm | 转管速射机枪（7.62mm） | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | U/A | production | 价格正式显示 N/A |
| KR17-404-MG07 / IH10-8-253-MG07 | fn-minimi-machine-gun | FN米尼米机枪（5.56mm） | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | U/A | production | 价格正式显示 N/A |
| KR17-404-MG08 / IH10-8-253-MG08 | vickers-303-machine-gun | 维克斯.303机枪 | p404 机枪 | p253 表10-8 | machine-gun | predefined firearms/machine-gun | A/U | production | 价格正式显示 N/A |
| KR17-405-E01 / IH10-9-254-E01 | molotov-cocktail | 莫洛托夫鸡尾酒 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard throw | A/A | production | Keeper 公制；Handbook STRft |
| KR17-405-E02 / IH10-9-254-E02 | flare-gun | 信号枪 | p405 其他 | p254 表10-9 | explosive-heavy-other | predefined firearms/handgun | A/A | production | — |
| KR17-405-E03 / IH10-9-254-E03 | m79-grenade-launcher | M79榴弹发射器 | p405 其他 | p254 表10-9 | explosive-heavy-other | predefined firearms/heavy-weapons | U/A | production | 两书价格单元格为空；Keeper 3D10/2m，Handbook 3D10/2码 |
| KR17-405-E04 / IH10-9-254-E04 | dynamite-stick | 炸药棒 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard throw | A/A | production | Keeper 公制；Handbook 3码／STRft |
| KR17-405-E05 / IH10-9-254-E05 | blasting-cap | 雷管 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard electrical-repair | A/A | production | Keeper 价格每盒 $1/$20；Handbook 显示 20/整盒 |
| KR17-405-E06 / IH10-9-254-E06 | pipe-bomb | 管状土制炸弹 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard demolitions | A/A | production | Keeper 每轮一次性；Handbook 破折号，采用 primary |
| KR17-405-E07 / IH10-9-254-E07 | c4-plastic-explosive-100g | 塑胶炸弹（C-4）100g／4盎司 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard demolitions | U/A | production | Keeper 每轮一次性；Handbook 破折号，采用 primary |
| KR17-405-E08 / IH10-9-254-E08 | hand-grenade | 手榴弹 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard throw | A/A | production | Keeper 公制；Handbook 3码／STRft |
| KR17-405-E09 / IH10-9-254-E09 | 81mm-mortar | 81mm迫击炮 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard artillery | U/A | production | Keeper 6m；Handbook 6码 |
| KR17-405-E10 / IH10-9-254-E10 | 75mm-field-gun | 75mm野战炮 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard artillery | A/A | production | Keeper 2m；Handbook 2码 |
| KR17-405-E11 / IH10-9-254-E11 | 120mm-tank-gun | 120mm坦克炮 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard artillery | U/A | production | Keeper 2m；Handbook 4码，采用 primary |
| KR17-405-E12 / IH10-9-254-E12 | 5-inch-127mm-naval-gun | 5英寸（127mm）舰载炮 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard artillery | U/A | production | Keeper 每轮 1；Handbook 2，采用 primary |
| KR17-405-E13 / IH10-9-254-E13 | anti-personnel-mine | 反步兵地雷 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard demolitions | U/A | production | Keeper 每轮布设；Handbook 破折号，采用 primary |
| KR17-405-E14 / IH10-9-254-E14 | claymore-mine | 阔剑地雷 | p405 其他 | p254 表10-9 | explosive-heavy-other | standard demolitions | U/A | production | Keeper 每轮布设与 20m；Handbook 破折号与 20码 |
| KR17-405-E15 / IH10-9-254-E15 | flamethrower | 火焰喷射器 | p405 其他 | p254 表10-9 | explosive-heavy-other | predefined firearms/flamethrower | A/A | production | — |
| KR17-405-E16 / IH10-9-254-E16 | m72-light-anti-tank-weapon | M72反坦克火箭筒 | p405 其他 | p254 表10-9 | explosive-heavy-other | predefined firearms/heavy-weapons | U/A | production | Keeper 1m；Handbook 1码 |
<!-- STANDARD_WEAPON_INVENTORY_END -->

## Discrepancy resolution

所有真正 mechanics 差异均重新核对原页面后按 canonical precedence 采用 Keeper 表 17，并在 inventory 与 definition `sourceRefs` 中逐项记录：

- `.303李-恩菲尔德步枪`：弹容量 `10`，Handbook 为 `5`。
- `双管猎象枪`：现代价格 `$1800`，Handbook 为 `$1000`。
- `AK-74`：伤害 `2D6+1`，Handbook 为 `2D6`。
- `刘易斯MK.I型机枪`：弹容量 `47/97`，Handbook 为 `27/97`。
- `5英寸（127mm）舰载炮`：每轮 `1`，Handbook 为 `2`。
- 爆炸／重武器的公制爆心半径与 Handbook 码制显示保持 primary 公制；没有把单位换算后写成第三种值。

名称、标点和单位等 mechanics 等价差异保留 source-faithful display。7C-1 pilot 中 `thrown-rock` 继续采用已记录的 Handbook `STR ft`，`large-knife` 继续采用 Handbook 中文名；其余 pilot 数值未因统一格式而改写。

## Audit contract

`src/content/standard/weapons.audit.test.ts` 解析上面的 inventory 并与 production catalog 做双向闭环检查；`node scripts/validate-standard-weapons.mjs` 可独立运行该 audit。检查范围包括 source row 映射、definition 反向来源、重复 ID、schema、WeaponRegistry、typed SkillRef、sourceRefs、category、完整时代映射以及 `needs-review = 0`。
