import type {
  StandardInitialAssets,
  StandardLifestyleId,
} from "../../coc7/rules/wealth";

export const standardLifestyleLabels: Readonly<Record<StandardLifestyleId, string>> = {
  penniless: "身无分文",
  poor: "贫穷",
  average: "中产",
  wealthy: "富裕",
  rich: "豪富",
  "super-rich": "超级富豪",
};

function requireMinorUnits(amountMinorUnits: number): void {
  if (!Number.isInteger(amountMinorUnits) || amountMinorUnits < 0) {
    throw new RangeError("金额必须是非负整数");
  }
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatStandardMoney(amountMinorUnits: number): string {
  requireMinorUnits(amountMinorUnits);
  const dollars = Math.floor(amountMinorUnits / 100);
  const cents = amountMinorUnits % 100;
  return cents === 0
    ? `$${groupThousands(dollars)}`
    : `$${groupThousands(dollars)}.${String(cents).padStart(2, "0")}`;
}

export function formatStandardInitialAssets(assets: StandardInitialAssets): string {
  const amount = formatStandardMoney(assets.amountMinorUnits);
  return assets.type === "minimum" ? `至少 ${amount}` : amount;
}

export function standardMoneyInputValue(amountMinorUnits: number): string {
  requireMinorUnits(amountMinorUnits);
  return `${Math.floor(amountMinorUnits / 100)}.${String(amountMinorUnits % 100).padStart(2, "0")}`;
}

export function parseStandardMoneyInput(value: string): number {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error("金额必须是最多两位小数的非负美元数值");
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const amountMinorUnits = dollars * 100 + cents;
  requireMinorUnits(amountMinorUnits);
  return amountMinorUnits;
}
