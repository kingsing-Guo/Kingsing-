import type { CreditEvalModel } from '../types/model';

// 第二阶段 Mock 模型（基于上传需求生成）
export const MOCK_GENERATED_MODEL: CreditEvalModel = {
  modelName: '交通运输信用评价指标体系',
  totalScoreMode: 100,
  publicCreditWeight: 15,
  gradeLevels: [
    { id: 'g1', name: 'A', minScore: 80, color: '#10b981' },
    { id: 'g2', name: 'B', minScore: 60, color: '#3b82f6' },
    { id: 'g3', name: 'C', minScore: 40, color: '#f59e0b' },
    { id: 'g4', name: 'D', minScore: 0, color: '#ef4444' }
  ],
  vetoRules: [
    { id: 'v1', name: '发生重大及以上安全生产事故', description: '或1年内累计发生2次及以上较大安全生产事故，信用评价直接归为D级（最低档）。' },
    { id: 'v2', name: '被司法机关纳入失信被执行人名单', description: '严重失信行为，信用评价直接归最低等级。' }
  ],
  bonusRules: [
    { id: 'b1', name: '获得国家级/省级本领域科技奖项', score: 8 },
    { id: 'b2', name: '系统智能化项目获省级以上试点', score: 5 },
    { id: 'b3', name: '连续三年公信度评估良好以上', score: 7 }
  ],
  indicators: [
    {
      id: "ind-1",
      name: "公共信用综合评价",
      level: 1,
      weight: 15,
      score: 15,
      description: "依照市发改委公共信用数据接口下发结果折算分配",
      dataSource: "市发改委公共信用对接接口"
    },
    {
      id: "ind-2",
      name: "安全与合规治理 (核心)",
      level: 1,
      weight: 45,
      score: 45,
      children: [
        {
          id: "ind-2-1",
          name: "安全类行政处罚与记录",
          level: 2,
          weight: 60,
          score: 25,
          children: [
            {
              id: "ind-2-1-1",
              name: "按日计罚（重大环境违法）",
              level: 3,
              weight: 50,
              ruleType: 'interval',
              description: "当年内若出现1次扣500分，2次以上直接清零。",
              dataSource: "市环保局处罚库"
            },
            {
              id: "ind-2-1-2",
              name: "一般环境类罚款",
              level: 3,
              weight: 50,
              ruleType: 'linear',
              description: "5万元以下罚款。每处罚1次扣减总模型分数 20 分。",
              dataSource: "市环保局处罚库"
            }
          ]
        },
        {
          id: "ind-2-2",
          name: "管理规章与台账执行",
          level: 2,
          weight: 40,
          score: 20,
          children: [
            {
              id: "ind-2-2-1",
              name: "内部监控数据一致率",
              level: 3,
              weight: 100,
              score: 20,
              ruleType: 'linear',
              dataSource: "省排污监控大屏"
            }
          ]
        }
      ]
    },
    {
      id: "ind-3",
      name: "公众监督与日常运营服务",
      level: 1,
      weight: 40,
      score: 40,
      children: [
        {
          id: "ind-3-1",
          name: "公众12345投诉率",
          level: 2,
          weight: 50,
          score: 20,
          children: [{id:"ind-3-1-1", name: "有效投诉与查实占比", level: 3, weight: 100, score: 20, ruleType: 'linear', dataSource: "市政服务中心"}]
        },
        {
          id: "ind-3-2",
          name: "服务达标测评",
          level: 2,
          weight: 50,
          score: 20,
          children: [{id:"ind-3-2-1", name: "第三方或行业内控抽评合格率", level: 3, weight: 100, score: 20, ruleType: 'threshold', description: "测试合格率需达到 95% 以上", dataSource: "第三方监督库"}]
        }
      ]
    }
  ]
};
