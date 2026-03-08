# 公共信用评价模型构建智能体（前端）

面向政府行业主管部门的信用评价模型构建工作台，当前版本以前端 Mock 交互为主，用于验证流程与 UI 方案。

## 技术栈

- React 19 + TypeScript + Vite
- TailwindCSS + Ant Design
- Zustand（全局状态）
- Mock AI 流式回复 + Mock 模型数据

## 本地开发

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run lint
npm run build
```

## 当前实现范围

- 双栏工作台（对话区 + 结果展示区）
- 需求收集阶段：消息流、文件上传（Mock 解析）、案例检索（Mock）
- 模型构建/人工调整阶段：
  - 指标树查看与展开
  - 节点增删改
  - 权重拖拽平衡
  - 公共信用综合评价权重（>=10%）
  - 分数制切换（百分制/千分制）与等级阈值编辑
  - 模型预览与 CSV 导出
- 验算阶段占位页

## 后续开发（按 PRD）

1. Phase 3：样本选择、试算计算、统计图表、分析报告
2. Phase 4：版本管理、发布对接、管理办法文档生成与导出
3. API 对接：替换 Mock（AI/目录/主体/模型管理/发布）

PRD 路径：`docs/prd/prd-2025-03-07-credit-eval-agent.md`
