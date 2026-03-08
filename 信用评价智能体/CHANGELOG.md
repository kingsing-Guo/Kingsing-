# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1] - 2026-03-07
### Changed
- 依照反馈改变了 `ModelAdjustPanel` 的 UI 组织形态，优化并移除大型右侧饼状图块，将其转换为与上方表单同源高度整合的微型分色水平进度“温度计”显示条。
- 使指标构型的 Ant Table 大面积向下独占伸展，并在表头提供极其友好的 “全部展开” 和 “全部收起” 工具。

### Added
- 在 “基础规制” 块扩展了铅笔形的开启编译能力，实现了可控制 `评分制`, `等级模式` 与基础兜底权重占比的下行表单。
- 在构建面板内，实装极具极客风格的【模型查看】模态窗口 (Model Viewer)，可自动将深树状关联的打分算子进行降维拍平展示，并添加了 CSV 生成与落本地能力。

## [v0.1.0] - 2026-03-07

### Added
- **AI 辅助修复了组件的规范**  
  - 变更人: Antigravity AI
  - 变更时间: 2026-03-07
  - 变更详细内容: 初始化信用评价智能体项目。按照 `GEMINI.md` 的规定，完成 Phase 1 双栏框架界面、`AgentWorkspace` 路由并拆分 `InputArea` 数据至单独 `hooks.ts` 中。
  - 变更原因: Bootstrap foundation implementation rules mapping to GEIMINI standard.
  - 关联 PRD 文件: `/docs/prd/prd-2025-03-07-credit-eval-agent.md`
