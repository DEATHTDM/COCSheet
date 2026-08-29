import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import { createIncompleteCharacterThroughAttributes } from "./creationWorkflow";
import { expectCleanPage, expectNoHorizontalOverflow, monitorPageQuality } from "./pageQuality";

const packageMetadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { readonly version: string };
const expectedAppVersion = process.env.EXPECTED_APP_VERSION ?? packageMetadata.version;

test("390×844 footer and Legal page keep the full notice accessible without overflow", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await expect(page.getByRole("link", { name: "法律与许可" })).toBeVisible();
  await page.getByRole("link", { name: "法律与许可" }).click();

  await expect(page.getByRole("heading", { name: "法律与许可" })).toBeVisible();
  await expect(page.getByText("prohibited from charging", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看 Chaosium Fan Material Policy" }))
    .toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("link", { name: "项目源代码" }))
    .toHaveAttribute("rel", "noopener noreferrer");
  await expectNoHorizontalOverflow(page);
  await expectCleanPage(page, quality);
});

test("390×844 Home, Create, Editor, and Final Sheet smoke", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await expect(page.getByText("本地数据安全", { exact: true })).toBeVisible();
  await expect(page.getByText(`COCSheet v${expectedAppVersion}`, { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "创建调查员" }).first().click();
  await expect(page.getByRole("heading", { name: "创建调查员" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const characterId = await createIncompleteCharacterThroughAttributes(page, "手机端测试调查员");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "COCSheet" }).click();
  await expect(page.getByLabel("搜索调查员")).toBeVisible();
  await page.getByLabel("搜索调查员").fill("这是一段很长的手机端搜索文字，用来检查输入框不会撑破页面宽度");
  await page.getByLabel("建卡状态").selectOption({ label: "仅有人物卡资料" });
  await page.getByLabel("排序").selectOption({ label: "最早修改" });
  await expect(page.getByText("没有符合当前条件的调查员。")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "清除搜索与筛选" }).click();
  await expect(page.getByText("手机端测试调查员", { exact: true })).toBeVisible();
  await expect(page.getByLabel("排序")).toHaveValue("updated-asc");
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
