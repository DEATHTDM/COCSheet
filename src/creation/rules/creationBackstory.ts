import { backstoryEntrySchema, type BackstoryEntry, type CharacterBackstory } from "../../coc7/types/character";

export const creationBackstoryCategoryIds = [
  "personal-description",
  "ideology-beliefs",
  "significant-people",
  "meaningful-locations",
  "treasured-possessions",
  "traits",
] as const;

export type CreationBackstoryCategoryId = (typeof creationBackstoryCategoryIds)[number];

const creationCategorySet = new Set<string>(creationBackstoryCategoryIds);

export function isCreationBackstoryCategory(
  category: string,
): category is CreationBackstoryCategoryId {
  return creationCategorySet.has(category);
}

export type CreationBackstoryValidationIssueCode =
  | "too-few-entries"
  | "too-many-entries"
  | "invalid-entry"
  | "missing-key-connection"
  | "key-connection-not-creation-entry";

export interface CreationBackstoryValidationIssue {
  readonly code: CreationBackstoryValidationIssueCode;
  readonly message: string;
  readonly entryId?: string;
}

export interface CreationBackstoryValidationResult {
  readonly valid: boolean;
  readonly count: number;
  readonly creationEntries: readonly BackstoryEntry[];
  readonly errors: readonly CreationBackstoryValidationIssue[];
}

export function validateCreationBackstory(
  backstory: CharacterBackstory | undefined,
): CreationBackstoryValidationResult {
  const creationEntries = (backstory?.entries ?? []).filter((entry) =>
    isCreationBackstoryCategory(entry.category),
  );
  const errors: CreationBackstoryValidationIssue[] = [];

  if (creationEntries.length < 3) {
    errors.push({
      code: "too-few-entries",
      message: `创建背景至少需要 3 条；当前为 ${creationEntries.length} 条。`,
    });
  } else if (creationEntries.length > 6) {
    errors.push({
      code: "too-many-entries",
      message: `创建背景最多只能有 6 条；当前为 ${creationEntries.length} 条。`,
    });
  }

  for (const entry of creationEntries) {
    if (!backstoryEntrySchema.safeParse(entry).success) {
      errors.push({
        code: "invalid-entry",
        message: "创建背景中存在无效条目。",
        entryId: entry.id,
      });
    }
  }

  if (!backstory?.keyConnectionEntryId) {
    errors.push({
      code: "missing-key-connection",
      message: "请选择一条创建背景作为关键连接。",
    });
  } else if (!creationEntries.some((entry) => entry.id === backstory.keyConnectionEntryId)) {
    errors.push({
      code: "key-connection-not-creation-entry",
      message: "关键连接必须是本次创建的 3～6 条背景之一。",
      entryId: backstory.keyConnectionEntryId,
    });
  }

  return {
    valid: errors.length === 0,
    count: creationEntries.length,
    creationEntries,
    errors,
  };
}
