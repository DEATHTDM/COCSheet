import { getFifthValue, getHalfValue } from "../../coc7/rules/attributes";
import { formatDamageBonus } from "../../coc7/rules/derived";
import { characteristicIds, type CharacteristicId } from "../../coc7/types/attribute";
import type {
  BackstoryCategoryId,
  BackstoryEntry,
  Character,
  CharacterAssetEntry,
  CharacterPossessionEntry,
} from "../../coc7/types/character";
import type { EraId } from "../../coc7/types/occupation";
import type { SkillRegistry } from "../../content/skillRegistry";
import {
  presentCharacterWeapon,
  type CharacterWeaponPresentation,
} from "../../content/weaponPresentation";
import type { WeaponRegistry } from "../../content/weaponRegistry";
import { formatOccupationEraId } from "../../creation/presentation/occupationPresentation";
import {
  formatStandardMoney,
  standardLifestyleLabels,
} from "../../creation/presentation/wealthPresentation";
import {
  deriveFinalSheetStandardValues,
  deriveFinalSheetStandardWealth,
  getFinalSheetMaximumSanity,
  presentFinalSheetBackstory,
  resolveFinalSheetSkillRows,
  type FinalSheetSkillPresentation,
} from "./finalCharacterSheetPresentation";

export interface PrintableCharacteristic {
  readonly id: CharacteristicId;
  readonly currentValue: number;
  readonly halfValue: number;
  readonly fifthValue: number;
}

export interface PrintableBackstoryEntry extends BackstoryEntry {
  readonly keyConnection: boolean;
}

export interface PrintableBackstoryGroup {
  readonly category: BackstoryCategoryId;
  readonly label: string;
  readonly entries: readonly PrintableBackstoryEntry[];
}

export interface PrintableAssetEntry {
  readonly entry: CharacterAssetEntry;
  readonly valueLabel: string;
}

export interface PrintableWealth {
  readonly cashLabel: string;
  readonly assetsLabel: string;
  readonly spendingLevelLabel?: string;
  readonly lifestyleLabel?: string;
  readonly entries: readonly PrintableAssetEntry[];
  readonly standard: boolean;
}

export interface PrintableDerivedValues {
  readonly movement: string;
  readonly damageBonus: string;
  readonly build: number;
}

export interface PrintableCharacterSheetPresentation {
  readonly titleName: string;
  readonly identity: {
    readonly name: string;
    readonly occupation: string;
    readonly setting: string;
    readonly era: string;
    readonly age: string;
    readonly sex: string;
    readonly residence: string;
    readonly birthplace: string;
  };
  readonly resources: {
    readonly currentHp: string;
    readonly maximumHp: string;
    readonly currentMp: string;
    readonly initialMp: string;
    readonly currentSan: string;
    readonly maximumSan: string;
    readonly currentLuck: string;
  };
  readonly characteristics?: readonly PrintableCharacteristic[];
  readonly derived?: PrintableDerivedValues;
  readonly skills: readonly FinalSheetSkillPresentation[];
  readonly backstory: readonly PrintableBackstoryGroup[];
  readonly wealth?: PrintableWealth;
  readonly possessions: readonly CharacterPossessionEntry[];
  readonly weapons: readonly CharacterWeaponPresentation[];
}

export interface PrintableSettingPresentation {
  readonly name: string;
  readonly eras?: readonly EraId[];
}

function displayValue(value: string | number | undefined): string {
  return value === undefined || value === "" ? "—" : String(value);
}

function resolveEraLabel(character: Character, setting: PrintableSettingPresentation): string {
  if (!character.eraId || !setting.eras?.includes(character.eraId)) return "—";
  return formatOccupationEraId(character.eraId);
}

function presentCharacteristics(
  character: Character,
): readonly PrintableCharacteristic[] | undefined {
  if (!character.characteristics) return undefined;
  return characteristicIds.map((id) => {
    const currentValue = character.characteristics![id];
    return {
      id,
      currentValue,
      halfValue: getHalfValue(currentValue),
      fifthValue: getFifthValue(currentValue),
    };
  });
}

function presentBackstory(character: Character): readonly PrintableBackstoryGroup[] {
  const keyConnectionEntryId = character.backstory?.keyConnectionEntryId;
  return presentFinalSheetBackstory(character).map((group) => ({
    category: group.category,
    label: group.label,
    entries: group.entries.map((entry) => ({
      ...entry,
      keyConnection: entry.id === keyConnectionEntryId,
    })),
  }));
}

function presentWealth(character: Character): PrintableWealth | undefined {
  if (!character.wealth) return undefined;
  const standard = character.settingId === "standard";
  const rule = standard ? deriveFinalSheetStandardWealth(character) : undefined;
  const formatAmount = (amount: number): string => standard
    ? formatStandardMoney(amount)
    : `原始金额 ${amount}（当前规则环境暂不支持格式化）`;
  return {
    cashLabel: formatAmount(character.wealth.cashMinorUnits),
    assetsLabel: formatAmount(character.wealth.assetsMinorUnits),
    ...(rule
      ? {
          spendingLevelLabel: formatStandardMoney(rule.spendingLevelMinorUnits),
          lifestyleLabel: standardLifestyleLabels[rule.lifestyle],
        }
      : {}),
    entries: character.wealth.assetEntries.map((entry) => ({
      entry,
      valueLabel: entry.valueMinorUnits === undefined
        ? "未记录估值"
        : formatAmount(entry.valueMinorUnits),
    })),
    standard,
  };
}

export function presentPrintableCharacterSheet(
  character: Character,
  setting: PrintableSettingPresentation,
  skillRegistry: SkillRegistry,
  weaponRegistry: WeaponRegistry,
): PrintableCharacterSheetPresentation {
  const standardDerived = deriveFinalSheetStandardValues(character);
  const characteristics = presentCharacteristics(character);
  const wealth = presentWealth(character);
  return {
    titleName: character.name || "未命名调查员",
    identity: {
      name: displayValue(character.name),
      occupation: displayValue(character.occupation?.displayNameSnapshot.zh),
      setting: setting.name,
      era: resolveEraLabel(character, setting),
      age: displayValue(character.age),
      sex: displayValue(character.sex),
      residence: displayValue(character.residence),
      birthplace: displayValue(character.birthplace),
    },
    resources: {
      currentHp: displayValue(character.resources?.hp.current),
      maximumHp: displayValue(standardDerived?.maxHp),
      currentMp: displayValue(character.resources?.mp.current),
      initialMp: displayValue(standardDerived?.initialMp),
      currentSan: displayValue(character.resources?.san.current),
      maximumSan: String(getFinalSheetMaximumSanity(character)),
      currentLuck: displayValue(character.luck),
    },
    ...(characteristics ? { characteristics } : {}),
    ...(standardDerived
      ? {
          derived: {
            movement: standardDerived.movement.status === "value"
              ? String(standardDerived.movement.value)
              : "需 KP 裁定",
            damageBonus: formatDamageBonus(standardDerived.damageBonus),
            build: standardDerived.build,
          },
        }
      : {}),
    skills: resolveFinalSheetSkillRows(character, skillRegistry),
    backstory: presentBackstory(character),
    ...(wealth ? { wealth } : {}),
    possessions: character.possessions ?? [],
    weapons: (character.weapons ?? []).map((instance) => presentCharacterWeapon(
      instance,
      weaponRegistry,
      skillRegistry,
      character.eraId,
    )),
  };
}
