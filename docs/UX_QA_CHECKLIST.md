# 玩家界面浏览器 QA 清单

涉及玩家可见页面的改动，除自动测试外，必须在 production-like build／preview 中完成实际浏览器验收。

## 视口

- Desktop：1280 × 900
- Mobile：390 × 844

## 每条 touched workflow

- 路由可直接打开，主操作可真实完成。
- Back 与同一路由参数切换后显示最新数据。
- loading、empty、error 与 long text 状态清楚且可继续操作。
- 按钮 disabled／busy 状态与实际操作一致。
- document 无页面级横向 overflow；宽表只在自身容器内滚动。
- browser console 0 errors。
- 玩家可见文案不泄漏开发术语，并符合 `docs/UI_TERMINOLOGY.md`。
