# Umami Sales APP 项目操作日志

> 记录项目关键信息、对话要点和技术细节

---

## 项目基本信息

| 项目 | 详情 |
|------|------|
| 项目名称 | Umami Sales APP |
| 项目路径 | `/Users/otwoyang/WorkBuddy/Umami Sales_APP20260727` |
| 项目类型 | POS PWA (销售点系统) |
| 部署平台 | Vercel (自动部署) |
| GitHub | otwoyang |

---

## 技术栈

- **前端**: PWA (Progressive Web App)
- **后端/数据库**: Supabase
- **数据同步**: Google Sheets
- **存储**: IndexedDB
- **Service Worker**: 用于离线功能

---

## Supabase 配置

| 配置项 | 值 |
|--------|-----|
| Reference ID | `rkydycctjpafgtdwwxqd` |
| 数据表 | `products`, `orders`, `settings` |

---

## 项目文件结构

```
/Users/otwoyang/WorkBuddy/Umami Sales_APP20260727/
├── app.js
├── index.html
├── kitchen.html
├── manifest.json
├── order.html
├── styles.css
└── sw.js
```

---

## 关键 Bug 修复记录

### 2026-04-27: 产品加载问题修复

**问题描述**: 产品未在 UI 中正确加载显示

**根本原因**: `SHEETS.init()` 调用时未使用 `await`，导致渲染在产品数据加载完成前就已执行

**修复方案**:
```javascript
// 修复前
SHEETS.init();
renderProducts();

// 修复后
await SHEETS.init();
renderProducts();
```

**Git 提交**:
- 提交信息: `Fix product loading - await SHEETS.init() before rendering`
- 分支: `main`
- 状态: 已推送至 origin/main

---

## 测试清单

部署后需验证以下功能：

1. [ ] 点击产品可添加到"当前订单"
2. [ ] 点击 Card/Cash 可完成订单
3. [ ] Google Sheet 中订单同步正常

---

## 开发流程偏好

- 测试习惯: 先用本地 Python HTTP server 验证，再部署到生产环境
- 反馈风格: 简洁直接，偏好代码而非解释性文字
- 调试方式: 日志、断点调试、增量测试、代码对比

---

## 更新记录

| 日期 | 操作 | 备注 |
|------|------|------|
| 2026-04-27 | 初始化 build_log.md | 记录项目关键信息 |
| 2026-04-27 | 修复产品加载 Bug | 添加 await SHEETS.init() |
| 2026-04-27 | 调试订单添加问题 | 添加调试日志追踪 addToOrder 和 renderProducts |

---

*此日志由 AI 助手维护，记录项目关键信息以便后续参考。*
