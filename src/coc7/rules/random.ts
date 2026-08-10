export interface RandomSource {
  nextInt(min: number, max: number): number;
}

export const systemRandomSource: RandomSource = {
  nextInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

export function rollDice(
  count: number,
  sides: number,
  source: RandomSource = systemRandomSource,
): readonly number[] {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(sides) || sides < 2) {
    throw new Error("骰子数量必须为正整数，面数必须至少为 2");
  }

  return Array.from({ length: count }, () => source.nextInt(1, sides));
}

export function rollD6(source: RandomSource = systemRandomSource): number {
  return source.nextInt(1, 6);
}

export function rollD10(source: RandomSource = systemRandomSource): number {
  return source.nextInt(1, 10);
}

export function rollD100(source: RandomSource = systemRandomSource): number {
  return source.nextInt(1, 100);
}
