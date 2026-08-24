import { expect, type Page } from "@playwright/test";

const characteristicLabels = [
  "力量（STR）",
  "体质（CON）",
  "体型（SIZ）",
  "敏捷（DEX）",
  "外貌（APP）",
  "智力（INT）",
  "意志（POW）",
  "教育（EDU）",
] as const;

export async function createIncompleteCharacterThroughAttributes(
  page: Page,
  name: string,
): Promise<string> {
  await page.goto("/#/");
  await page.getByRole("link", { name: "创建调查员" }).first().click();
  await expect(page.getByText("当前支持 CoC 7版标准规则")).toBeVisible();
  await page.getByRole("button", { name: "开始创建调查员" }).click();
  await expect(page.getByRole("heading", { name: "基本信息", exact: true })).toBeVisible();

  await page.getByLabel("姓名").fill(name);
  await page.getByLabel("年龄").fill("18");
  await page.getByLabel("性别").fill("测试");
  await page.getByLabel("住所").fill("阿卡姆测试街");
  await page.getByLabel("出身地").fill("测试城");
  await page.getByLabel("建卡时代").selectOption("classic-1920s");
  await page.getByRole("button", { name: "继续：属性" }).click();

  await expect(page.getByRole("heading", { name: "属性生成", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "手动输入", exact: true }).click();
  for (const label of characteristicLabels) {
    await page.getByLabel(label).fill("50");
  }
  const ageAdjustment = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /年龄调整/u }),
  });
  await ageAdjustment.locator('input[type="number"]').first().fill("5");
  const luckInput = page.locator(".luck-controls input");
  await luckInput.fill("50");
  await luckInput.blur();
  const complete = page.getByRole("button", { name: "完成属性" });
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(page.getByRole("heading", { name: "选择职业" })).toBeVisible();

  const match = page.url().match(/#\/characters\/([^/?#]+)/u);
  if (!match?.[1]) throw new Error("创建完成后 URL 缺少 Character ID");
  return match[1];
}
