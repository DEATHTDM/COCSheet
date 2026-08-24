import { expect, type Page } from "@playwright/test";

export interface PageQualityMonitor {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
}

export function monitorPageQuality(page: Page): PageQualityMonitor {
  const monitor: PageQualityMonitor = { consoleErrors: [], pageErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") monitor.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => monitor.pageErrors.push(error.message));
  return monitor;
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

export async function expectCleanPage(
  page: Page,
  monitor: PageQualityMonitor,
): Promise<void> {
  await expectNoHorizontalOverflow(page);
  expect(monitor.consoleErrors).toEqual([]);
  expect(monitor.pageErrors).toEqual([]);
}
