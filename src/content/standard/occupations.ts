import type {
  OccupationDefinition,
  OccupationPointFormula,
  OccupationRequirement,
  SkillSelector,
} from "../../coc7/types/occupation";
import type { SourceReference } from "../../coc7/types/source";
import type { SkillRef } from "../../coc7/types/skill";

const keeperRulebookTitle = "《克苏鲁的呼唤 40 周年纪念版》";
const investigatorHandbookTitle = "《克苏鲁的呼唤第七版调查员手册》";

const keeperRulebook = (page: number, note?: string): SourceReference => ({
  sourceId: "coc7-keeper-rulebook-40th-zh",
  title: keeperRulebookTitle,
  page,
  ...(note ? { note } : {}),
});

const investigatorHandbook = (page: number, note?: string): SourceReference => ({
  sourceId: "coc7-investigator-handbook-zh-1-21",
  title: investigatorHandbookTitle,
  page,
  ...(note ? { note } : {}),
});

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Plus = (...attributes: ("STR" | "DEX" | "APP" | "POW")[]): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    attributes.length === 1
      ? { type: "attribute", attribute: attributes[0] ?? "STR", multiplier: 2 }
      : { type: "best-of", attributes, multiplier: 2 },
  ],
});

const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

const exact = (ref: SkillRef): SkillSelector => {
  if (ref.type === "custom") throw new Error("静态职业 selector 不接受 custom UUID");
  return { type: "exact", ref };
};

const specializationOf = (
  definitionId: string,
  exclude?: readonly SkillRef[],
): SkillSelector => ({
  type: "specialization-of",
  definitionId,
  ...(exclude ? {
    exclude: exclude.map((ref) => {
      if (ref.type === "custom") throw new Error("静态职业 exclude 不接受 custom UUID");
      return ref;
    }),
  } : {}),
});

const namedCustomSpecialization = (
  definitionId: string,
  zh: string,
  en: string,
): SkillSelector => ({
  type: "named-custom-specialization",
  definitionId,
  name: { zh, en },
});

const oneOf = (...selectors: SkillSelector[]): SkillSelector => ({ type: "one-of", selectors });
const anySkill = (...exclude: SkillSelector[]): SkillSelector => ({
  type: "any-skill",
  ...(exclude.length > 0 ? { exclude } : {}),
});

const requirement = (
  id: string,
  selector: SkillSelector,
  min = 1,
  max: number | null = 1,
  keeperReview = false,
  guidance?: { readonly zh: string; readonly en: string },
): OccupationRequirement => ({
  id,
  selector,
  cardinality: { min, ...(max === null ? {} : { max }) },
  ...(keeperReview ? { keeperReview: true } : {}),
  ...(guidance ? { guidance } : {}),
});

const socialSelector = oneOf(
  exact(standard("charm")),
  exact(standard("fast-talk")),
  exact(standard("intimidate")),
  exact(standard("persuade")),
);

interface OccupationOptions {
  readonly aliases?: OccupationDefinition["aliases"];
  readonly variantOf?: string;
}

function defineOccupation(
  id: string,
  zh: string,
  en: string,
  sourceRefs: readonly SourceReference[],
  creditRating: { readonly min: number; readonly max: number },
  pointFormula: OccupationPointFormula,
  skillRequirements: readonly OccupationRequirement[],
  category: OccupationDefinition["category"],
  options: OccupationOptions = {},
): OccupationDefinition {
  return {
    version: 1,
    id,
    ...(options.variantOf ? { variantOf: options.variantOf } : {}),
    name: { zh, en },
    ...(options.aliases ? { aliases: options.aliases } : {}),
    category,
    sourceRefs: [...sourceRefs],
    era: { type: "all" },
    creditRating,
    pointFormula,
    skillRequirements: [...skillRequirements],
  };
}

const personalOrEraGuidance = {
  zh: "个人或时代特长",
  en: "personal or era specialty",
};

export const standardOccupationDefinitions: readonly OccupationDefinition[] = [
  defineOccupation(
    "accountant",
    "会计师",
    "Accountant",
    [investigatorHandbook(70)],
    { min: 30, max: 70 },
    edu4,
    [
      requirement("accounting", exact(standard("accounting"))),
      requirement("law", exact(standard("law"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("listen", exact(standard("listen"))),
      requirement("persuade", exact(standard("persuade"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("personal-or-era-specialties", anySkill(), 2, 2, true, personalOrEraGuidance),
    ],
    "business-professional",
  ),
  defineOccupation(
    "antiquarian",
    "文物学家（原作向）",
    "Antiquarian",
    [
      keeperRulebook(40, "自由技能措辞"),
      investigatorHandbook(71, "个人或时代特长措辞；规范化为 broad selector 与 Keeper review"),
    ],
    { min: 30, max: 70 },
    edu4,
    [
      requirement("appraise", exact(standard("appraise"))),
      requirement("art-craft", specializationOf("art-craft")),
      requirement("history", exact(standard("history"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("other-language", specializationOf("language-other")),
      requirement("social", socialSelector),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("personal-or-era-specialty", anySkill(), 1, 1, true, personalOrEraGuidance),
    ],
    "academic",
    { aliases: { zh: ["文物学家"] } },
  ),
  defineOccupation(
    "artist",
    "艺术家",
    "Artist",
    [keeperRulebook(40), investigatorHandbook(71)],
    { min: 9, max: 50 },
    edu2Plus("DEX", "POW"),
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("history-or-natural-world", oneOf(
        exact(standard("history")),
        exact(standard("natural-world")),
      )),
      requirement("social", socialSelector),
      requirement("other-language", specializationOf("language-other")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("personal-or-era-specialties", anySkill(), 2, 2, true, personalOrEraGuidance),
    ],
    "media-art",
  ),
  defineOccupation(
    "author",
    "作家（原作向）",
    "Author",
    [keeperRulebook(40), investigatorHandbook(72, "职业技能列表续至印刷页 73")],
    { min: 9, max: 30 },
    edu4,
    [
      requirement("literature", namedCustomSpecialization("art-craft", "文学", "Literature")),
      requirement("history", exact(standard("history"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("natural-world-or-occult", oneOf(
        exact(standard("natural-world")),
        exact(standard("occult")),
      )),
      requirement("other-language", specializationOf("language-other")),
      requirement("own-language", specializationOf("language-own")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("personal-or-era-specialty", anySkill(), 1, 1, true, personalOrEraGuidance),
    ],
    "media-art",
    { aliases: { zh: ["作家"] } },
  ),
  defineOccupation(
    "doctor-of-medicine",
    "医生（原作向）",
    "Doctor of Medicine",
    [
      keeperRulebook(40),
      investigatorHandbook(78, "职业标题始于印刷页 77；机械字段见印刷页 78"),
    ],
    { min: 30, max: 80 },
    edu4,
    [
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("latin", namedCustomSpecialization("language-other", "拉丁文", "Latin")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("biology", exact(predefined("science", "biology"))),
      requirement("pharmacy", exact(predefined("science", "pharmacy"))),
      requirement(
        "academic-or-personal-specialties",
        anySkill(),
        2,
        2,
        true,
        { zh: "其他学术或个人特长", en: "other academic or personal specialties" },
      ),
    ],
    "medical",
    { aliases: { zh: ["医生", "医师"], en: ["Physician"] } },
  ),
  defineOccupation(
    "journalist-keeper-rulebook",
    "记者（核心规则书）",
    "Journalist (Keeper Rulebook)",
    [keeperRulebook(41, "核心规则书记者机械版本")],
    { min: 9, max: 30 },
    edu4,
    [
      requirement("photography", exact(predefined("art-craft", "photography"))),
      requirement("social", socialSelector),
      requirement("history", exact(standard("history"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("own-language", specializationOf("language-own")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("other-skills", anySkill(), 2, 2),
    ],
    "media-art",
    {
      variantOf: "journalist",
      aliases: { zh: ["记者", "记者（原作向）"], en: ["Journalist"] },
    },
  ),
  defineOccupation(
    "journalist-investigative-handbook",
    "调查记者（调查员手册）",
    "Investigative Journalist (Investigator Handbook)",
    [investigatorHandbook(81, "调查员手册调查记者机械版本")],
    { min: 9, max: 30 },
    edu4,
    [
      requirement("art-or-photography", oneOf(
        exact(predefined("art-craft", "fine-art")),
        exact(predefined("art-craft", "photography")),
      )),
      requirement("social", socialSelector),
      requirement("history", exact(standard("history"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("own-language", specializationOf("language-own")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("personal-or-era-specialties", anySkill(), 2, 2, true, personalOrEraGuidance),
    ],
    "media-art",
    {
      variantOf: "journalist",
      aliases: { zh: ["记者", "调查记者"], en: ["Investigative Journalist"] },
    },
  ),
  defineOccupation(
    "journalist-reporter-handbook",
    "通讯记者（调查员手册）",
    "Reporter (Investigator Handbook)",
    [investigatorHandbook(81, "技能列表续至印刷页 82；调查员手册通讯记者机械版本")],
    { min: 9, max: 30 },
    edu4,
    [
      requirement("acting", exact(predefined("art-craft", "acting"))),
      requirement("history", exact(standard("history"))),
      requirement("listen", exact(standard("listen"))),
      requirement("own-language", specializationOf("language-own")),
      requirement("social", socialSelector),
      requirement("psychology", exact(standard("psychology"))),
      requirement("stealth", exact(standard("stealth"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
    ],
    "media-art",
    {
      variantOf: "journalist",
      aliases: { zh: ["记者", "通讯记者"], en: ["Reporter"] },
    },
  ),
  defineOccupation(
    "laboratory-assistant",
    "实验室助理",
    "Laboratory Assistant",
    [investigatorHandbook(82)],
    { min: 10, max: 30 },
    edu4,
    [
      requirement("computer-or-library", oneOf(
        exact(standard("computer-use")),
        exact(standard("library-use")),
      )),
      requirement("electrical-repair", exact(standard("electrical-repair"))),
      requirement("other-language", specializationOf("language-other")),
      requirement("science-set", {
        type: "all-of",
        groups: [
          {
            selector: exact(predefined("science", "chemistry")),
            cardinality: { min: 1, max: 1 },
          },
          {
            selector: specializationOf("science", [predefined("science", "chemistry")]),
            cardinality: { min: 2, max: 2 },
          },
        ],
      }, 3, 3),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement(
        "personal-specialty",
        anySkill(),
        1,
        1,
        true,
        { zh: "其他个人特长", en: "other personal specialty" },
      ),
    ],
    "academic",
  ),
  defineOccupation(
    "police-detective",
    "警探",
    "Police Detective",
    [keeperRulebook(41), investigatorHandbook(87)],
    { min: 20, max: 50 },
    edu2Plus("DEX", "STR"),
    [
      requirement("acting-or-disguise", oneOf(
        exact(predefined("art-craft", "acting")),
        exact(standard("disguise")),
      )),
      requirement("firearms", specializationOf("firearms"), 1, null),
      requirement("law", exact(standard("law"))),
      requirement("listen", exact(standard("listen"))),
      requirement("social", socialSelector),
      requirement("psychology", exact(standard("psychology"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("other-skill", anySkill()),
    ],
    "investigation-security",
    { aliases: { zh: ["警探（原作向）"] } },
  ),
  defineOccupation(
    "professor",
    "教授（原作向）",
    "Professor",
    [keeperRulebook(41), investigatorHandbook(87)],
    { min: 20, max: 70 },
    edu4,
    [
      requirement("library-use", exact(standard("library-use"))),
      requirement("other-language", specializationOf("language-other")),
      requirement("own-language", specializationOf("language-own")),
      requirement("psychology", exact(standard("psychology"))),
      requirement(
        "academic-era-personal-specialties",
        anySkill(),
        4,
        4,
        true,
        { zh: "其他学术、时代或个人特长", en: "other academic, era, or personal specialties" },
      ),
    ],
    "academic",
    { aliases: { zh: ["教授"] } },
  ),
  defineOccupation(
    "soldier-marine",
    "士兵、海军陆战队士兵",
    "Soldier / Marine",
    [keeperRulebook(41), investigatorHandbook(89, "技能列表续至印刷页 90")],
    { min: 9, max: 30 },
    edu2Plus("DEX", "STR"),
    [
      requirement("climb-or-swim", oneOf(
        exact(standard("climb")),
        exact(standard("swim")),
      )),
      requirement("dodge", exact(standard("dodge"))),
      requirement("fighting", specializationOf("fighting"), 1, null),
      requirement("firearms", specializationOf("firearms"), 1, null),
      requirement("stealth", exact(standard("stealth"))),
      requirement("survival", specializationOf("survival")),
      requirement("support-skills", oneOf(
        exact(standard("first-aid")),
        exact(standard("mechanical-repair")),
        specializationOf("language-other"),
      ), 2, 2),
    ],
    "military-government-law",
    { aliases: { zh: ["士兵", "海军陆战队士兵"], en: ["Soldier", "Marine"] } },
  ),
  defineOccupation(
    "student-intern",
    "学生、实习生",
    "Student / Intern",
    [investigatorHandbook(90)],
    { min: 5, max: 10 },
    edu4,
    [
      requirement("language", oneOf(
        specializationOf("language-own"),
        specializationOf("language-other"),
      )),
      requirement("library-use", exact(standard("library-use"))),
      requirement("listen", exact(standard("listen"))),
      requirement(
        "study-related-specialties",
        anySkill(),
        3,
        3,
        true,
        { zh: "和学习内容相关的专业技能", en: "specialties related to the course of study" },
      ),
      requirement("personal-or-era-specialties", anySkill(), 2, 2, true, personalOrEraGuidance),
    ],
    "academic",
    { aliases: { zh: ["学生", "实习生"], en: ["Student", "Intern"] } },
  ),
  defineOccupation(
    "missionary-keeper-rulebook",
    "传教士（核心规则书）",
    "Missionary (Keeper Rulebook)",
    [keeperRulebook(41, "职业点公式 EDU×4")],
    { min: 0, max: 30 },
    edu4,
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("mechanical-repair", exact(standard("mechanical-repair"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("natural-world", exact(standard("natural-world"))),
      requirement("social", socialSelector),
      requirement("other-skills", anySkill(), 2, 2),
    ],
    "religion-occult",
    {
      variantOf: "missionary",
      aliases: { zh: ["传教士"], en: ["Missionary"] },
    },
  ),
  defineOccupation(
    "missionary-investigator-handbook",
    "传教士（调查员手册）",
    "Missionary (Investigator Handbook)",
    [investigatorHandbook(83, "职业点公式 EDU×2 + APP×2")],
    { min: 0, max: 30 },
    edu2Plus("APP"),
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("mechanical-repair", exact(standard("mechanical-repair"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("natural-world", exact(standard("natural-world"))),
      requirement("social", socialSelector),
      requirement("personal-or-era-specialties", anySkill(), 2, 2, true, personalOrEraGuidance),
    ],
    "religion-occult",
    {
      variantOf: "missionary",
      aliases: { zh: ["传教士"], en: ["Missionary"] },
    },
  ),
];
