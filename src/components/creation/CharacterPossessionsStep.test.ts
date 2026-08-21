import { createPinia } from "pinia";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import CharacterPossessionsStep from "./CharacterPossessionsStep.vue";

function weaponCard(html: string, name: string): string {
  const nameIndex = html.indexOf(name);
  if (nameIndex < 0) throw new Error(`未渲染武器：${name}`);
  const cardStart = html.lastIndexOf("<article", nameIndex);
  const cardEnd = html.indexOf("</article>", nameIndex);
  if (cardStart < 0 || cardEnd < 0) throw new Error(`武器卡片结构无效：${name}`);
  return html.slice(cardStart, cardEnd);
}

describe("CharacterPossessionsStep weapon availability", () => {
  it("unavailable 与 rare 只显示提示，不禁用添加按钮", async () => {
    const character: Character = {
      version: 1,
      id: crypto.randomUUID(),
      name: "武器展示测试",
      settingId: "standard",
      eraId: "classic-1920s",
    };
    const app = createSSRApp(CharacterPossessionsStep, { character });
    app.use(createPinia());

    const html = await renderToString(app);
    const unavailable = weaponCard(html, "FN FAL突击步枪");
    const rare = weaponCard(html, "燧发手枪");

    expect(unavailable).toContain("当前时代不可用");
    expect(unavailable).toContain("该标记仅供规则查阅，不阻止记录到人物卡");
    expect(unavailable).toContain(">添加</button>");
    expect(unavailable).not.toContain("disabled");
    expect(rare).toContain("稀有");
    expect(rare).toContain(">添加</button>");
    expect(rare).not.toContain("disabled");
  });
});
