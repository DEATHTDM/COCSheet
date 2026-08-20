export const standardWealthEraIds = ["classic-1920s", "modern"] as const;

export type StandardWealthEraId = (typeof standardWealthEraIds)[number];

export const standardLifestyleIds = [
  "penniless",
  "poor",
  "average",
  "wealthy",
  "rich",
  "super-rich",
] as const;

export type StandardLifestyleId = (typeof standardLifestyleIds)[number];

export type StandardInitialAssets =
  | { readonly type: "exact"; readonly amountMinorUnits: number }
  | { readonly type: "minimum"; readonly amountMinorUnits: number };

export interface StandardInitialWealth {
  readonly lifestyle: StandardLifestyleId;
  readonly cashMinorUnits: number;
  readonly assets: StandardInitialAssets;
  readonly spendingLevelMinorUnits: number;
}

function requireCreditRating(creditRating: number): void {
  if (!Number.isInteger(creditRating) || creditRating < 0 || creditRating > 99) {
    throw new RangeError("Credit Rating 必须为 0～99 的整数");
  }
}

function deriveLifestyle(creditRating: number): StandardLifestyleId {
  if (creditRating === 0) return "penniless";
  if (creditRating <= 9) return "poor";
  if (creditRating <= 49) return "average";
  if (creditRating <= 89) return "wealthy";
  if (creditRating <= 98) return "rich";
  return "super-rich";
}

export function deriveStandardInitialWealth(
  eraId: StandardWealthEraId,
  creditRating: number,
): StandardInitialWealth {
  requireCreditRating(creditRating);
  const lifestyle = deriveLifestyle(creditRating);

  if (eraId === "classic-1920s") {
    if (creditRating === 0) {
      return {
        lifestyle,
        cashMinorUnits: 50,
        assets: { type: "exact", amountMinorUnits: 0 },
        spendingLevelMinorUnits: 50,
      };
    }
    if (creditRating <= 9) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 100,
        assets: { type: "exact", amountMinorUnits: creditRating * 1_000 },
        spendingLevelMinorUnits: 200,
      };
    }
    if (creditRating <= 49) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 200,
        assets: { type: "exact", amountMinorUnits: creditRating * 5_000 },
        spendingLevelMinorUnits: 1_000,
      };
    }
    if (creditRating <= 89) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 500,
        assets: { type: "exact", amountMinorUnits: creditRating * 50_000 },
        spendingLevelMinorUnits: 5_000,
      };
    }
    if (creditRating <= 98) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 2_000,
        assets: { type: "exact", amountMinorUnits: creditRating * 200_000 },
        spendingLevelMinorUnits: 25_000,
      };
    }
    return {
      lifestyle,
      cashMinorUnits: 5_000_000,
      assets: { type: "minimum", amountMinorUnits: 500_000_000 },
      spendingLevelMinorUnits: 500_000,
    };
  }

  if (eraId === "modern") {
    if (creditRating === 0) {
      return {
        lifestyle,
        cashMinorUnits: 1_000,
        assets: { type: "exact", amountMinorUnits: 0 },
        spendingLevelMinorUnits: 1_000,
      };
    }
    if (creditRating <= 9) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 2_000,
        assets: { type: "exact", amountMinorUnits: creditRating * 20_000 },
        spendingLevelMinorUnits: 4_000,
      };
    }
    if (creditRating <= 49) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 4_000,
        assets: { type: "exact", amountMinorUnits: creditRating * 100_000 },
        spendingLevelMinorUnits: 20_000,
      };
    }
    if (creditRating <= 89) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 10_000,
        assets: { type: "exact", amountMinorUnits: creditRating * 1_000_000 },
        spendingLevelMinorUnits: 100_000,
      };
    }
    if (creditRating <= 98) {
      return {
        lifestyle,
        cashMinorUnits: creditRating * 40_000,
        assets: { type: "exact", amountMinorUnits: creditRating * 4_000_000 },
        spendingLevelMinorUnits: 500_000,
      };
    }
    return {
      lifestyle,
      cashMinorUnits: 100_000_000,
      assets: { type: "minimum", amountMinorUnits: 10_000_000_000 },
      spendingLevelMinorUnits: 10_000_000,
    };
  }

  const exhaustiveEra: never = eraId;
  throw new Error(`不支持的 Standard 财富时代：${String(exhaustiveEra)}`);
}
