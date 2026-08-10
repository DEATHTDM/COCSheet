import type { SourceReference } from "../../coc7/types/source";
import type {
  LocalizedSkillAliases,
  PredefinedSkillSpecialization,
  SkillAvailability,
  SkillBaseValueRule,
  SkillCreationPointPolicy,
  SkillDefinition,
  SkillImprovementPolicy,
  SkillSpecializationPolicy,
} from "../../coc7/types/skill";

const keeperRulebookTitle = "Call of Cthulhu Keeper Rulebook, 7th Edition";

function keeperRulebookSource(page: number, note: string): SourceReference {
  return {
    sourceId: "coc7-keeper-rulebook",
    title: keeperRulebookTitle,
    page,
    note,
  };
}

const skillListSource = keeperRulebookSource(56, "第四章技能列表：基础值、专业化、非常规与现代限定标记");
const fightingSource = keeperRulebookSource(60, "格斗技能专攻");
const firearmsSource = keeperRulebookSource(69, "射击技能专攻");
const scienceSource = keeperRulebookSource(64, "科学技能专攻");
const artCraftSource = keeperRulebookSource(75, "艺术和手艺技能专攻示例");
const pilotSource = keeperRulebookSource(57, "操纵飞行器与船舶的专业化说明");
const survivalSource = keeperRulebookSource(70, "生存技能专业化示例");

const fixed = (value: number): SkillBaseValueRule => ({ type: "fixed", value });
const characteristic = (
  characteristicId: "DEX" | "EDU",
  fraction: "full" | "half" | "fifth",
): SkillBaseValueRule => ({ type: "characteristic", characteristic: characteristicId, fraction });

const standardAvailability: SkillAvailability = { sheet: "standard", era: "all" };
const uncommonAvailability: SkillAvailability = { sheet: "uncommon", era: "all" };
const modernAvailability: SkillAvailability = { sheet: "standard", era: "modern-only" };
const noSpecialization: SkillSpecializationPolicy = { type: "none" };

type SkillOverrides = Partial<Pick<
  SkillDefinition,
  | "aliases"
  | "availability"
  | "specialization"
  | "predefinedSpecializations"
  | "creationPointPolicy"
  | "improvementPolicy"
  | "sourceRefs"
>>;

function defineSkill(
  id: string,
  zh: string,
  en: string,
  baseValueRule: SkillBaseValueRule,
  tags: readonly string[],
  overrides: SkillOverrides = {},
): SkillDefinition {
  return {
    version: 1,
    id,
    name: { zh, en },
    availability: standardAvailability,
    baseValueRule,
    specialization: noSpecialization,
    predefinedSpecializations: [],
    tags: [...tags],
    creationPointPolicy: "allowed",
    improvementPolicy: "standard",
    sourceRefs: [skillListSource],
    ...overrides,
  };
}

function predefined(
  id: string,
  zh: string,
  en: string,
  baseValue: number,
  source: SourceReference,
  aliases?: LocalizedSkillAliases,
): PredefinedSkillSpecialization {
  return {
    id,
    name: { zh, en },
    aliases,
    baseValueRule: fixed(baseValue),
    sourceRefs: [source],
  };
}

const requiredSpecialization = (
  allowCustom: boolean,
  allowMultiple = true,
): SkillSpecializationPolicy => ({ type: "required", allowMultiple, allowCustom });

const restrictedPolicies: Pick<
  SkillOverrides,
  "creationPointPolicy" | "improvementPolicy"
> = {
  creationPointPolicy: "keeper-approval" satisfies SkillCreationPointPolicy,
  improvementPolicy: "not-eligible" satisfies SkillImprovementPolicy,
};

export const standardSkillDefinitions: readonly SkillDefinition[] = [
  defineSkill("accounting", "会计", "Accounting", fixed(5), ["knowledge"]),
  defineSkill("animal-handling", "动物驯养", "Animal Handling", fixed(5), ["animal"], {
    availability: uncommonAvailability,
  }),
  defineSkill("anthropology", "人类学", "Anthropology", fixed(1), ["knowledge"]),
  defineSkill("appraise", "估价", "Appraise", fixed(5), ["investigation"]),
  defineSkill("archaeology", "考古学", "Archaeology", fixed(1), ["knowledge"]),
  defineSkill("art-craft", "艺术／手艺", "Art / Craft", fixed(5), ["creative"], {
    aliases: { zh: ["艺术和手艺", "艺术／工艺"] },
    specialization: requiredSpecialization(true),
    predefinedSpecializations: [
      predefined("acting", "表演", "Acting", 5, artCraftSource),
      predefined("fine-art", "美术", "Fine Art", 5, artCraftSource),
      predefined("photography", "摄影", "Photography", 5, artCraftSource),
      predefined("forgery", "伪造文书", "Forgery", 5, artCraftSource),
    ],
  }),
  defineSkill("artillery", "炮术", "Artillery", fixed(1), ["combat"], {
    availability: uncommonAvailability,
  }),
  defineSkill("charm", "取悦", "Charm", fixed(15), ["social"], {
    aliases: { zh: ["魅惑"] },
  }),
  defineSkill("climb", "攀爬", "Climb", fixed(20), ["physical"]),
  defineSkill("computer-use", "计算机使用", "Computer Use", fixed(5), ["knowledge", "technology"], {
    availability: modernAvailability,
  }),
  defineSkill("credit-rating", "信用评级", "Credit Rating", fixed(0), ["social"], {
    aliases: { zh: ["信用"] },
    improvementPolicy: "not-eligible",
  }),
  defineSkill("cthulhu-mythos", "克苏鲁神话", "Cthulhu Mythos", fixed(0), ["mythos"], restrictedPolicies),
  defineSkill("demolitions", "爆破", "Demolitions", fixed(1), ["technology"], {
    availability: uncommonAvailability,
  }),
  defineSkill("disguise", "乔装", "Disguise", fixed(5), ["social"]),
  defineSkill("diving", "潜水", "Diving", fixed(1), ["physical"], {
    availability: uncommonAvailability,
  }),
  defineSkill("dodge", "闪避", "Dodge", characteristic("DEX", "half"), ["physical", "combat"]),
  defineSkill("drive-auto", "汽车驾驶", "Drive Auto", fixed(20), ["vehicle"]),
  defineSkill("electrical-repair", "电气维修", "Electrical Repair", fixed(10), ["technology"]),
  defineSkill("electronics", "电子学", "Electronics", fixed(1), ["knowledge", "technology"], {
    availability: modernAvailability,
  }),
  defineSkill("fast-talk", "话术", "Fast Talk", fixed(5), ["social"]),
  defineSkill("fighting", "格斗", "Fighting", fixed(0), ["combat"], {
    specialization: requiredSpecialization(false),
    predefinedSpecializations: [
      predefined("brawl", "斗殴", "Brawl", 25, fightingSource),
      predefined("axe", "斧", "Axe", 15, fightingSource),
      predefined("chainsaw", "链锯", "Chainsaw", 10, fightingSource),
      predefined("flail", "连枷", "Flail", 10, fightingSource),
      predefined("garrote", "绞索", "Garrote", 15, fightingSource),
      predefined("spear", "矛", "Spear", 20, fightingSource),
      predefined("sword", "刀剑", "Sword", 20, fightingSource),
      predefined("whip", "鞭", "Whip", 5, fightingSource),
    ],
  }),
  defineSkill("firearms", "射击", "Firearms", fixed(0), ["combat"], {
    specialization: requiredSpecialization(false),
    predefinedSpecializations: [
      predefined("handgun", "手枪", "Handgun", 20, firearmsSource),
      predefined("rifle-shotgun", "步枪／霰弹枪", "Rifle / Shotgun", 25, firearmsSource),
      predefined("bow", "弓", "Bow", 15, firearmsSource),
      predefined("submachine-gun", "冲锋枪", "Submachine Gun", 15, firearmsSource),
      predefined("machine-gun", "机枪", "Machine Gun", 10, firearmsSource),
      predefined("heavy-weapons", "重武器", "Heavy Weapons", 10, firearmsSource),
      predefined("flamethrower", "火焰喷射器", "Flamethrower", 10, firearmsSource),
    ],
  }),
  defineSkill("first-aid", "急救", "First Aid", fixed(30), ["medical"]),
  defineSkill("history", "历史", "History", fixed(5), ["knowledge"]),
  defineSkill("hypnosis", "催眠", "Hypnosis", fixed(1), ["social"], {
    availability: uncommonAvailability,
  }),
  defineSkill("intimidate", "恐吓", "Intimidate", fixed(15), ["social"]),
  defineSkill("jump", "跳跃", "Jump", fixed(20), ["physical"]),
  defineSkill("language-own", "母语", "Language (Own)", characteristic("EDU", "full"), ["language"], {
    specialization: requiredSpecialization(true, false),
  }),
  defineSkill("language-other", "其他语言", "Language (Other)", fixed(1), ["language"], {
    aliases: { zh: ["外语"] },
    specialization: requiredSpecialization(true),
  }),
  defineSkill("law", "法律", "Law", fixed(5), ["knowledge"]),
  defineSkill("library-use", "图书馆使用", "Library Use", fixed(20), ["investigation"]),
  defineSkill("listen", "聆听", "Listen", fixed(20), ["investigation"]),
  defineSkill("locksmith", "锁匠", "Locksmith", fixed(1), ["technology"]),
  defineSkill("lore", "学识", "Lore", fixed(1), ["knowledge"], {
    availability: uncommonAvailability,
    specialization: requiredSpecialization(true),
    creationPointPolicy: "keeper-approval",
  }),
  defineSkill("mechanical-repair", "机械维修", "Mechanical Repair", fixed(10), ["technology"]),
  defineSkill("medicine", "医学", "Medicine", fixed(1), ["medical"]),
  defineSkill("natural-world", "博物学", "Natural World", fixed(10), ["knowledge", "outdoors"], {
    aliases: { zh: ["自然学"] },
  }),
  defineSkill("navigate", "导航", "Navigate", fixed(10), ["outdoors"]),
  defineSkill("occult", "神秘学", "Occult", fixed(5), ["knowledge"]),
  defineSkill("operate-heavy-machinery", "操作重型机械", "Operate Heavy Machinery", fixed(1), ["vehicle", "technology"]),
  defineSkill("persuade", "说服", "Persuade", fixed(10), ["social"]),
  defineSkill("pilot", "操纵", "Pilot", fixed(1), ["vehicle"], {
    specialization: requiredSpecialization(true),
    predefinedSpecializations: [
      predefined("aircraft", "飞行器", "Aircraft", 1, pilotSource),
      predefined("boat", "船舶", "Boat", 1, pilotSource),
      predefined("dirigible", "飞艇", "Dirigible", 1, pilotSource),
    ],
  }),
  defineSkill("psychoanalysis", "精神分析", "Psychoanalysis", fixed(1), ["medical"]),
  defineSkill("psychology", "心理学", "Psychology", fixed(10), ["social", "investigation"]),
  defineSkill("read-lips", "读唇", "Read Lips", fixed(1), ["investigation"], {
    availability: uncommonAvailability,
  }),
  defineSkill("ride", "骑术", "Ride", fixed(5), ["animal", "physical"]),
  defineSkill("science", "科学", "Science", fixed(1), ["knowledge"], {
    specialization: requiredSpecialization(true),
    predefinedSpecializations: [
      predefined("astronomy", "天文学", "Astronomy", 1, scienceSource),
      predefined("biology", "生物学", "Biology", 1, scienceSource),
      predefined("botany", "植物学", "Botany", 1, scienceSource),
      predefined("chemistry", "化学", "Chemistry", 1, scienceSource),
      predefined("cryptography", "密码学", "Cryptography", 1, scienceSource),
      predefined("engineering", "工程学", "Engineering", 1, scienceSource),
      predefined("forensics", "司法科学", "Forensics", 1, scienceSource),
      predefined("geology", "地质学", "Geology", 1, scienceSource),
      predefined("mathematics", "数学", "Mathematics", 10, scienceSource),
      predefined("meteorology", "气象学", "Meteorology", 1, scienceSource),
      predefined("pharmacy", "药学", "Pharmacy", 1, scienceSource),
      predefined("physics", "物理学", "Physics", 1, scienceSource),
      predefined("zoology", "动物学", "Zoology", 1, scienceSource),
    ],
  }),
  defineSkill("sleight-of-hand", "妙手", "Sleight of Hand", fixed(10), ["physical"]),
  defineSkill("spot-hidden", "侦查", "Spot Hidden", fixed(25), ["investigation"], {
    aliases: { zh: ["侦察"] },
  }),
  defineSkill("stealth", "潜行", "Stealth", fixed(20), ["physical"]),
  defineSkill("survival", "生存", "Survival", fixed(10), ["outdoors"], {
    specialization: requiredSpecialization(true),
    predefinedSpecializations: [
      predefined("wilderness", "荒野", "Wilderness", 10, survivalSource),
      predefined("arctic", "极地", "Arctic", 10, survivalSource),
      predefined("desert", "沙漠", "Desert", 10, survivalSource),
      predefined("sea", "海洋", "Sea", 10, survivalSource),
    ],
  }),
  defineSkill("swim", "游泳", "Swim", fixed(20), ["physical"]),
  defineSkill("throw", "投掷", "Throw", fixed(20), ["physical", "combat"]),
  defineSkill("track", "追踪", "Track", fixed(10), ["outdoors", "investigation"]),
];
