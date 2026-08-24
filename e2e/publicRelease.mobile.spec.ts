import { expect, test } from "@playwright/test";

import { createIncompleteCharacterThroughAttributes } from "./creationWorkflow";
import { expectCleanPage, expectNoHorizontalOverflow, monitorPageQuality } from "./pageQuality";

test("390×844 Home, Create, Editor, and Final Sheet smoke", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await expect(page.getByText("本地数据安全", { exact: true })).toBeVisible();
  await expect(page.getByText(/COCSheet v0\.1\.0/u)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "创建调查员" }).first().click();
  await expect(page.getByRole("heading", { name: "创建调查员" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const characterId = await createIncompleteCharacterThroughAttributes(page, "手机端测试调查员");
  await expectNoHorizontalOverflow(page);
  await page.goto(`/#/characters/${characterId}/sheet`);
  await expect(page.getByRole("heading", { name: "手机端测试调查员" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectCleanPage(page, quality);
});

test("390×844 runtime recovery remains usable without overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/#/");
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("intentional mobile recovery audit") }));
  });
  await expect(page.getByRole("heading", { name: "页面运行时遇到了问题" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新载入页面" })).toBeVisible();
  await expect(page.getByRole("button", { name: "返回首页" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(consoleErrors).toHaveLength(1);
  expect(consoleErrors[0]).toContain("Unhandled window error");
  expect(pageErrors).toEqual([]);
});
