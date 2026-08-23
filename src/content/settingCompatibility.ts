import type { SettingId } from "../coc7/types/setting";

// Display-only metadata for historically parseable identities. Entries here are
// not SettingPacks and do not make a Setting available for new product workflows.
const historicalSettingLabels = Object.freeze({
  standard: "Standard CoC 7E",
  gaslight: "Cthulhu by Gaslight",
  "down-darker-trails": "Down Darker Trails",
  "dark-ages": "Cthulhu Dark Ages",
  regency: "Regency Cthulhu",
} satisfies Readonly<Record<SettingId, string>>);

export function getHistoricalSettingLabel(settingId: SettingId): string {
  return historicalSettingLabels[settingId];
}
