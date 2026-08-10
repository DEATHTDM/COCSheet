import type { CharacteristicValues } from "../types/attribute";

export type MovementRateResult =
  | {
      readonly status: "value";
      readonly value: number;
    }
  | {
      readonly status: "keeper-ruling";
    };

export type DamageBonus =
  | {
      readonly kind: "flat";
      readonly value: -2 | -1 | 0;
    }
  | {
      readonly kind: "dice";
      readonly count: number;
      readonly sides: 4 | 6;
    };

export interface DamageBonusAndBuild {
  readonly damageBonus: DamageBonus;
  readonly build: number;
}

export interface StandardDerivedCharacterValues extends DamageBonusAndBuild {
  readonly maxHp: number;
  readonly maxMp: number;
  readonly initialSan: number;
  readonly movement: MovementRateResult;
}

function requireNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} 必须为非负整数`);
  }
}

export function calculateMaxHitPoints(con: number, siz: number): number {
  requireNonNegativeInteger(con, "CON");
  requireNonNegativeInteger(siz, "SIZ");
  return Math.floor((con + siz) / 10);
}

export function calculateMaxMagicPoints(pow: number): number {
  requireNonNegativeInteger(pow, "POW");
  return Math.floor(pow / 5);
}

export function calculateInitialSanity(pow: number): number {
  requireNonNegativeInteger(pow, "POW");
  return pow;
}

export function calculateMovementRate(
  age: number,
  str: number,
  dex: number,
  siz: number,
): MovementRateResult {
  requireNonNegativeInteger(str, "STR");
  requireNonNegativeInteger(dex, "DEX");
  requireNonNegativeInteger(siz, "SIZ");

  if (!Number.isInteger(age) || age < 15 || age >= 90) {
    return { status: "keeper-ruling" };
  }

  const base = str < siz && dex < siz
    ? 7
    : str > siz && dex > siz
      ? 9
      : 8;
  const agePenalty = age < 40 ? 0 : Math.floor((age - 40) / 10) + 1;
  return { status: "value", value: Math.max(1, base - agePenalty) };
}

export function calculateDamageBonusAndBuild(
  combinedStrengthAndSize: number,
): DamageBonusAndBuild {
  if (!Number.isInteger(combinedStrengthAndSize) || combinedStrengthAndSize < 2) {
    throw new RangeError("STR + SIZ 必须为不小于 2 的整数");
  }

  if (combinedStrengthAndSize <= 64) {
    return { damageBonus: { kind: "flat", value: -2 }, build: -2 };
  }
  if (combinedStrengthAndSize <= 84) {
    return { damageBonus: { kind: "flat", value: -1 }, build: -1 };
  }
  if (combinedStrengthAndSize <= 124) {
    return { damageBonus: { kind: "flat", value: 0 }, build: 0 };
  }
  if (combinedStrengthAndSize <= 164) {
    return { damageBonus: { kind: "dice", count: 1, sides: 4 }, build: 1 };
  }

  const diceCount = combinedStrengthAndSize <= 204
    ? 1
    : Math.floor((combinedStrengthAndSize - 205) / 80) + 2;
  return {
    damageBonus: { kind: "dice", count: diceCount, sides: 6 },
    build: diceCount + 1,
  };
}

export function formatDamageBonus(damageBonus: DamageBonus): string {
  if (damageBonus.kind === "flat") {
    return damageBonus.value === 0 ? "无" : String(damageBonus.value);
  }
  return `+${damageBonus.count}D${damageBonus.sides}`;
}

export function deriveStandardCharacterValues(
  age: number,
  characteristics: CharacteristicValues,
): StandardDerivedCharacterValues {
  const damageBonusAndBuild = calculateDamageBonusAndBuild(
    characteristics.STR + characteristics.SIZ,
  );
  return {
    maxHp: calculateMaxHitPoints(characteristics.CON, characteristics.SIZ),
    maxMp: calculateMaxMagicPoints(characteristics.POW),
    initialSan: calculateInitialSanity(characteristics.POW),
    movement: calculateMovementRate(
      age,
      characteristics.STR,
      characteristics.DEX,
      characteristics.SIZ,
    ),
    ...damageBonusAndBuild,
  };
}
