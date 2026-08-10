import type { SourceReference } from "../../coc7/types/source";
import type { SkillBaseValueRule, SkillDefinition } from "../../coc7/types/skill";

const keeperRulebook: SourceReference = {
  sourceId: "coc7-keeper-rulebook",
  title: "Call of Cthulhu Keeper Rulebook, 7th Edition",
  note: "技能基础值、专业化与成长资格",
};

const fixed = (value: number): SkillBaseValueRule => ({ type: "fixed", value });
const characteristic = (
  characteristicId: "DEX" | "EDU",
  fraction: "full" | "half" | "fifth",
): SkillBaseValueRule => ({ type: "characteristic", characteristic: characteristicId, fraction });

const common = {
  version: 1 as const,
  specialization: { type: "none" as const },
  predefinedSpecializations: [],
  creationPointPolicy: "allowed" as const,
  improvementPolicy: "standard" as const,
  sourceRefs: [keeperRulebook],
};

export const standardSkillDefinitions: readonly SkillDefinition[] = [
  {
    ...common,
    id: "accounting",
    name: { zh: "会计", en: "Accounting" },
    baseValueRule: fixed(5),
    tags: ["knowledge"],
  },
  {
    ...common,
    id: "credit-rating",
    name: { zh: "信用评级", en: "Credit Rating" },
    baseValueRule: fixed(0),
    tags: ["social"],
    improvementPolicy: "not-eligible",
  },
  {
    ...common,
    id: "cthulhu-mythos",
    name: { zh: "克苏鲁神话", en: "Cthulhu Mythos" },
    baseValueRule: fixed(0),
    tags: ["mythos"],
    creationPointPolicy: "keeper-approval",
    improvementPolicy: "not-eligible",
  },
  {
    ...common,
    id: "dodge",
    name: { zh: "闪避", en: "Dodge" },
    baseValueRule: characteristic("DEX", "half"),
    tags: ["physical", "combat"],
  },
  {
    ...common,
    id: "library-use",
    name: { zh: "图书馆使用", en: "Library Use" },
    baseValueRule: fixed(20),
    tags: ["investigation"],
  },
  {
    ...common,
    id: "spot-hidden",
    name: { zh: "侦查", en: "Spot Hidden" },
    baseValueRule: fixed(25),
    tags: ["investigation"],
  },
  {
    ...common,
    id: "fighting",
    name: { zh: "格斗", en: "Fighting" },
    baseValueRule: fixed(0),
    specialization: { type: "required", allowMultiple: true, allowCustom: false },
    predefinedSpecializations: [
      { id: "brawl", name: { zh: "斗殴", en: "Brawl" }, baseValueRule: fixed(25) },
      { id: "sword", name: { zh: "剑", en: "Sword" }, baseValueRule: fixed(20) },
    ],
    tags: ["combat"],
  },
  {
    ...common,
    id: "firearms",
    name: { zh: "射击", en: "Firearms" },
    baseValueRule: fixed(0),
    specialization: { type: "required", allowMultiple: true, allowCustom: false },
    predefinedSpecializations: [
      { id: "handgun", name: { zh: "手枪", en: "Handgun" }, baseValueRule: fixed(20) },
      {
        id: "rifle-shotgun",
        name: { zh: "步枪／霰弹枪", en: "Rifle / Shotgun" },
        baseValueRule: fixed(25),
      },
    ],
    tags: ["combat"],
  },
  {
    ...common,
    id: "language-own",
    name: { zh: "母语", en: "Language (Own)" },
    baseValueRule: characteristic("EDU", "full"),
    tags: ["language"],
  },
  {
    ...common,
    id: "language-other",
    name: { zh: "外语", en: "Language (Other)" },
    baseValueRule: fixed(1),
    specialization: { type: "required", allowMultiple: true, allowCustom: true },
    tags: ["language"],
  },
  {
    ...common,
    id: "science",
    name: { zh: "科学", en: "Science" },
    baseValueRule: fixed(1),
    specialization: { type: "required", allowMultiple: true, allowCustom: true },
    predefinedSpecializations: [
      { id: "chemistry", name: { zh: "化学", en: "Chemistry" } },
    ],
    tags: ["knowledge"],
  },
  {
    ...common,
    id: "art-craft",
    name: { zh: "艺术／手艺", en: "Art / Craft" },
    baseValueRule: fixed(5),
    specialization: { type: "required", allowMultiple: true, allowCustom: true },
    tags: ["creative"],
  },
  {
    ...common,
    id: "survival",
    name: { zh: "生存", en: "Survival" },
    baseValueRule: fixed(10),
    specialization: { type: "required", allowMultiple: true, allowCustom: true },
    tags: ["outdoors"],
  },
];
