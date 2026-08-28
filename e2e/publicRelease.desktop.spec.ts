import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import packageMetadata from "../package.json";
import { createIncompleteCharacterThroughAttributes } from "./creationWorkflow";
import { expectCleanPage, expectNoHorizontalOverflow, monitorPageQuality } from "./pageQuality";

const libraryFixture = fileURLToPath(new URL(
  "../tests/fixtures/v1/cocsheet-library-v1.json",
  import.meta.url,
));
const characterFixture = fileURLToPath(new URL(
  "../tests/fixtures/v1/cocsheet-character-v1.json",
  import.meta.url,
));
const expectedAppVersion = process.env.EXPECTED_APP_VERSION ?? packageMetadata.version;
const injectedBuildSha = process.env.VITE_BUILD_SHA;
const expectedBuildLabel = injectedBuildSha && /^[0-9a-f]{7,64}$/iu.test(injectedBuildSha)
  ? injectedBuildSha.toLowerCase().slice(0, 12)
  : "dev";

test("Home → 法律与许可 → required notice and links → Home", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await expect(page.getByText("非官方粉丝项目", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "法律与许可" }).click();

  await expect(page).toHaveURL(/#\/legal$/u);
  await expect(page.getByRole("heading", { name: "法律与许可" })).toBeVisible();
  await expect(page.getByText("prohibited from charging", { exact: false })).toBeVisible();
  await expect(page.getByText("not published, endorsed, or specifically approved", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "项目源代码" }))
    .toHaveAttribute("href", "https://github.com/DEATHTDM/COCSheet");
  await expect(page.getByRole("link", { name: "查看 Chaosium Fan Material Policy" }))
    .toHaveAttribute("href", "https://www.chaosium.com/fan-material-policy/");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page.getByRole("heading", { name: "COCSheet" })).toBeVisible();
  await expectCleanPage(page, quality);
});

test("Home → deterministic creation → incomplete Final Sheet → print", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "本地数据备份" })).toBeVisible();
  await expect(page.getByText("资料只保存在这个浏览器中")).toBeVisible();
  await expect(page.getByText("建议定期导出完整备份", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(
    `COCSheet v${expectedAppVersion} · 构建 ${expectedBuildLabel} · 非官方粉丝项目`,
  )).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const characterName = "Playwright 测试调查员";
  const characterId = await createIncompleteCharacterThroughAttributes(page, characterName);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "COCSheet" }).click();
  const card = page.locator(".record-card").filter({ hasText: characterName });
  await expect(card).toContainText("建卡尚未完成");
  await card.getByRole("link", { name: "打开人物卡" }).click();
  await expect(page.getByRole("heading", { name: characterName })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#\/characters\/${characterId}\/sheet$`, "u"));
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "打印 / PDF" }).click();
  await expect(page.getByText("打印版人物卡", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectCleanPage(page, quality);
});

test("Preset persistence/share, fixed library import, and complete backup download", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/kp/presets");
  await page.getByRole("button", { name: "新建预设" }).click();
  await expect(page.getByRole("heading", { name: "编辑预设" })).toBeVisible();
  await page.getByLabel("名称").fill("Playwright 发布预设");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("预设已保存。", { exact: true })).toBeVisible();
  await page.goto("/#/kp/presets");
  const presetCard = page.locator(".record-card").filter({ hasText: "Playwright 发布预设" });
  await expect(presetCard).toBeVisible();
  await presetCard.getByRole("button", { name: /生成.*分享链接/u }).click();
  const shareUrl = page.locator(".preset-share-url");
  await expect(shareUrl).toBeVisible();
  await expect(shareUrl).toHaveValue(/#\/create\?kp=1\.[A-Za-z0-9_-]+/u);

  await page.goto("/#/");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[accept^=".cocsheet-backup.json"]').setInputFiles(libraryFixture);
  await expect(page.getByText("历史兼容测试调查员")).toBeVisible();
  await expect(page.getByText(/已导入 1 名调查员、1 份建卡进度和 1 个建卡预设/u)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^COCSheet-Library-\d{8}-\d{6}\.cocsheet-backup\.json$/u,
  );
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("完整备份下载没有本地文件路径");
  const backup = JSON.parse(await readFile(downloadPath, "utf8")) as {
    readonly format?: unknown;
    readonly formatVersion?: unknown;
  };
  expect(backup.format).toBe("cocsheet-library");
  expect(backup.formatVersion).toBe(1);
  await expectCleanPage(page, quality);
});

test("Investigator library search, status filter, sort, and clear", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/");
  await createIncompleteCharacterThroughAttributes(page, "Playwright 资料库记者");
  await page.getByRole("link", { name: "COCSheet" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[accept^=".cocsheet-backup.json"]').setInputFiles(libraryFixture);
  await expect(page.getByText("历史兼容测试调查员")).toBeVisible();
  await page.locator('input[accept^=".cocsheet.json"]').setInputFiles(characterFixture);
  await expect(page.getByText("兼容性测试调查员", { exact: true })).toBeVisible();
  await expect(page.getByText("共 3 名调查员")).toBeVisible();

  const search = page.getByLabel("搜索调查员");
  await search.fill("兼容性测试");
  await expect(page.locator(".record-card")).toHaveCount(1);
  await expect(page.getByText("兼容性测试调查员", { exact: true })).toBeVisible();
  await expect(page.getByText("Playwright 资料库记者", { exact: true })).toBeHidden();
  await expect(page.getByText("显示 1 / 3 名调查员")).toBeVisible();

  await search.fill("完全不存在的调查员");
  await expect(page.getByText("没有符合当前条件的调查员。")).toBeVisible();
  await page.getByRole("button", { name: "清除搜索与筛选" }).click();
  await expect(page.locator(".record-card")).toHaveCount(3);

  await page.getByLabel("建卡状态").selectOption({ label: "仅有人物卡资料" });
  await expect(page.locator(".record-card")).toHaveCount(1);
  await expect(page.getByText("兼容性测试调查员", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".record-card").getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("没有符合当前条件的调查员。")).toBeVisible();
  await expect(page.getByLabel("建卡状态")).toHaveValue("missing-session");
  await page.getByRole("button", { name: "清除搜索与筛选" }).click();
  await expect(page.locator(".record-card")).toHaveCount(2);

  await page.getByLabel("排序").selectOption({ label: "按姓名" });
  const sortedNames = await page.locator(".record-card strong").allTextContents();
  const expectedNames = [...sortedNames].sort(
    new Intl.Collator("zh-CN", { usage: "sort", sensitivity: "base", numeric: true }).compare,
  );
  expect(sortedNames).toEqual(expectedNames);
  await expectNoHorizontalOverflow(page);
  await expectCleanPage(page, quality);
});

test("unknown Hash route renders and returns from Not Found", async ({ page }) => {
  const quality = monitorPageQuality(page);
  await page.goto("/#/does-not-exist");
  await expect(page.getByRole("heading", { name: "页面不存在" })).toBeVisible();
  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page.getByRole("heading", { name: "COCSheet" })).toBeVisible();
  await expectCleanPage(page, quality);
});

test("runtime recovery sanitizes diagnostics and falls back to manual copy", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const secretToken = "1.secret-token-must-not-leak";
  await page.goto(`/#/create?kp=${secretToken}`);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("intentional recovery audit") }));
  });
  await expect(page.getByRole("heading", { name: "页面运行时遇到了问题" })).toBeVisible();
  await page.getByRole("button", { name: "复制诊断信息" }).click();
  const diagnostics = page.getByLabel("诊断信息");
  await expect(diagnostics).toBeVisible();
  await expect(diagnostics).toHaveValue(/Route: \/create/u);
  await expect(diagnostics).not.toHaveValue(new RegExp(secretToken, "u"));
  await expectNoHorizontalOverflow(page);
  expect(consoleErrors).toHaveLength(1);
  expect(consoleErrors[0]).toContain("Unhandled window error");
  expect(pageErrors).toEqual([]);
});
