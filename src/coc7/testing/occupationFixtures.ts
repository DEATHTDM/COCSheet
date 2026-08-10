import type {
  OccupationDefinition,
  OccupationPointFormula,
  OccupationRequirement,
  SkillSelector,
} from "../types/occupation";
import type { SourceReference } from "../types/source";
import type { SkillRef } from "../types/skill";

const coreTitle = "《克苏鲁的呼唤 40 周年纪念版》";
const handbookTitle = "《克苏鲁的呼唤第七版调查员手册》";

const core = (page: number, note: string): SourceReference => ({
  sourceId: "coc7-keeper-rulebook-40th-zh",
  title: coreTitle,
  page,
  note,
});

const handbook = (page: number, note: string): SourceReference => ({
  sourceId: "coc7-investigator-handbook-zh-1-21",
  title: handbookTitle,
  page,
  note,
});

const edu4: OccupationPointFormula = { type: "attribute", attribute: "EDU", multiplier: 4 };
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
  if (ref.type === "custom") throw new Error("fixture 静态 selector 不接受 custom UUID");
  return { type: "exact", ref };
};
const specializationOf = (definitionId: string, exclude?: readonly SkillRef[]): SkillSelector => ({
  type: "specialization-of",
  definitionId,
  ...(exclude ? {
    exclude: exclude.map((ref) => {
      if (ref.type === "custom") throw new Error("fixture exclude 不接受 custom UUID");
      return ref;
    }),
  } : {}),
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
  guidance?: string,
): OccupationRequirement => ({
  id,
  selector,
  cardinality: { min, ...(max === null ? {} : { max }) },
  ...(keeperReview ? { keeperReview: true } : {}),
  ...(guidance ? { guidance: { zh: guidance, en: guidance } } : {}),
});

const socialSelector = oneOf(
  exact(standard("charm")),
  exact(standard("fast-talk")),
  exact(standard("intimidate")),
  exact(standard("persuade")),
);

function defineOccupation(
  id: string,
  zh: string,
  en: string,
  sourceRefs: readonly SourceReference[],
  creditRating: { readonly min: number; readonly max: number },
  pointFormula: OccupationPointFormula,
  skillRequirements: readonly OccupationRequirement[],
  category: OccupationDefinition["category"],
  variantOf?: string,
): OccupationDefinition {
  return {
    version: 1,
    id,
    ...(variantOf ? { variantOf } : {}),
    name: { zh, en },
    category,
    tags: ["phase-5a-fixture"],
    sourceRefs: [...sourceRefs],
    era: { type: "all" },
    creditRating,
    pointFormula,
    skillRequirements: [...skillRequirements],
  };
}

export const phase5aOccupationFixtures: readonly OccupationDefinition[] = [
  defineOccupation(
    "antiquarian",
    "文物学家",
    "Antiquarian",
    [
      core(40, "任意一项其他技能"),
      handbook(71, "任意一项其他个人或时代特长；规范化为 broad free-pick + Keeper guidance"),
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
      requirement("personal-or-era-specialty", anySkill(), 1, 1, true, "个人或时代特长"),
    ],
    "academic",
  ),
  defineOccupation(
    "doctor",
    "医生",
    "Doctor of Medicine",
    [handbook(78, "固定拉丁文、生物学、药学与两个学术或个人特长")],
    { min: 30, max: 80 },
    edu4,
    [
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("latin", {
        type: "named-custom-specialization",
        definitionId: "language-other",
        name: { zh: "拉丁文", en: "Latin" },
      }),
      requirement("psychology", exact(standard("psychology"))),
      requirement("biology", exact(predefined("science", "biology"))),
      requirement("pharmacy", exact(predefined("science", "pharmacy"))),
      requirement("academic-or-personal-specialties", anySkill(), 2, 2, true, "任两种其他学术或个人特长"),
    ],
    "medical",
  ),
  defineOccupation(
    "laboratory-assistant",
    "实验室助理",
    "Laboratory Assistant",
    [handbook(82, "科学（化学和任意两项）")],
    { min: 10, max: 30 },
    edu4,
    [
      requirement("computer-or-library", oneOf(exact(standard("computer-use")), exact(standard("library-use")))),
      requirement("electrical-repair", exact(standard("electrical-repair"))),
      requirement("other-language", specializationOf("language-other")),
      requirement("science-set", {
        type: "all-of",
        groups: [
          { selector: exact(predefined("science", "chemistry")), cardinality: { min: 1, max: 1 } },
          {
            selector: specializationOf("science", [predefined("science", "chemistry")]),
            cardinality: { min: 2, max: 2 },
          },
        ],
      }, 3, 3),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("personal-specialty", anySkill(), 1, 1, true, "任意一项其他个人特长"),
    ],
    "academic",
  ),
  defineOccupation(
    "technician",
    "技师",
    "Technician",
    [handbook(83, "任意两项个人、时代或技术特长")],
    { min: 9, max: 40 },
    edu4,
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("climb", exact(standard("climb"))),
      requirement("drive-auto", exact(standard("drive-auto"))),
      requirement("electrical-repair", exact(standard("electrical-repair"))),
      requirement("mechanical-repair", exact(standard("mechanical-repair"))),
      requirement("heavy-machinery", exact(standard("operate-heavy-machinery"))),
      requirement("personal-era-technical", anySkill(), 2, 2, true, "个人、时代或技术特长"),
    ],
    "technical-labor",
  ),
  defineOccupation(
    "police-detective",
    "警探",
    "Police Detective",
    [handbook(87, "艺术（表演）或乔装、一个社交技能与一个其他技能")],
    { min: 20, max: 50 },
    edu2Plus("DEX", "STR"),
    [
      requirement("acting-or-disguise", oneOf(exact(predefined("art-craft", "acting")), exact(standard("disguise")))),
      requirement("firearms", specializationOf("firearms"), 1, null),
      requirement("law", exact(standard("law"))),
      requirement("listen", exact(standard("listen"))),
      requirement("social", socialSelector),
      requirement("psychology", exact(standard("psychology"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
      requirement("other-skill", anySkill(), 1, 1),
    ],
    "investigation-security",
  ),
  defineOccupation(
    "professor",
    "教授",
    "Professor",
    [handbook(87, "任意四项学术、时代或个人特长")],
    { min: 20, max: 70 },
    edu4,
    [
      requirement("library-use", exact(standard("library-use"))),
      requirement("other-language", specializationOf("language-other")),
      requirement("own-language", specializationOf("language-own")),
      requirement("psychology", exact(standard("psychology"))),
      requirement("academic-era-personal", anySkill(), 4, 4, true, "学术、时代或个人特长"),
    ],
    "academic",
  ),
  defineOccupation(
    "soldier",
    "士兵、海军陆战队士兵",
    "Soldier / Marine",
    [handbook(89, "技能列表跨至书内第 90 页")],
    { min: 9, max: 30 },
    edu2Plus("DEX", "STR"),
    [
      requirement("climb-or-swim", oneOf(exact(standard("climb")), exact(standard("swim")))),
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
  ),
  defineOccupation(
    "student-intern",
    "学生、实习生",
    "Student / Intern",
    [handbook(90, "三个和学习内容相关的专业技能需要 Keeper review")],
    { min: 5, max: 10 },
    edu4,
    [
      requirement("language", oneOf(specializationOf("language-own"), specializationOf("language-other"))),
      requirement("library-use", exact(standard("library-use"))),
      requirement("listen", exact(standard("listen"))),
      requirement("study-related", anySkill(), 3, 3, true, "和学习内容相关的专业技能"),
      requirement("personal-or-era", anySkill(), 2, 2, true, "个人或时代特长"),
    ],
    "academic",
  ),
  defineOccupation(
    "drifter",
    "流浪者",
    "Drifter",
    [handbook(78, "EDU×2 + best(APP, DEX, STR)×2")],
    { min: 0, max: 5 },
    edu2Plus("APP", "DEX", "STR"),
    [
      requirement("climb", exact(standard("climb"))),
      requirement("jump", exact(standard("jump"))),
      requirement("listen", exact(standard("listen"))),
      requirement("navigate", exact(standard("navigate"))),
      requirement("social", socialSelector),
      requirement("stealth", exact(standard("stealth"))),
      requirement("personal-or-era", anySkill(), 2, 2, true, "个人或时代特长"),
    ],
    "outdoor-adventure",
  ),
  defineOccupation(
    "missionary-keeper-rulebook",
    "传教士（核心规则书）",
    "Missionary (Keeper Rulebook)",
    [core(41, "职业点公式 EDU×4")],
    { min: 0, max: 30 },
    edu4,
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("mechanical-repair", exact(standard("mechanical-repair"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("natural-world", exact(standard("natural-world"))),
      requirement("social", socialSelector),
      requirement("personal-or-era", anySkill(), 2, 2, true, "个人或时代特长"),
    ],
    "religion-occult",
    "missionary",
  ),
  defineOccupation(
    "missionary-investigator-handbook",
    "传教士（调查员手册）",
    "Missionary (Investigator Handbook)",
    [handbook(83, "职业点公式 EDU×2 + APP×2")],
    { min: 0, max: 30 },
    edu2Plus("APP"),
    [
      requirement("art-craft", specializationOf("art-craft")),
      requirement("first-aid", exact(standard("first-aid"))),
      requirement("mechanical-repair", exact(standard("mechanical-repair"))),
      requirement("medicine", exact(standard("medicine"))),
      requirement("natural-world", exact(standard("natural-world"))),
      requirement("social", socialSelector),
      requirement("personal-or-era", anySkill(), 2, 2, true, "个人或时代特长"),
    ],
    "religion-occult",
    "missionary",
  ),
];
