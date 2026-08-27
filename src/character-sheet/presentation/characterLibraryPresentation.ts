import type { CreationStepId } from "../../creation/types/creationSession";
import type { CharacterRecord } from "../../db/records";
import {
  getCharacterCreationStatus,
  type CharacterCreationStatus,
} from "./finalCharacterSheetPresentation";

export type CharacterLibraryStatusFilter = "all" | CharacterCreationStatus;
export type CharacterLibrarySortMode = "updated-desc" | "updated-asc" | "name";

export interface CharacterLibraryOptions {
  readonly query: string;
  readonly statusFilter: CharacterLibraryStatusFilter;
  readonly sortMode: CharacterLibrarySortMode;
}

export interface CharacterLibraryItem {
  readonly record: CharacterRecord;
  readonly creationStatus: CharacterCreationStatus;
}

export interface CharacterLibraryPresentation {
  readonly items: readonly CharacterLibraryItem[];
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly hasActiveFilters: boolean;
}

export type CharacterCreationStepMap = Readonly<Partial<Record<string, CreationStepId>>>;

const characterNameCollator = new Intl.Collator("zh-CN", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
});

function compareStableIdentity(left: CharacterLibraryItem, right: CharacterLibraryItem): number {
  if (left.record.id === right.record.id) return 0;
  return left.record.id < right.record.id ? -1 : 1;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase();
}

function getSearchableText(record: CharacterRecord): string {
  const occupationName = record.data.occupation?.displayNameSnapshot;
  return [
    record.data.name,
    occupationName?.zh,
    occupationName?.en,
    record.data.residence,
    record.data.birthplace,
  ]
    .filter((value): value is string => value !== undefined)
    .map(normalizeSearchText)
    .join("\n");
}

function compareItems(
  left: CharacterLibraryItem,
  right: CharacterLibraryItem,
  sortMode: CharacterLibrarySortMode,
): number {
  if (sortMode === "updated-desc") {
    return right.record.updatedAt - left.record.updatedAt || compareStableIdentity(left, right);
  }
  if (sortMode === "updated-asc") {
    return left.record.updatedAt - right.record.updatedAt || compareStableIdentity(left, right);
  }
  return characterNameCollator.compare(left.record.data.name, right.record.data.name) ||
    compareStableIdentity(left, right);
}

export function presentCharacterLibrary(
  records: readonly CharacterRecord[],
  sessionSteps: CharacterCreationStepMap,
  options: CharacterLibraryOptions,
): CharacterLibraryPresentation {
  const normalizedQuery = normalizeSearchText(options.query.trim());
  const hasActiveFilters = normalizedQuery.length > 0 || options.statusFilter !== "all";
  const items = records
    .map((record): CharacterLibraryItem => ({
      record,
      creationStatus: getCharacterCreationStatus(sessionSteps[record.id]),
    }))
    .filter((item) =>
      (!normalizedQuery || getSearchableText(item.record).includes(normalizedQuery)) &&
      (options.statusFilter === "all" || item.creationStatus === options.statusFilter),
    )
    .sort((left, right) => compareItems(left, right, options.sortMode));

  return {
    items,
    totalCount: records.length,
    visibleCount: items.length,
    hasActiveFilters,
  };
}
