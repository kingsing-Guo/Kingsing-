import type {
  CreditEvalModel,
  IndicatorNode,
  IntervalRangeRule,
  ThresholdRuleConfig,
  LinearRuleConfig,
  RatioRuleConfig,
  CumulativeRuleConfig,
} from '../types/model';

export type ConfigurableRuleType = 'interval' | 'threshold' | 'linear' | 'ratio' | 'cumulative';

export interface DataIndicatorOption {
  key: string;
  label: string;
  code: string;
  dataType: string;
  valueRange: string;
  description: string;
  recommendedRuleTypes: ConfigurableRuleType[];
}

export interface RuleRecommendation {
  recommendedRuleTypes: ConfigurableRuleType[];
  topRuleType: ConfigurableRuleType;
  reason: string;
  intervalRanges: IntervalRangeRule[];
  thresholdRule: ThresholdRuleConfig;
  linearRule: LinearRuleConfig;
  ratioRule: RatioRuleConfig;
  cumulativeRule: CumulativeRuleConfig;
}

const RULE_TYPE_ORDER: ConfigurableRuleType[] = ['interval', 'threshold', 'linear', 'ratio', 'cumulative'];

export const DATA_INDICATOR_OPTIONS: DataIndicatorOption[] = [
  {
    key: 'cp_safety_certification',
    label: '安全生产认证',
    code: 'CP_SAFETY_CERTIFICATION',
    dataType: '布尔型',
    valueRange: 'true/false',
    description: '是否具备有效的安全生产责任制度、应急预案及认证信息。',
    recommendedRuleTypes: ['threshold', 'interval', 'ratio'],
  },
  {
    key: 'cp_safety_violation_count',
    label: '安全生产处罚次数',
    code: 'CP_SAFETY_VIOLATION_COUNT',
    dataType: '计数型',
    valueRange: '0 ~ Infinity',
    description: '统计一定周期内被监管部门处罚或通报的次数。',
    recommendedRuleTypes: ['cumulative', 'interval', 'linear'],
  },
  {
    key: 'cp_emergency_drill_score',
    label: '应急演练达标率',
    code: 'CP_EMERGENCY_DRILL_SCORE',
    dataType: '比例型',
    valueRange: '0 ~ 100',
    description: '反映企业应急演练执行情况与监管要求的达标程度。',
    recommendedRuleTypes: ['ratio', 'linear', 'threshold'],
  },
  {
    key: 'cp_hazard_fix_rate',
    label: '隐患整改完成率',
    code: 'CP_HAZARD_FIX_RATE',
    dataType: '比例型',
    valueRange: '0 ~ 100',
    description: '反映隐患排查后按时完成整改的完成比例。',
    recommendedRuleTypes: ['ratio', 'linear', 'interval'],
  },
];

export const toDataSourceLabel = (option: DataIndicatorOption) => `${option.label} (${option.code})`;

export const findDataIndicatorByDataSource = (dataSource?: string) => {
  if (!dataSource) {
    return DATA_INDICATOR_OPTIONS[0];
  }
  return (
    DATA_INDICATOR_OPTIONS.find((option) => toDataSourceLabel(option) === dataSource || dataSource.includes(option.code)) ||
    DATA_INDICATOR_OPTIONS[0]
  );
};

const uniqueRuleTypes = (types: ConfigurableRuleType[]) => Array.from(new Set(types));

const buildRanges = (list: Array<{ min: number; max: number; scoreRatio: number }>): IntervalRangeRule[] =>
  list.map((item, index) => ({ id: `ai-${index + 1}`, ...item }));

const parseUpperBound = (valueRange: string) => {
  const matches = valueRange.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  const parsed = matches.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  if (parsed.length === 0) {
    return null;
  }
  return Math.max(...parsed);
};

const withRangeIds = (ranges: IntervalRangeRule[], seed: string) =>
  ranges.map((item, index) => ({ ...item, id: `${seed}-r-${index + 1}` }));

const inferDataIndicatorByText = (node: IndicatorNode) => {
  const text = `${node.name} ${node.description || ''} ${node.dataSource || ''}`;
  if (/(认证|证书|资质|签订|制度|预案|责任书)/.test(text)) {
    return DATA_INDICATOR_OPTIONS[0];
  }
  if (/(处罚|违规|违法|事故|失信|次数|件数|事件)/.test(text)) {
    return DATA_INDICATOR_OPTIONS[1];
  }
  if (/(演练|达标率|抽评|合格率|测评)/.test(text)) {
    return DATA_INDICATOR_OPTIONS[2];
  }
  if (/(整改|完成率|投诉|满意度|占比|比例|覆盖率)/.test(text)) {
    return DATA_INDICATOR_OPTIONS[3];
  }
  return DATA_INDICATOR_OPTIONS[0];
};

export const getRuleRecommendation = (params: {
  name: string;
  description: string;
  direction: 'positive' | 'negative';
  dataIndicator: DataIndicatorOption;
}): RuleRecommendation => {
  const { name, description, direction, dataIndicator } = params;
  const text = `${name} ${description} ${dataIndicator.label} ${dataIndicator.code} ${dataIndicator.description}`;
  const isNegative = direction === 'negative';
  const isBooleanData = dataIndicator.dataType.includes('布尔');
  const isRatioData = dataIndicator.dataType.includes('比例');
  const isCountData = dataIndicator.dataType.includes('计数');
  const hasRateKeyword = /(率|比例|占比|完成率|达标率|覆盖率)/.test(text);
  const hasCountKeyword = /(次数|数量|件数|累计|事件|荣誉|奖项)/.test(text);
  const hasBooleanKeyword = /(是否|有无|通过|认证|满足|达标|触发)/.test(text);
  const hasThresholdKeyword = /(阈值|红线|处罚|违规|超标|不低于|不得高于)/.test(text);

  const scoreMap: Record<ConfigurableRuleType, number> = {
    interval: 0,
    threshold: 0,
    linear: 0,
    ratio: 0,
    cumulative: 0,
  };

  dataIndicator.recommendedRuleTypes.forEach((type, index) => {
    scoreMap[type] += 36 - index * 8;
  });

  if (isBooleanData || hasBooleanKeyword) {
    scoreMap.threshold += 28;
    scoreMap.interval += 14;
  }
  if (isRatioData || hasRateKeyword) {
    scoreMap.ratio += 30;
    scoreMap.linear += 18;
    scoreMap.threshold += 10;
  }
  if (isCountData || hasCountKeyword) {
    scoreMap.cumulative += 26;
    scoreMap.interval += 18;
    scoreMap.threshold += 12;
  }
  if (hasThresholdKeyword) {
    scoreMap.threshold += 24;
  }
  if (isNegative) {
    scoreMap.threshold += 15;
    scoreMap.interval += 10;
    scoreMap.cumulative -= 10;
  } else {
    scoreMap.ratio += 8;
  }

  const rankedRuleTypes = uniqueRuleTypes(
    RULE_TYPE_ORDER.slice().sort((a, b) => scoreMap[b] - scoreMap[a] || RULE_TYPE_ORDER.indexOf(a) - RULE_TYPE_ORDER.indexOf(b)),
  );

  const topRuleType = rankedRuleTypes[0] || 'interval';
  const upperBound = parseUpperBound(dataIndicator.valueRange);
  const normalizedUpper = upperBound && upperBound > 0 ? upperBound : isRatioData ? 100 : 10;

  const intervalRanges = isBooleanData
    ? buildRanges(
        isNegative
          ? [
              { min: 0, max: 1, scoreRatio: 100 },
              { min: 1, max: 2, scoreRatio: 0 },
            ]
          : [
              { min: 0, max: 1, scoreRatio: 0 },
              { min: 1, max: 2, scoreRatio: 100 },
            ],
      )
    : isCountData
      ? buildRanges(
          isNegative
            ? [
                { min: 0, max: 1, scoreRatio: 100 },
                { min: 1, max: 3, scoreRatio: 70 },
                { min: 3, max: normalizedUpper * 2, scoreRatio: 20 },
              ]
            : [
                { min: 0, max: 1, scoreRatio: 30 },
                { min: 1, max: 3, scoreRatio: 70 },
                { min: 3, max: normalizedUpper * 2, scoreRatio: 100 },
              ],
        )
      : buildRanges(
          isNegative
            ? [
                { min: 0, max: normalizedUpper * 0.6, scoreRatio: 100 },
                { min: normalizedUpper * 0.6, max: normalizedUpper * 0.85, scoreRatio: 70 },
                { min: normalizedUpper * 0.85, max: normalizedUpper * 1.1, scoreRatio: 30 },
              ]
            : [
                { min: 0, max: normalizedUpper * 0.6, scoreRatio: 60 },
                { min: normalizedUpper * 0.6, max: normalizedUpper * 0.85, scoreRatio: 85 },
                { min: normalizedUpper * 0.85, max: normalizedUpper * 1.1, scoreRatio: 100 },
              ],
        );

  const thresholdRule: ThresholdRuleConfig = isBooleanData
    ? isNegative
      ? { operator: '<=', threshold: 0, passScoreRatio: 100, failScoreRatio: 0 }
      : { operator: '>=', threshold: 1, passScoreRatio: 100, failScoreRatio: 0 }
    : isNegative
      ? { operator: '<=', threshold: Math.round(normalizedUpper * 0.2), passScoreRatio: 100, failScoreRatio: 40 }
      : { operator: '>=', threshold: Math.round(normalizedUpper * 0.8), passScoreRatio: 100, failScoreRatio: 40 };

  const linearRule: LinearRuleConfig = isNegative
    ? { min: 0, max: normalizedUpper, minScoreRatio: 100, maxScoreRatio: 0 }
    : { min: 0, max: normalizedUpper, minScoreRatio: 0, maxScoreRatio: 100 };

  const ratioRule: RatioRuleConfig = {
    targetValue: normalizedUpper,
    floorScoreRatio: 0,
    capScoreRatio: 100,
  };

  const cumulativeRule: CumulativeRuleConfig = {
    unitCount: 1,
    scorePerUnit: hasCountKeyword ? 5 : 10,
    baseScoreRatio: 0,
    maxScoreRatio: 100,
  };

  const reason = isBooleanData
    ? '该指标为布尔/达标特征，优先采用阈值判定。'
    : isCountData
      ? '该指标体现事件次数，优先采用累计计分或区间分档。'
      : isRatioData || hasRateKeyword
        ? '该指标是比例/达标率，优先采用比例折算或线性映射。'
        : '该指标为连续数值特征，建议采用线性或区间评分。';

  return {
    recommendedRuleTypes: rankedRuleTypes,
    topRuleType,
    reason,
    intervalRanges,
    thresholdRule,
    linearRule,
    ratioRule,
    cumulativeRule,
  };
};

const isConfigurableRuleType = (ruleType?: IndicatorNode['ruleType']): ruleType is ConfigurableRuleType =>
  RULE_TYPE_ORDER.includes(ruleType as ConfigurableRuleType);

const recommendLeafNode = (node: IndicatorNode): IndicatorNode => {
  if (node.ruleType === 'formula') {
    return {
      ...node,
      direction: node.direction || 'positive',
    };
  }
  const matchedDataIndicator = node.dataSource
    ? findDataIndicatorByDataSource(node.dataSource)
    : inferDataIndicatorByText(node);
  const recommendation = getRuleRecommendation({
    name: node.name,
    description: node.description || '',
    direction: node.direction || 'positive',
    dataIndicator: matchedDataIndicator,
  });
  const finalRuleType = isConfigurableRuleType(node.ruleType) ? node.ruleType : recommendation.topRuleType;
  return {
    ...node,
    direction: node.direction || 'positive',
    ruleType: finalRuleType,
    dataSource: node.dataSource || toDataSourceLabel(matchedDataIndicator),
    ruleConfig: {
      intervalRanges:
        node.ruleConfig?.intervalRanges && node.ruleConfig.intervalRanges.length > 0
          ? withRangeIds(node.ruleConfig.intervalRanges, node.id)
          : withRangeIds(recommendation.intervalRanges, node.id),
      thresholdRule: node.ruleConfig?.thresholdRule || recommendation.thresholdRule,
      linearRule: node.ruleConfig?.linearRule || recommendation.linearRule,
      ratioRule: node.ruleConfig?.ratioRule || recommendation.ratioRule,
      cumulativeRule: node.ruleConfig?.cumulativeRule || recommendation.cumulativeRule,
    },
  };
};

const mapIndicatorTree = (nodes: IndicatorNode[]): IndicatorNode[] =>
  nodes.map((node) => {
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: mapIndicatorTree(node.children),
      };
    }
    return recommendLeafNode(node);
  });

export const applyAutoRecommendationToModel = (model: CreditEvalModel): CreditEvalModel => ({
  ...model,
  indicators: mapIndicatorTree(model.indicators),
});
