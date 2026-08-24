import type { Character } from "../../coc7/types/character";
import type { StandardWealthEraId } from "../../coc7/rules/wealth";
import type { WealthInitialization } from "../types/creationSession";

export type CreationWealthValidationErrorCode =
  | "standard-required"
  | "missing-era"
  | "missing-credit-rating"
  | "invalid-credit-rating"
  | "wealth-not-initialized"
  | "stale-wealth-initialization"
  | "missing-asset-entry";

export interface CreationWealthValidationError {
  readonly code: CreationWealthValidationErrorCode;
  readonly message: string;
}

export interface CreationWealthValidationResult {
  readonly valid: boolean;
  readonly creditRating: number | undefined;
  readonly errors: readonly CreationWealthValidationError[];
}

export function getFinalCreditRating(character: Pick<Character, "skills">): number | undefined {
  return character.skills?.find(
    (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "credit-rating",
  )?.currentValue;
}

export function isStandardWealthEraId(eraId: string | undefined): eraId is StandardWealthEraId {
  return eraId === "classic-1920s" || eraId === "modern";
}

export function isCreationWealthInitializationCurrent(
  eraId: string | undefined,
  creditRating: number | undefined,
  initialization: WealthInitialization | undefined,
): boolean {
  return initialization !== undefined &&
    isStandardWealthEraId(eraId) &&
    Number.isInteger(creditRating) &&
    initialization.eraId === eraId &&
    initialization.creditRating === creditRating;
}

export function validateCreationWealth(
  character: Character,
  initialization: WealthInitialization | undefined,
): CreationWealthValidationResult {
  const errors: CreationWealthValidationError[] = [];
  const creditRating = getFinalCreditRating(character);

  if (character.settingId !== "standard") {
    errors.push({ code: "standard-required", message: "当前建卡环境暂不支持创建期财富规则。" });
  }
  if (!isStandardWealthEraId(character.eraId)) {
    errors.push({ code: "missing-era", message: "请先选择建卡时代。" });
  }
  if (creditRating === undefined) {
    errors.push({ code: "missing-credit-rating", message: "必须先完成技能并生成最终信用评级。" });
  } else if (!Number.isInteger(creditRating) || creditRating < 0 || creditRating > 99) {
    errors.push({ code: "invalid-credit-rating", message: "信用评级必须为 0～99 的整数。" });
  }
  if (!character.wealth) {
    errors.push({ code: "wealth-not-initialized", message: "请先按当前信用评级建立财富记录。" });
  } else if (!isCreationWealthInitializationCurrent(
    character.eraId,
    creditRating,
    initialization,
  )) {
    errors.push({
      code: "stale-wealth-initialization",
      message: "当前财富基于旧的时代或信用评级，请重新建立财富记录。",
    });
  }
  if (character.wealth && character.wealth.assetsMinorUnits > 0 &&
    character.wealth.assetEntries.length === 0) {
    errors.push({
      code: "missing-asset-entry",
      message: "当前资产总额大于 0，请至少填写一条资产构成说明。",
    });
  }

  return { valid: errors.length === 0, creditRating, errors };
}
