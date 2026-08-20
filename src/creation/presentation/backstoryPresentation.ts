import type { BackstoryCategoryId } from "../../coc7/types/character";
import type { CreationBackstoryCategoryId } from "../rules/creationBackstory";

export const backstoryCategoryLabels: Readonly<Record<BackstoryCategoryId, string>> = {
  "personal-description": "形象描述",
  "ideology-beliefs": "思想与信念",
  "significant-people": "重要之人",
  "meaningful-locations": "意义非凡之地",
  "treasured-possessions": "宝贵之物",
  traits: "特质",
  "injuries-scars": "伤口与疤痕",
  "phobias-manias": "恐惧症与躁狂症",
  "arcane-tomes-spells-artifacts": "秘典、法术与神器",
  encounters: "遭遇",
};

export interface CreationBackstoryCategoryPresentation {
  readonly id: CreationBackstoryCategoryId;
  readonly title: string;
  readonly description: string;
  readonly placeholder: string;
}

export const creationBackstoryCategories: readonly CreationBackstoryCategoryPresentation[] = [
  {
    id: "personal-description",
    title: backstoryCategoryLabels["personal-description"],
    description: "用一两句话描述外貌、举止或给人的第一印象。",
    placeholder: "例如：总穿着熨得笔挺的旧西装。",
  },
  {
    id: "ideology-beliefs",
    title: backstoryCategoryLabels["ideology-beliefs"],
    description: "记录调查员坚守的观念、信仰或人生原则。",
    placeholder: "例如：相信知识应当属于所有人。",
  },
  {
    id: "significant-people",
    title: backstoryCategoryLabels["significant-people"],
    description: "写下对调查员意义重大的某个人，以及这份关系。",
    placeholder: "例如：失踪多年的导师林教授。",
  },
  {
    id: "meaningful-locations",
    title: backstoryCategoryLabels["meaningful-locations"],
    description: "记录承载回忆、归属或执念的地点。",
    placeholder: "例如：海边那座已经停用的灯塔。",
  },
  {
    id: "treasured-possessions",
    title: backstoryCategoryLabels["treasured-possessions"],
    description: "写下无法轻易舍弃、具有私人意义的物件。",
    placeholder: "例如：父亲留下、已经停走的怀表。",
  },
  {
    id: "traits",
    title: backstoryCategoryLabels.traits,
    description: "概括调查员鲜明的性格、习惯或处事方式。",
    placeholder: "例如：面对危险时反而异常冷静。",
  },
];
