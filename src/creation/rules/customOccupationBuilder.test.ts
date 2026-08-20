import { describe, expect, it } from "vitest";

import { occupationDefinitionSchema } from "../../coc7/types/occupation";
import { getSkillRegistry } from "../../content/skillRegistry";
import {
  buildCustomOccupationDefinition,
  createCustomOccupationDraft,
  createCustomOccupationDraftFromDefinition,
  type CustomOccupationDraft,
  type CustomOccupationSkillSlotDraft,
} from "./customOccupationBuilder";

const skills = getSkillRegistry("standard");
const occupationId = "11111111-1111-4111-8111-111111111111";

function slot(
  id: string,
  definitionId: string,
  overrides: Partial<CustomOccupationSkillSlotDraft> = {},
): CustomOccupationSkillSlotDraft {
  return { id, definitionId, mode: "ordinary", ...overrides };
}

function draft(overrides: Partial<CustomOccupationDraft> = {}): CustomOccupationDraft {
  return {
    id: occupationId,
    nameZh: "调查顾问",
    nameEn: "Investigation Consultant",
    category: "investigation-security",
    creditRatingMin: 10,
    creditRatingMax: 60,
    pointFormula: { type: "single", attribute: "EDU", multiplier: 4 },
    skillSlots: [],
    ...overrides,
  };
}

function requireDefinition(value: ReturnType<typeof buildCustomOccupationDefinition>) {
  expect(value.errors).toEqual([]);
  if (!value.definition) throw new Error("未生成自定义职业定义");
  return value.definition;
}

describe("custom occupation builder", () => {
  it("新职业只生成一次 UUID identity，中文名在英文名为空时 fallback", () => {
    let calls = 0;
    const created = createCustomOccupationDraft(() => {
      calls += 1;
      return occupationId;
    });
    const definition = requireDefinition(buildCustomOccupationDefinition({
      ...created,
      nameZh: "  私家顾问  ",
      nameEn: "   ",
    }, skills, "classic-1920s"));

    expect(calls).toBe(1);
    expect(definition.id).toBe(occupationId);
    expect(definition.name).toEqual({ zh: "私家顾问", en: "私家顾问" });
    expect(definition.sourceRefs).toEqual([{ sourceId: "custom", title: "用户自定义职业" }]);
    expect(definition.era).toEqual({ type: "all" });
  });

  it("构造 single / sum-two / best-of 三种闭合公式", () => {
    expect(requireDefinition(buildCustomOccupationDefinition(draft({
      pointFormula: { type: "single", attribute: "APP", multiplier: 2 },
    }), skills)).pointFormula).toEqual({ type: "attribute", attribute: "APP", multiplier: 2 });

    expect(requireDefinition(buildCustomOccupationDefinition(draft({
      pointFormula: {
        type: "sum-two",
        first: { attribute: "EDU", multiplier: 2 },
        second: { attribute: "DEX", multiplier: 2 },
      },
    }), skills)).pointFormula).toEqual({
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "attribute", attribute: "DEX", multiplier: 2 },
      ],
    });

    expect(requireDefinition(buildCustomOccupationDefinition(draft({
      pointFormula: { type: "best-of", attributes: ["STR", "DEX", "POW"], multiplier: 2 },
    }), skills)).pointFormula).toEqual({
      type: "best-of",
      attributes: ["STR", "DEX", "POW"],
      multiplier: 2,
    });
  });

  it("构造普通技能与预定义专业化 exact 1/1 栏位", () => {
    const definition = requireDefinition(buildCustomOccupationDefinition(draft({
      skillSlots: [
        slot("slot-accounting", "accounting"),
        slot("slot-science-biology", "science", {
          mode: "predefined",
          specializationId: "biology",
        }),
      ],
    }), skills));

    expect(definition.skillRequirements).toEqual([
      {
        id: "slot-accounting",
        selector: { type: "exact", ref: { type: "standard", definitionId: "accounting" } },
        cardinality: { min: 1, max: 1 },
      },
      {
        id: "slot-science-biology",
        selector: {
          type: "exact",
          ref: { type: "predefined", definitionId: "science", specializationId: "biology" },
        },
        cardinality: { min: 1, max: 1 },
      },
    ]);
  });

  it("构造固定自定义专业化，中文与英文专业名使用同一输入", () => {
    const definition = requireDefinition(buildCustomOccupationDefinition(draft({
      skillSlots: [slot("slot-science-xenobiology", "science", {
        mode: "named-custom",
        customName: "异星生物学",
      })],
    }), skills));

    expect(definition.skillRequirements[0]?.selector).toEqual({
      type: "named-custom-specialization",
      definitionId: "science",
      name: { zh: "异星生物学", en: "异星生物学" },
    });
  });

  it("普通稍后选择专业为 1/1，Fighting 与 Firearms 保持 min1 + unbounded max", () => {
    const definition = requireDefinition(buildCustomOccupationDefinition(draft({
      skillSlots: [
        slot("slot-science", "science", { mode: "specialization-of" }),
        slot("slot-fighting", "fighting", { mode: "specialization-of" }),
        slot("slot-firearms", "firearms", { mode: "specialization-of" }),
      ],
    }), skills));

    expect(definition.skillRequirements.map(({ cardinality }) => cardinality)).toEqual([
      { min: 1, max: 1 },
      { min: 1 },
      { min: 1 },
    ]);
    expect(definition.skillRequirements.map(({ selector }) => selector)).toEqual([
      { type: "specialization-of", definitionId: "science" },
      { type: "specialization-of", definitionId: "fighting" },
      { type: "specialization-of", definitionId: "firearms" },
    ]);
  });

  it("提前拒绝 duplicate exact、allowMultiple=false parent 与空 custom name", () => {
    const duplicateExact = buildCustomOccupationDefinition(draft({
      skillSlots: [
        slot("slot-accounting-one", "accounting"),
        slot("slot-accounting-two", "accounting"),
      ],
    }), skills);
    expect(duplicateExact.errors.join("；")).toContain("同一技能实例");

    const repeatedParent = buildCustomOccupationDefinition(draft({
      skillSlots: [
        slot("slot-own-one", "language-own", { mode: "named-custom", customName: "中文" }),
        slot("slot-own-two", "language-own", { mode: "specialization-of" }),
      ],
    }), skills);
    expect(repeatedParent.errors.join("；")).toContain("只允许占用一个职业技能栏位");

    const emptyName = buildCustomOccupationDefinition(draft({
      skillSlots: [slot("slot-science-custom", "science", {
        mode: "named-custom",
        customName: "   ",
      })],
    }), skills);
    expect(emptyName.errors.join("；")).toContain("自定义专业名称不能为空");
  });

  it("提前拒绝最低信用评级高于最高信用评级", () => {
    const result = buildCustomOccupationDefinition(draft({
      creditRatingMin: 70,
      creditRatingMax: 30,
    }), skills);

    expect(result.definition).toBeUndefined();
    expect(result.errors).toContain("最低信用评级不能高于最高信用评级。");
  });

  it("过滤并拒绝时代不兼容技能，也拒绝把 Credit Rating 放入八个栏位", () => {
    const result = buildCustomOccupationDefinition(draft({
      skillSlots: [
        slot("slot-computer-use", "computer-use"),
        slot("slot-credit-rating", "credit-rating"),
      ],
    }), skills, "classic-1920s");

    expect(result.errors.join("；")).toContain("不适用于当前建卡时代");
    expect(result.errors.join("；")).toContain("信用评级由职业信用范围独立处理");
  });

  it("九个栏位继续由现有自定义职业容量 validator 拒绝", () => {
    const definitionIds = [
      "accounting", "anthropology", "appraise", "archaeology", "charm",
      "climb", "disguise", "dodge", "fast-talk",
    ];
    const result = buildCustomOccupationDefinition(draft({
      skillSlots: definitionIds.map((definitionId, index) =>
        slot(`slot-capacity-${index + 1}`, definitionId)),
    }), skills);

    expect(result.definition).toBeUndefined();
    expect(result.maximumSkills).toBe(9);
    expect(result.errors.join("；")).toContain("最多可产生 9 项");
  });

  it("编辑 Builder 支持的 current custom 保持 occupation 与 slot identity", () => {
    const original = requireDefinition(buildCustomOccupationDefinition(draft({
      skillSlots: [slot("slot-history", "history")],
    }), skills));
    const converted = createCustomOccupationDraftFromDefinition(original);
    expect(converted.errors).toEqual([]);
    if (!converted.draft) throw new Error("未还原 Builder draft");
    const edited = requireDefinition(buildCustomOccupationDefinition({
      ...converted.draft,
      nameZh: "编辑后的调查顾问",
    }, skills));

    expect(edited.id).toBe(original.id);
    expect(edited.skillRequirements[0]?.id).toBe("slot-history");
    expect(occupationDefinitionSchema.parse(edited)).toEqual(edited);
  });

  it("拒绝把 Builder 不支持的 selector 反向转换为可编辑栏位", () => {
    const original = requireDefinition(buildCustomOccupationDefinition(draft(), skills));
    const result = createCustomOccupationDraftFromDefinition({
      ...original,
      skillRequirements: [{
        id: "unsupported-choice",
        selector: {
          type: "one-of",
          selectors: [
            { type: "exact", ref: { type: "standard", definitionId: "accounting" } },
            { type: "exact", ref: { type: "standard", definitionId: "history" } },
          ],
        },
        cardinality: { min: 1, max: 1 },
      }],
    });

    expect(result.draft).toBeUndefined();
    expect(result.errors.join("；")).toContain("无法转换");
  });
});
