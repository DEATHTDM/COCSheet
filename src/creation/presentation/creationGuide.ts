import type { CreationStepId } from "../types/creationSession";

export interface CreationGuideStepContent {
  readonly step: CreationStepId;
  readonly label: string;
  readonly title: string;
  readonly summary: string;
  readonly actions: readonly string[];
  readonly completionHint: string;
}

const sharedGuideContent = {
  "basic-info": {
    step: "basic-info",
    label: "基本信息",
    title: "完善调查员基本信息",
    summary: "先确定这位调查员是谁，并补齐后续建卡需要的基本上下文。",
    actions: [
      "填写姓名、年龄、性别、住所与出身地",
      "如果当前建卡环境提供时代选项，请明确选择建卡时代",
      "确认页面没有基本信息阻断提示后进入属性",
    ],
    completionHint: "使用真实表单的“继续：属性”时，页面会按现有流程检查必填信息。",
  },
  attributes: {
    step: "attributes",
    label: "属性",
    title: "生成并确认属性",
    summary: "按当前守秘人配置选择生成方式，完成年龄调整并确定幸运。",
    actions: [
      "选择当前守秘人配置允许的属性生成方式",
      "完成属性结果与页面要求的年龄调整",
      "完成教育成长流程并确定幸运",
      "检查属性与派生结果预览",
    ],
    completionHint: "以页面现有验证为准；没有阻断问题时使用真实的“完成属性”操作继续。",
  },
  occupation: {
    step: "occupation",
    label: "职业",
    title: "选择调查员职业",
    summary: "从当前建卡环境与人物时代可用的职业中选择一个职业。",
    actions: [
      "浏览或搜索符合人物方向的职业",
      "查看本职技能点公式、信用评级范围与本职技能需求",
      "处理页面显示的时代或建卡预设提醒",
      "确认职业后进入技能",
    ],
    completionHint: "职业是否可以继续由现有职业选择流程判断；引导不会替代该判断。",
  },
  skills: {
    step: "skills",
    label: "技能",
    title: "完成技能选择与分配",
    summary: "完成本职技能需求，并分配本职技能点与兴趣技能点。",
    actions: [
      "先完成页面列出的本职技能需求",
      "再分配本职技能点与兴趣技能点，并留意最终值预览",
      "按页面提示处理冲突、覆盖或守秘人确认",
      "解决页面检查列出的尚需完成事项",
    ],
    completionHint: "预算、守秘人确认和最终技能合法性以页面的技能结算检查为准。",
  },
  background: {
    step: "background",
    label: "背景",
    title: "建立背景与关键连接",
    summary: "用少量条目勾勒调查员，并选出最重要的一条连接。",
    actions: [
      "在六个创建背景类别中合计填写 3～6 条",
      "可以在同一类别填写多条，不要求覆盖全部类别",
      "从创建背景条目中选择一条关键连接",
    ],
    completionHint: "游戏期新增类别不计入创建完成条件；具体问题会由页面检查列出。",
  },
  possessions: {
    step: "possessions",
    label: "财富与物品",
    title: "复核财富、物品与武器",
    summary: "根据当前创建状态复核财富，并分别维护资产说明、普通物品和武器。",
    actions: [
      "按页面状态显式初始化或重新复核财富",
      "正资产需要至少一条资产构成说明",
      "分别维护普通随身物品与武器实例",
      "处理页面显示的财富需重新核对或资料缺失提醒",
    ],
    completionHint: "信用评级、金额与完成资格均由现有财富流程推导；引导不重新计算。",
  },
  review: {
    step: "review",
    label: "检查",
    title: "检查并完成建卡",
    summary: "检查已经保存的建卡结果，再决定打开人物卡或返回修改。",
    actions: [
      "复核身份、职业、属性、技能、背景、财富、物品与武器",
      "需要调整时使用本页的返回操作",
      "确认后打开独立的人物卡",
    ],
    completionHint: "本页只汇总已保存的人物数据，不会创建第二份人物资料。",
  },
} as const satisfies Readonly<Record<CreationStepId, CreationGuideStepContent>>;

export const creationGuideSteps = Object.freeze(
  Object.keys(sharedGuideContent) as CreationStepId[],
);

export function getCreationGuideStepContent(
  step: CreationStepId,
): CreationGuideStepContent {
  const shared = sharedGuideContent[step];
  if (!shared) {
    throw new Error(`未知建卡步骤：${String(step)}`);
  }
  return shared;
}

export type CreationGuideProgressState = "completed" | "current" | "pending";

export interface CreationGuideProgressItem {
  readonly step: CreationStepId;
  readonly label: string;
  readonly state: CreationGuideProgressState;
}

export function getCreationGuideProgress(
  currentStep: CreationStepId,
): readonly CreationGuideProgressItem[] {
  const currentIndex = creationGuideSteps.indexOf(currentStep);
  if (currentIndex < 0) {
    throw new Error(`未知建卡步骤：${String(currentStep)}`);
  }
  return Object.freeze(creationGuideSteps.map((step, index) => Object.freeze({
    step,
    label: getCreationGuideStepContent(step).label,
    state: index < currentIndex
      ? "completed" as const
      : index === currentIndex
        ? "current" as const
        : "pending" as const,
  })));
}
