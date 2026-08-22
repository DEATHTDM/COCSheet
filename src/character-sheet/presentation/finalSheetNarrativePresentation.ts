import {
  backstoryCategoryIds,
  type BackstoryCategoryId,
} from "../../coc7/types/character";
import {
  backstoryCategoryLabels,
  creationBackstoryCategories,
} from "../../creation/presentation/backstoryPresentation";
import { isCreationBackstoryCategory } from "../../creation/rules/creationBackstory";

export interface FinalSheetBackstoryCategoryPresentation {
  readonly id: BackstoryCategoryId;
  readonly title: string;
  readonly description: string;
  readonly kind: "creation" | "game-time";
}

const creationPresentationById = new Map(
  creationBackstoryCategories.map((category) => [category.id, category]),
);

export const finalSheetBackstoryCategories: readonly FinalSheetBackstoryCategoryPresentation[] =
  backstoryCategoryIds.map((id) => {
    const creationPresentation = isCreationBackstoryCategory(id)
      ? creationPresentationById.get(id)
      : undefined;
    return {
      id,
      title: backstoryCategoryLabels[id],
      description: creationPresentation?.description ?? "游戏过程中的长期叙事记录；此处只保存文本，不触发自动规则。",
      kind: creationPresentation ? "creation" : "game-time",
    };
  });

export const finalSheetCreationBackstoryCategories = finalSheetBackstoryCategories.filter(
  (category) => category.kind === "creation",
);

export const finalSheetGameTimeBackstoryCategories = finalSheetBackstoryCategories.filter(
  (category) => category.kind === "game-time",
);
