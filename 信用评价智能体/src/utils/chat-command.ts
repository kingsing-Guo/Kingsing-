import type {
  AppPhase,
  CreditEvalModel,
  DocumentStep,
  IndicatorNode,
  PublishSettings,
  ResultActiveTab,
  ResultListFilters,
  ValidationSettings,
  ValidationStep,
} from '../types/model';
import { exportModelAsCsv, exportModelAsExcel } from './model-export';
import { BEIJING_HEATING_VALIDATION_DATASET } from '../mock/beijing-heating-data';

interface ExecuteChatCommandParams {
  input: string;
  modelSnapshot: CreditEvalModel | null;
  setModelSnapshot: (model: CreditEvalModel) => void;
  currentPhase: AppPhase;
  setPhase: (phase: AppPhase) => void;
  validationStep: ValidationStep;
  setValidationStep: (step: ValidationStep) => void;
  updateValidationSettings: (settings: Partial<ValidationSettings>) => void;
  setResultActiveTab: (tab: ResultActiveTab) => void;
  updateResultListFilters: (filters: Partial<ResultListFilters>) => void;
  resetResultListFilters: () => void;
  updatePublishSettings: (settings: Partial<PublishSettings>) => void;
  setDocumentStep: (step: DocumentStep) => void;
  requestPublishConfirm: () => void;
  renameActiveProject: (name: string) => void;
}

interface ExecuteChatCommandResult {
  handled: boolean;
  reply?: string;
}

const GRADE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];
const INDUSTRY_OPTIONS = ['交通运输', '环境保护', '公共事业', '养老服务', '家政服务', '医疗健康', '教育培训'] as const;

const normalizeModelName = (rawName: string) =>
  rawName
    .replace(/^[\s"'“”‘’《》【】]+|[\s"'“”‘’《》【】]+$/g, '')
    .replace(/[。；;]+$/g, '')
    .trim();

const normalizeCompareText = (text: string) => text.replace(/\s+/g, '').replace(/[“”"'`]/g, '').trim().toLowerCase();
const splitSegments = (input: string) =>
  input
    .split(/[，。；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const stripPromptPrefix = (text: string) => text.replace(/^(请|请帮我|帮我|麻烦|把|将)\s*/, '');
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeGradeName = (name: string) =>
  name
    .replace(/(评分)?等级$/g, '')
    .replace(/级$/g, '')
    .trim()
    .toUpperCase();

const getNextGradeLabel = (levels: CreditEvalModel['gradeLevels']) => {
  const letterSet = new Set(
    levels
      .map((item) => normalizeGradeName(item.name))
      .filter((item) => /^[A-Z]$/.test(item)),
  );
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let idx = 0; idx < letters.length; idx += 1) {
    const letter = letters[idx];
    if (!letterSet.has(letter)) {
      return letter;
    }
  }
  return `L${levels.length + 1}`;
};

const isInvalidGradeName = (name: string) =>
  /(增加|新增|添加|删除|移除|去掉|取消|一个|一项|一级|一档|等级|评分|级别)/.test(name);

const createRuleId = (prefix: 'b' | 'g' | 'v') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const sortGradeLevels = (model: CreditEvalModel) => ({
  ...model,
  gradeLevels: [...model.gradeLevels].sort((a, b) => b.minScore - a.minScore),
});

const scaleGradeLevels = (levels: CreditEvalModel['gradeLevels'], factor: number, cap: number) =>
  levels.map((item) => ({
    ...item,
    minScore: Math.max(0, Math.min(cap, Math.round(item.minScore * factor))),
  }));

const findByNameFuzzy = <T extends { name: string }>(items: T[], rawName: string): T | null => {
  const target = normalizeCompareText(rawName);
  const exact = items.find((item) => normalizeCompareText(item.name) === target);
  return (
    exact ||
    items.find(
      (item) =>
        normalizeCompareText(item.name).includes(target) || target.includes(normalizeCompareText(item.name)),
    ) ||
    null
  );
};

const rebalanceRootWeights = (
  indicators: IndicatorNode[],
  publicIndicatorId: string,
  publicWeight: number,
): IndicatorNode[] => {
  const others = indicators.filter((item) => item.id !== publicIndicatorId);
  if (others.length === 0) {
    return indicators.map((node) =>
      node.id === publicIndicatorId ? { ...node, weight: publicWeight, score: publicWeight } : node,
    );
  }

  const remaining = Math.max(0, 100 - publicWeight);
  const totalOtherWeight = others.reduce((sum, item) => sum + item.weight, 0);
  const mappedWeights: Record<string, number> = {};

  if (totalOtherWeight <= 0) {
    const base = Math.floor(remaining / others.length);
    let left = remaining - base * others.length;
    others.forEach((item) => {
      const extra = left > 0 ? 1 : 0;
      if (left > 0) {
        left -= 1;
      }
      mappedWeights[item.id] = base + extra;
    });
  } else {
    const raw = others.map((item) => {
      const exact = (item.weight / totalOtherWeight) * remaining;
      return { id: item.id, base: Math.floor(exact), frac: exact - Math.floor(exact) };
    });
    let left = remaining - raw.reduce((sum, item) => sum + item.base, 0);
    raw.sort((a, b) => b.frac - a.frac).forEach((item) => {
      mappedWeights[item.id] = item.base;
    });

    let idx = 0;
    while (left > 0 && raw.length > 0) {
      const id = raw[idx % raw.length].id;
      mappedWeights[id] += 1;
      left -= 1;
      idx += 1;
    }
  }

  return indicators.map((node) => {
    if (node.id === publicIndicatorId) {
      return { ...node, weight: publicWeight, score: publicWeight };
    }
    const nextWeight = mappedWeights[node.id] ?? node.weight;
    return { ...node, weight: nextWeight, score: nextWeight };
  });
};

const parseScoreMode = (input: string): 100 | 1000 | null => {
  const normalized = input.replace(/\s+/g, '');
  const hasModeWord = /(评分制|评分机制|计分制|分值制|制式|百分制|千分制|100分制|1000分制|100制|1000制)/.test(normalized);
  const hasActionWord = /(改|调|切换|设置|设为|改为|调整|转换|变成|切到|切成|使用|采用)/.test(normalized);
  if (!hasModeWord) {
    return null;
  }

  const directTarget = normalized.match(/(?:改为|设为|设置为|切到|切成|调整为|变成|采用|使用)(千分制|1000分制|1000制|百分制|100分制|100制)/);
  if (directTarget?.[1]) {
    return /千分|1000/.test(directTarget[1]) ? 1000 : 100;
  }

  if (/千分制|1000分制|1000制/.test(normalized)) {
    return 1000;
  }
  if (/百分制|100分制|100制/.test(normalized)) {
    return 100;
  }
  if (!hasActionWord) {
    return null;
  }
  return null;
};

const findGradeByName = (model: CreditEvalModel, rawName: string) => {
  const targetName = normalizeGradeName(rawName);
  return model.gradeLevels.find((item) => normalizeGradeName(item.name) === targetName) || null;
};

const extractModelName = (input: string) => {
  const patterns = [
    /(?:把|将)?(?:评价)?(?:模型|指标体系)?(?:名称|名字|名)(?:修改|改|调整|设置)?(?:为|成|叫|设为|设置为)\s*[“"']?([^"”'’\n，。；;]+)/,
    /(?:把|将)\s*[“"']?([^"”'’\n，。；;]+)\s*[”"']?(?:作为|设为|设置为)(?:模型|指标体系)(?:名称|名字|名)/,
    /(?:模型|指标体系)(?:命名为|叫做|叫)\s*[“"']?([^"”'’\n，。；;]+)/,
  ];

  for (const pattern of patterns) {
    const matched = input.match(pattern);
    if (matched?.[1]) {
      const nextName = normalizeModelName(matched[1]);
      if (nextName) {
        return nextName;
      }
    }
  }

  if (/(模型|指标体系)/.test(input) && /(名称|名字|名|命名|叫)/.test(input)) {
    const generic = input.match(/(?:改为|设置为|设为|命名为|叫做|叫|名称为)\s*[“"']?([^"”'’，。；;\n]+)/);
    if (generic?.[1]) {
      const nextName = normalizeModelName(generic[1]);
      if (nextName) {
        return nextName;
      }
    }
  }
  return null;
};

const parsePublicCreditWeight = (input: string): number | null => {
  const normalized = input.replace(/\s+/g, '');
  const hasTarget = /(公共信用综合评价|公共信用评价|公共信用)/.test(normalized);
  const hasWeightWord = /(权重|占比|比例)/.test(normalized);
  const hasAction = /(改|调|切换|设置|设为|改为|调整|变成|设到|到)/.test(normalized);
  if (!(hasTarget && hasWeightWord && hasAction)) {
    return null;
  }

  const patterns = [
    /(?:公共信用综合评价|公共信用评价|公共信用)(?:权重|占比|比例)(?:改为|调整为|设为|设置为|到|成)?(\d{1,3})%?/,
    /(?:改为|调整为|设为|设置为|到|成)(\d{1,3})%?(?:的)?(?:公共信用综合评价|公共信用)(?:权重|占比|比例)?/,
    /(?:公共信用综合评价|公共信用评价|公共信用).{0,12}?(\d{1,3})%/,
  ];

  for (const pattern of patterns) {
    const matched = normalized.match(pattern);
    if (matched?.[1]) {
      return Number(matched[1]);
    }
  }

  const loose = normalized.match(/(\d{1,3})%?/);
  if (loose?.[1]) {
    return Number(loose[1]);
  }
  return null;
};

const parseSampleCount = (input: string): number | null => {
  if (!/(样本量|样本数|抽样数|抽签总数|企业数)/.test(input)) {
    return null;
  }
  const matched = input.match(/(\d{1,6})/);
  if (!matched?.[1]) {
    return null;
  }
  return Math.max(1, Math.min(100000, Number(matched[1])));
};

const parseIndustry = (input: string): string | null => {
  if (/所有行业|全部行业|全行业/.test(input)) {
    return 'all';
  }
  const matched = INDUSTRY_OPTIONS.find((item) => input.includes(item));
  return matched || null;
};

const parseDateText = (input: string): number | null => {
  const matched = input.match(/(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?/);
  if (!matched) {
    return null;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const parseValidityPeriod = (input: string): PublishSettings['validityPeriod'] | null => {
  const digitMatch = input.match(/有效期[^0-9一二三两]*([123])\s*年?/);
  if (digitMatch?.[1]) {
    return digitMatch[1] as PublishSettings['validityPeriod'];
  }
  if (/有效期.*(一年|1年)/.test(input)) {
    return '1';
  }
  if (/有效期.*(二年|两年|2年)/.test(input)) {
    return '2';
  }
  if (/有效期.*(三年|3年)/.test(input)) {
    return '3';
  }
  return null;
};

const detectExportIntent = (input: string) => {
  const normalized = input.toLowerCase();
  const hasExportVerb = /(导出|导成|输出|下载|转成|转为|转换)/.test(input);
  const wantsExcel = hasExportVerb && /(excel|xlsx|xls|表格)/i.test(normalized);
  const wantsCsv = hasExportVerb && /csv/i.test(normalized);
  return {
    wantsExcel,
    wantsCsv,
  };
};

const addBonusRuleByText = (input: string, model: CreditEvalModel) => {
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];

  const segments = splitSegments(input);

  segments.forEach((segment) => {
    const hasBonusKeyword = /(加分项|加分规则)/.test(segment);
    const hasAddAction = /(增加|新增|添加|加一项|加一条|加一个)/.test(segment);
    if (!hasBonusKeyword || !hasAddAction) {
      return;
    }

    const scoreMatch = segment.match(/(?:加分|分值|分数|加)?\s*\+?(-?\d{1,3})\s*分?/);
    const score = Math.max(1, Math.min(100, Number(scoreMatch?.[1] || 5)));

    const name = segment
      .replace(/^(请|请帮我|帮我|麻烦|把|将)/, '')
      .replace(/(?:加分项|加分规则)(?:里|中)?(?:增加|新增|添加)(?:一个|一项|一条)?/g, '')
      .replace(/(?:增加|新增|添加)(?:一个|一项|一条)?(?:加分项|加分规则)/g, '')
      .replace(/(?:增加|新增|添加)(?:一个|一项|一条)?/g, '')
      .replace(/(?:加分|分值|分数|加)?\s*\+?-?\d{1,3}\s*分?/g, '')
      .replace(/^(为|:|：)\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name) {
      matchedAny = true;
      replies.push('加分项新增失败：请提供加分项名称。');
      return;
    }

    matchedAny = true;
    nextModel = {
      ...nextModel,
      bonusRules: [...nextModel.bonusRules, { id: createRuleId('b'), name, score }],
    };
    replies.push(`已新增加分项「${name}」(+${score})`);
  });

  if (!matchedAny) {
    const fallbackPatterns = [
      /(?:增加|新增|添加)(?:一个|一项|一条)?(?:加分项|加分规则)(?:为|：|:)?\s*([^\n，。；;]+)/,
      /(?:加分项|加分规则)(?:里|中)?(?:增加|新增|添加)(?:一个|一项|一条)?(?:为|：|:)?\s*([^\n，。；;]+)/,
    ];
    for (const pattern of fallbackPatterns) {
      const matched = input.match(pattern);
      if (!matched?.[1]) {
        continue;
      }
      const rawText = matched[1].trim();
      const scoreMatch = rawText.match(/(?:加分|分值|分数|加)?\s*\+?(-?\d{1,3})\s*分?/);
      const score = Math.max(1, Math.min(100, Number(scoreMatch?.[1] || 5)));
      const name = rawText
        .replace(/(?:加分|分值|分数|加)?\s*\+?-?\d{1,3}\s*分?/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!name) {
        matchedAny = true;
        replies.push('加分项新增失败：请提供加分项名称。');
        break;
      }
      matchedAny = true;
      nextModel = {
        ...nextModel,
        bonusRules: [...nextModel.bonusRules, { id: createRuleId('b'), name, score }],
      };
      replies.push(`已新增加分项「${name}」(+${score})`);
      break;
    }
  }

  return { matchedAny, nextModel, replies };
};

const deleteBonusRuleByText = (input: string, model: CreditEvalModel) => {
  if (/(筛选|过滤)/.test(input)) {
    return { matchedAny: false, nextModel: model, replies: [] as string[] };
  }
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];
  const segments = splitSegments(input);

  const findBonusRule = (name: string) => {
    const target = normalizeCompareText(name);
    const exact = nextModel.bonusRules.find((item) => normalizeCompareText(item.name) === target);
    return (
      exact ||
      nextModel.bonusRules.find(
        (item) =>
          normalizeCompareText(item.name).includes(target) || target.includes(normalizeCompareText(item.name)),
      ) ||
      null
    );
  };

  for (let idx = 0; idx < segments.length; idx += 1) {
    const segment = segments[idx];
    const hasBonusKeyword = /(加分项|加分规则)/.test(segment);
    const hasDeleteAction = /(删除|移除|去掉|取消)/.test(segment);
    if (!hasBonusKeyword || !hasDeleteAction) {
      continue;
    }

    let name = segment
      .replace(/^(请|请帮我|帮我|麻烦|把|将)/, '')
      .replace(/(?:加分项|加分规则)(?:里|中)?(?:删除|移除|去掉|取消)(?:一个|一项|一条)?/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一项|一条)?(?:加分项|加分规则)/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一项|一条)?/g, '')
      .replace(/^(为|是|:|：)\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name && idx + 1 < segments.length) {
      name = segments[idx + 1].replace(/^(为|是|:|：)\s*/, '').trim();
      idx += 1;
    }

    matchedAny = true;
    if (!name) {
      replies.push('加分项删除失败：请提供要删除的加分项名称。');
      continue;
    }

    const targetRule = findBonusRule(name);
    if (!targetRule) {
      replies.push(`未找到加分项「${name}」，未执行删除。`);
      continue;
    }

    nextModel = {
      ...nextModel,
      bonusRules: nextModel.bonusRules.filter((item) => item.id !== targetRule.id),
    };
    replies.push(`已删除加分项「${targetRule.name}」`);
  }

  if (!matchedAny) {
    const fallbackPatterns = [
      /(?:删除|移除|去掉|取消)(?:一个|一项|一条)?(?:加分项|加分规则)(?:为|是|：|:|，|,)?\s*([^\n，。；;]+)/,
      /(?:加分项|加分规则)(?:里|中)?(?:删除|移除|去掉|取消)(?:一个|一项|一条)?(?:为|是|：|:|，|,)?\s*([^\n，。；;]+)/,
    ];

    for (const pattern of fallbackPatterns) {
      const matched = input.match(pattern);
      if (!matched?.[1]) {
        continue;
      }
      const name = matched[1].trim();
      matchedAny = true;
      if (!name) {
        replies.push('加分项删除失败：请提供要删除的加分项名称。');
        break;
      }
      const targetRule = findBonusRule(name);
      if (!targetRule) {
        replies.push(`未找到加分项「${name}」，未执行删除。`);
        break;
      }
      nextModel = {
        ...nextModel,
        bonusRules: nextModel.bonusRules.filter((item) => item.id !== targetRule.id),
      };
      replies.push(`已删除加分项「${targetRule.name}」`);
      break;
    }
  }

  return { matchedAny, nextModel, replies };
};

const addVetoRuleByText = (input: string, model: CreditEvalModel) => {
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];

  const segments = splitSegments(input);
  segments.forEach((segment) => {
    const hasVetoKeyword = /(否决项|否决规则|一票否决)/.test(segment);
    const hasAddAction = /(增加|新增|添加|加一项|加一条|加一个)/.test(segment);
    if (!hasVetoKeyword || !hasAddAction) {
      return;
    }
    let name = stripPromptPrefix(segment)
      .replace(/(?:否决项|否决规则|一票否决)(?:里|中)?(?:增加|新增|添加)(?:一个|一项|一条)?/g, '')
      .replace(/(?:增加|新增|添加)(?:一个|一项|一条)?(?:否决项|否决规则|一票否决)/g, '')
      .replace(/(?:增加|新增|添加)(?:一个|一项|一条)?/g, '')
      .replace(/^(为|是|:|：)\s*/, '')
      .trim();
    const descMatch = name.match(/(?:说明|描述|备注)[:：]?\s*(.+)$/);
    const description = descMatch?.[1]?.trim();
    if (descMatch) {
      name = name.slice(0, descMatch.index).trim();
    }

    matchedAny = true;
    if (!name) {
      replies.push('否决项新增失败：请提供否决规则名称。');
      return;
    }

    nextModel = {
      ...nextModel,
      vetoRules: [
        ...nextModel.vetoRules,
        {
          id: createRuleId('v'),
          name,
          description: description || '未填写规则说明',
        },
      ],
    };
    replies.push(`已新增否决项「${name}」`);
  });

  return { matchedAny, nextModel, replies };
};

const deleteVetoRuleByText = (input: string, model: CreditEvalModel) => {
  if (/(筛选|过滤)/.test(input)) {
    return { matchedAny: false, nextModel: model, replies: [] as string[] };
  }
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];
  const segments = splitSegments(input);

  for (let idx = 0; idx < segments.length; idx += 1) {
    const segment = segments[idx];
    const hasVetoKeyword = /(否决项|否决规则|一票否决)/.test(segment);
    const hasDeleteAction = /(删除|移除|去掉|取消)/.test(segment);
    if (!hasVetoKeyword || !hasDeleteAction) {
      continue;
    }

    let name = stripPromptPrefix(segment)
      .replace(/(?:否决项|否决规则|一票否决)(?:里|中)?(?:删除|移除|去掉|取消)(?:一个|一项|一条)?/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一项|一条)?(?:否决项|否决规则|一票否决)/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一项|一条)?/g, '')
      .replace(/^(为|是|:|：)\s*/, '')
      .trim();

    if (!name && idx + 1 < segments.length) {
      name = segments[idx + 1].replace(/^(为|是|:|：)\s*/, '').trim();
      idx += 1;
    }

    matchedAny = true;
    if (!name) {
      replies.push('否决项删除失败：请提供要删除的否决项名称。');
      continue;
    }

    const target = findByNameFuzzy(nextModel.vetoRules, name);
    if (!target) {
      replies.push(`未找到否决项「${name}」，未执行删除。`);
      continue;
    }

    nextModel = {
      ...nextModel,
      vetoRules: nextModel.vetoRules.filter((item) => item.id !== target.id),
    };
    replies.push(`已删除否决项「${target.name}」`);
  }

  return { matchedAny, nextModel, replies };
};

const addGradeLevelByText = (input: string, model: CreditEvalModel) => {
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];
  const segments = splitSegments(input);

  segments.forEach((segment) => {
    const hasGradeKeyword = /(等级|评分等级)/.test(segment);
    const hasAddAction = /(增加|新增|添加|加一档|加一级|新增一档|新增一级)/.test(segment);
    if (!hasGradeKeyword || !hasAddAction) {
      return;
    }

    const scoreMatch = segment.match(/(?:最低分|分值|分数线|阈值|起评分)?\s*(\d{1,4})/);
    const score = Math.max(0, Math.min(nextModel.totalScoreMode, Number(scoreMatch?.[1] || 0)));
    const compact = segment.replace(/\s+/g, '');
    const englishNamePatterns = [
      /(?:增加|新增|添加)(?:一个|一项|一条|一档|一级)?(?:评分)?等级(?:为|是|:|：)?([A-Za-z][A-Za-z0-9+-]*)/,
      /(?:评分)?等级(?:增加|新增|添加|加)?(?:一个|一项|一条|一档|一级)?(?:为|是|:|：)?([A-Za-z][A-Za-z0-9+-]*)/,
      /(?:评分)?等级(?:为|是|命名为|叫做|叫|:|：)([A-Za-z][A-Za-z0-9+-]*)/,
      /(?:等级|级)(?:增加|新增|添加|加)?(?:一个|一项|一条|一档|一级)?(?:为|是|:|：)?([A-Za-z][A-Za-z0-9+-]*)$/,
    ];
    const chineseNamePatterns = [
      /(?:评分)?等级(?:为|是|命名为|叫做|叫|:|：)([\u4e00-\u9fa5]{1,8})/,
      /(?:增加|新增|添加)(?:一个|一项|一条|一档|一级)?(?:评分)?等级(?:为|是|:|：)?([\u4e00-\u9fa5]{1,8})$/,
    ];

    let name = '';
    for (const pattern of englishNamePatterns) {
      const matched = compact.match(pattern);
      const candidate = matched?.[1]?.trim() || '';
      if (candidate) {
        name = candidate;
        break;
      }
    }
    if (!name) {
      for (const pattern of chineseNamePatterns) {
        const matched = compact.match(pattern);
        const candidate = matched?.[1]?.trim() || '';
        if (candidate && !isInvalidGradeName(candidate)) {
          name = candidate;
          break;
        }
      }
    }
    if (name && isInvalidGradeName(name)) {
      name = '';
    }
    if (!name) {
      name = getNextGradeLabel(nextModel.gradeLevels);
    }

    matchedAny = true;
    const duplicated = nextModel.gradeLevels.find(
      (item) => normalizeGradeName(item.name) === normalizeGradeName(name),
    );
    if (duplicated) {
      replies.push(`等级「${name}」已存在，未重复新增。`);
      return;
    }

    nextModel = sortGradeLevels({
      ...nextModel,
      gradeLevels: [
        ...nextModel.gradeLevels,
        {
          id: createRuleId('g'),
          name,
          minScore: score,
          color: GRADE_COLORS[nextModel.gradeLevels.length % GRADE_COLORS.length],
        },
      ],
    });
    replies.push(`已新增等级「${name}」(最低分 ${score})`);
  });

  return { matchedAny, nextModel, replies };
};

const deleteGradeLevelByText = (input: string, model: CreditEvalModel) => {
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];
  const segments = splitSegments(input);

  segments.forEach((segment) => {
    const hasGradeKeyword = /(等级|评分等级)/.test(segment);
    const hasDeleteAction = /(删除|移除|去掉|取消)/.test(segment);
    if (!hasGradeKeyword || !hasDeleteAction) {
      return;
    }
    matchedAny = true;

    if (nextModel.gradeLevels.length <= 2) {
      replies.push('等级删除失败：至少需要保留 2 个等级。');
      return;
    }

    let name = stripPromptPrefix(segment)
      .replace(/(?:等级|评分等级)(?:里|中)?(?:删除|移除|去掉|取消)(?:一个|一档|一级)?/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一档|一级)?(?:等级|评分等级)/g, '')
      .replace(/(?:删除|移除|去掉|取消)(?:一个|一档|一级)?/g, '')
      .replace(/^(为|是|:|：)\s*/, '')
      .trim();
    if (!name) {
      const alias = segment.match(/([A-Za-z][A-Za-z0-9+-]*|[\u4e00-\u9fa5]{1,8})/);
      name = alias?.[1] || '';
    }

    if (!name) {
      replies.push('等级删除失败：请提供要删除的等级名称。');
      return;
    }

    const target = findGradeByName(nextModel, name);
    if (!target) {
      replies.push(`未找到等级「${name}」，未执行删除。`);
      return;
    }

    nextModel = sortGradeLevels({
      ...nextModel,
      gradeLevels: nextModel.gradeLevels.filter((item) => item.id !== target.id),
    });
    replies.push(`已删除等级「${target.name}」`);
  });

  return { matchedAny, nextModel, replies };
};

const updateGradeScoreByText = (input: string, model: CreditEvalModel) => {
  let matchedAny = false;
  let nextModel = model;
  const replies: string[] = [];
  const segments = splitSegments(input);

  const findGradeInSegment = (segment: string) => {
    for (const gradeLevel of nextModel.gradeLevels) {
      const normalized = normalizeGradeName(gradeLevel.name);
      if (!normalized) {
        continue;
      }
      const escaped = escapeRegExp(normalized);
      const patterns = [
        new RegExp(`(?:等级|级)\\s*${escaped}(?![A-Za-z0-9])`, 'i'),
        new RegExp(`${escaped}\\s*(?:等级|级)`, 'i'),
        normalized.length === 1 ? new RegExp(`\\b${escaped}\\b`, 'i') : new RegExp(escaped, 'i'),
      ];
      if (patterns.some((pattern) => pattern.test(segment))) {
        return gradeLevel;
      }
    }
    return null;
  };

  segments.forEach((segment) => {
    const target = findGradeInSegment(segment);
    if (!target) {
      return;
    }

    const scoreList = segment.match(/\d{1,4}/g);
    if (!scoreList || scoreList.length === 0) {
      return;
    }

    const score = Math.max(0, Math.min(nextModel.totalScoreMode, Number(scoreList[scoreList.length - 1] || 0)));
    matchedAny = true;
    nextModel = sortGradeLevels({
      ...nextModel,
      gradeLevels: nextModel.gradeLevels.map((item) =>
        item.id === target.id ? { ...item, minScore: score } : item,
      ),
    });
    replies.push(`已将等级「${target.name}」最低分调整为 ${score}`);
  });

  return { matchedAny, nextModel, replies };
};

const handleWorkflowCommands = (
  input: string,
  params: Pick<
    ExecuteChatCommandParams,
    | 'currentPhase'
    | 'setPhase'
    | 'validationStep'
    | 'setValidationStep'
    | 'updateValidationSettings'
    | 'setResultActiveTab'
    | 'updateResultListFilters'
    | 'resetResultListFilters'
    | 'updatePublishSettings'
    | 'setDocumentStep'
    | 'requestPublishConfirm'
  >,
) => {
  const replies: string[] = [];
  let matchedAny = false;

  const {
    currentPhase,
    setPhase,
    validationStep,
    setValidationStep,
    updateValidationSettings,
    setResultActiveTab,
    updateResultListFilters,
    resetResultListFilters,
    updatePublishSettings,
    setDocumentStep,
    requestPublishConfirm,
  } = params;

  const normalized = input.replace(/\s+/g, '');

  const wantsValidationPhase =
    /(开始|进入|去|到|执行|发起|启动|重新|重跑|再跑).*(验算|试算|校验|跑批)/.test(input) ||
    /(验算|试算|校验).*(开始|执行|发起|启动|重新|重跑)/.test(input);
  if (wantsValidationPhase) {
    matchedAny = true;
    if (currentPhase !== 'VALIDATING') {
      setPhase('VALIDATING');
    }
    if (validationStep === 'idle') {
      setValidationStep('checking');
      replies.push('已进入模型验算，并开始配置检查。');
    } else {
      replies.push('已切换到模型验算阶段。');
    }
  }

  const wantsStartComputing = /(开始|执行|启动|运行|重跑|再跑).*(验算|试算|跑批)/.test(input);
  if (wantsStartComputing && (currentPhase === 'VALIDATING' || currentPhase === 'RESULT')) {
    matchedAny = true;
    setPhase('VALIDATING');
    if (validationStep === 'data_selection' || validationStep === 'result' || currentPhase === 'RESULT') {
      setValidationStep('computing');
      replies.push('已开始执行模型验算跑批。');
    }
  }

  const sampleCount = parseSampleCount(input);
  if (sampleCount !== null) {
    matchedAny = true;
    updateValidationSettings({ sampleCount });
    replies.push(`已将验算样本量设置为 ${sampleCount} 家。`);
  }

  const industry = parseIndustry(input);
  if (
    industry &&
    (/(行业)/.test(input) || /(样本|验算|数据源|抽样)/.test(input))
  ) {
    matchedAny = true;
    updateValidationSettings({ industry });
    replies.push(`已将验算行业设置为${industry === 'all' ? '所有行业' : `「${industry}」`}。`);
  }

  if (
    /(数据源|验算数据|抽样模式|验算模式)/.test(input) ||
    /(切换|改为|设为|设置为|使用).*(湖仓|数据库|抽样|本地|上传|导入|文件)/.test(input)
  ) {
    if (/(湖仓|数据库|抽样)/.test(input)) {
      matchedAny = true;
      updateValidationSettings({
        mode: 'database',
        importedDatasetId: null,
        importedFileName: '',
        importedRecordCount: 0,
      });
      replies.push('已切换验算数据源为湖仓随机抽样。');
    } else if (/(本地|上传|导入|文件)/.test(input)) {
      matchedAny = true;
      updateValidationSettings({ mode: 'import' });
      replies.push('已切换验算数据源为本地上传导入。');
    }
  }

  if (
    /(北京|北京市).*(供热|热力).*(名单|企业|样本|95)|北京市热力公司|使用北京市95家供热企业样本|95家供热企业样本/.test(
      normalized,
    )
  ) {
    matchedAny = true;
    setPhase('VALIDATING');
    if (validationStep === 'idle') {
      setValidationStep('data_selection');
    }
    updateValidationSettings({
      mode: 'import',
      importedDatasetId: BEIJING_HEATING_VALIDATION_DATASET.id,
      importedFileName: BEIJING_HEATING_VALIDATION_DATASET.fileName,
      importedRecordCount: BEIJING_HEATING_VALIDATION_DATASET.enterprises.length,
      sampleCount: BEIJING_HEATING_VALIDATION_DATASET.enterprises.length,
    });
    replies.push(
      `已载入北京市供热企业名单样本，共 ${BEIJING_HEATING_VALIDATION_DATASET.enterprises.length} 家，并切换到验算准备页。`,
    );
  }

  if (/(企业规模|规模标签)/.test(input) && /(按|用|设置|切换|改为|选择)/.test(input)) {
    matchedAny = true;
    updateValidationSettings({ selectedAttributeCombo: 'scale', selectedAttributeValues: [] });
    replies.push('已将抽样分类属性切换为企业规模。');
  } else if (/(企业性质|性质标签)/.test(input) && /(按|用|设置|切换|改为|选择)/.test(input)) {
    matchedAny = true;
    updateValidationSettings({ selectedAttributeCombo: 'nature', selectedAttributeValues: [] });
    replies.push('已将抽样分类属性切换为企业性质。');
  }

  const wantsResultPhase =
    /(结果分析|分析结果|查看结果|验算结果|结果页)/.test(input) &&
    /(进入|去|打开|查看|切换|展示|看)/.test(input);
  if (wantsResultPhase) {
    matchedAny = true;
    setPhase('RESULT');
    setValidationStep('result');
    replies.push('已切换到结果分析阶段。');
  }

  const wantsKsTab = /(ks|区分度)/i.test(input) && /(切|看|查看|到|去|展示|打开)/.test(input);
  const wantsDistTab = /(分布|直方图|分数分布)/.test(input) && /(切|看|查看|到|去|展示|打开)/.test(input);
  const wantsListTab = /(企业列表|企业名单|列表视图|名单视图)/.test(input) && /(切|看|查看|到|去|展示|打开)/.test(input);

  if (wantsKsTab || wantsDistTab || wantsListTab) {
    matchedAny = true;
    setPhase('RESULT');
    setValidationStep('result');
    if (wantsKsTab) {
      setResultActiveTab('ks');
      replies.push('已切换到 K-S 区分度分析。');
    } else if (wantsDistTab) {
      setResultActiveTab('dist');
      replies.push('已切换到分数分布特征。');
    } else {
      setResultActiveTab('list');
      replies.push('已切换到企业列表视图。');
    }
  }

  if (/(重置筛选|清空筛选|取消筛选|显示全部企业)/.test(input)) {
    matchedAny = true;
    resetResultListFilters();
    replies.push('已重置企业列表筛选条件。');
  } else {
    const vetoOn = /(只看|仅看|筛选|过滤).*(否决项)/.test(input) && !/(取消|清除|关闭|去掉)/.test(input);
    const vetoOff = /(取消|清除|关闭|去掉).*(否决项).*(筛选|过滤)?/.test(input);
    if (vetoOn) {
      matchedAny = true;
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ vetoOnly: true });
      replies.push('已筛选为仅显示有否决项的企业。');
    } else if (vetoOff) {
      matchedAny = true;
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ vetoOnly: false });
      replies.push('已取消否决项筛选。');
    }

    const bonusOn = /(只看|仅看|筛选|过滤).*(加分项)/.test(input) && !/(取消|清除|关闭|去掉)/.test(input);
    const bonusOff = /(取消|清除|关闭|去掉).*(加分项).*(筛选|过滤)?/.test(input);
    if (bonusOn) {
      matchedAny = true;
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ bonusOnly: true });
      replies.push('已筛选为仅显示有加分项的企业。');
    } else if (bonusOff) {
      matchedAny = true;
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ bonusOnly: false });
      replies.push('已取消加分项筛选。');
    }

    const gradeMatch = input.match(/(?:只看|仅看|筛选|过滤).*(A|B|C|D|E|F)\s*级/i);
    if (gradeMatch?.[1]) {
      matchedAny = true;
      const grade = gradeMatch[1].toUpperCase();
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ grade });
      replies.push(`已筛选为仅显示 ${grade} 级企业。`);
    } else if (/(取消|清除|恢复).*(等级|评级).*(筛选|过滤)|显示全部等级/.test(input)) {
      matchedAny = true;
      setPhase('RESULT');
      setValidationStep('result');
      setResultActiveTab('list');
      updateResultListFilters({ grade: 'all' });
      replies.push('已取消等级筛选。');
    }
  }

  if (/(上线发布|发布阶段|发布页面|进入发布)/.test(input)) {
    matchedAny = true;
    setPhase('PUBLISH');
    replies.push('已切换到上线发布阶段。');
  }

  const versionMatch = input.match(/(?:版本(?:号)?)(?:改为|设为|设置为|更新为|为)?\s*([Vv]?\d+(?:\.\d+)*)/);
  if (versionMatch?.[1]) {
    matchedAny = true;
    const version = versionMatch[1].startsWith('V') || versionMatch[1].startsWith('v')
      ? `V${versionMatch[1].slice(1)}`
      : `V${versionMatch[1]}`;
    updatePublishSettings({ version });
    replies.push(`已将发布版本设置为 ${version}。`);
  }

  const effectiveDate = parseDateText(input);
  if (effectiveDate && /(生效日期|启用时间|生效时间|发布日期)/.test(input)) {
    matchedAny = true;
    updatePublishSettings({ effectiveDate });
    const date = new Date(effectiveDate);
    replies.push(`已将生效日期设置为 ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}。`);
  }

  const validityPeriod = parseValidityPeriod(input);
  if (validityPeriod) {
    matchedAny = true;
    updatePublishSettings({ validityPeriod });
    replies.push(`已将有效期设置为 ${validityPeriod} 年。`);
  }

  if (/(确认发布|立即发布|执行发布|确认并发布|发布确认|确认上线|正式发布)/.test(input)) {
    matchedAny = true;
    setPhase('PUBLISH');
    requestPublishConfirm();
    replies.push('已触发确认发布流程。');
  }

  if (/(生成管理办法|管理办法|文档生成|文档阶段|进入文档)/.test(input)) {
    matchedAny = true;
    setPhase('DOCUMENT');
    replies.push('已切换到管理办法生成阶段。');
  }

  if (/(模板选择|选择模板|返回模板)/.test(input)) {
    matchedAny = true;
    setPhase('DOCUMENT');
    setDocumentStep('template_selection');
    replies.push('已切换到模板选择。');
  } else if (/(开始生成|启动撰写|生成文档|开始撰写)/.test(input)) {
    matchedAny = true;
    setPhase('DOCUMENT');
    setDocumentStep('generating');
    replies.push('已开始生成管理办法文档。');
  } else if (/(预览文档|查看文档|打开预览|文档预览)/.test(input)) {
    matchedAny = true;
    setPhase('DOCUMENT');
    setDocumentStep('preview');
    replies.push('已打开文档预览。');
  }

  if (/(导出word|下载word|导出文档)/i.test(normalized)) {
    matchedAny = true;
    setPhase('DOCUMENT');
    setDocumentStep('preview');
    replies.push('已进入文档预览，可点击“导出 Word”下载。');
  }

  return { matchedAny, replies };
};

export const executeChatCommand = ({
  input,
  modelSnapshot,
  setModelSnapshot,
  currentPhase,
  setPhase,
  validationStep,
  setValidationStep,
  updateValidationSettings,
  setResultActiveTab,
  updateResultListFilters,
  resetResultListFilters,
  updatePublishSettings,
  setDocumentStep,
  requestPublishConfirm,
  renameActiveProject,
}: ExecuteChatCommandParams): ExecuteChatCommandResult => {
  const renameTo = extractModelName(input);
  const { wantsExcel, wantsCsv } = detectExportIntent(input);
  const scoreModeTo = parseScoreMode(input);
  const publicCreditWeightTo = parsePublicCreditWeight(input);

  const bonusAddIntent = /(加分项|加分规则)/.test(input) && /(增加|新增|添加|加一项|加一条|加一个)/.test(input);
  const bonusDeleteIntent = /(加分项|加分规则)/.test(input) && /(删除|移除|去掉|取消)/.test(input);
  const vetoAddIntent = /(否决项|否决规则|一票否决)/.test(input) && /(增加|新增|添加|加一项|加一条|加一个)/.test(input);
  const vetoDeleteIntent = /(否决项|否决规则|一票否决)/.test(input) && /(删除|移除|去掉|取消)/.test(input);
  const gradeAddIntent = /(等级|评分等级)/.test(input) && /(增加|新增|添加)/.test(input);
  const gradeDeleteIntent = /(等级|评分等级)/.test(input) && /(删除|移除|去掉|取消)/.test(input);
  const gradeUpdateIntent = /(等级|级)/.test(input) && /(改为|设为|调整为|设置为)/.test(input);
  const publicWeightIntent = /(公共信用综合评价|公共信用评价|公共信用).*(权重|占比|比例)/.test(input);
  const workflowIntent =
    /(验算|试算|校验|跑批|结果分析|企业列表|ks|分布|发布|确认发布|正式发布|管理办法|文档|生效日期|有效期|版本号|样本|样本量|抽样|数据源|行业|筛选|过滤|只看|仅看|否决项|加分项|等级筛选|评级筛选|北京市|供热企业)/i.test(
      input,
    );
  const isFilterControlText = /(筛选|过滤|只看|仅看)/.test(input);
  const bonusDeleteIntentSafe = bonusDeleteIntent && !isFilterControlText;
  const vetoDeleteIntentSafe = vetoDeleteIntent && !isFilterControlText;
  const hasModelRuleIntent =
    bonusAddIntent ||
    bonusDeleteIntentSafe ||
    vetoAddIntent ||
    vetoDeleteIntentSafe ||
    gradeAddIntent ||
    gradeDeleteIntent ||
    gradeUpdateIntent ||
    publicWeightIntent;

  if (
    !renameTo &&
    !wantsExcel &&
    !wantsCsv &&
    !scoreModeTo &&
    !publicCreditWeightTo &&
    !bonusAddIntent &&
    !bonusDeleteIntentSafe &&
    !vetoAddIntent &&
    !vetoDeleteIntentSafe &&
    !gradeAddIntent &&
    !gradeDeleteIntent &&
    !gradeUpdateIntent &&
    !publicWeightIntent &&
    !workflowIntent
  ) {
    return { handled: false };
  }

  if (!modelSnapshot) {
    if (renameTo) {
      renameActiveProject(renameTo);
      return {
        handled: true,
        reply: `已记录模型名称为「${renameTo}」，将在模型构建后自动应用。`,
      };
    }
    return {
      handled: true,
      reply: '当前还没有可操作的模型，请先发送“开始构建指标体系”生成模型后再执行该指令。',
    };
  }

  let nextModel = modelSnapshot;
  const doneActions: string[] = [];

  if (renameTo) {
    nextModel = { ...nextModel, modelName: renameTo };
    renameActiveProject(renameTo);
    doneActions.push(`已将模型名称修改为「${renameTo}」`);
  }

  if (scoreModeTo) {
    if (nextModel.totalScoreMode !== scoreModeTo) {
      const factor = scoreModeTo === 1000 ? 10 : 0.1;
      nextModel = sortGradeLevels({
        ...nextModel,
        totalScoreMode: scoreModeTo,
        gradeLevels: scaleGradeLevels(nextModel.gradeLevels, factor, scoreModeTo),
      });
      doneActions.push(`已切换为${scoreModeTo === 100 ? '百分制(100)' : '千分制(1000)'}，并自动换算等级分值`);
    } else {
      doneActions.push(`当前已是${scoreModeTo === 100 ? '百分制(100)' : '千分制(1000)'}`);
    }
  }

  if (publicWeightIntent) {
    if (publicCreditWeightTo === null || Number.isNaN(publicCreditWeightTo)) {
      doneActions.push('公共信用占比调整失败：未识别到有效数值，请补充百分比（如 20%）。');
    } else if (publicCreditWeightTo < 10 || publicCreditWeightTo > 100) {
      doneActions.push('公共信用占比调整失败：权重需在 10%~100% 之间。');
    } else {
      const publicCreditNodeId =
        nextModel.indicators.find((node) => node.name.includes('公共信用综合评价'))?.id || null;
      const nextIndicators = publicCreditNodeId
        ? rebalanceRootWeights(nextModel.indicators, publicCreditNodeId, publicCreditWeightTo)
        : nextModel.indicators;
      nextModel = {
        ...nextModel,
        publicCreditWeight: publicCreditWeightTo,
        indicators: nextIndicators,
      };
      doneActions.push(`已将公共信用综合评价占比调整为 ${publicCreditWeightTo}%`);
    }
  }

  const addBonusResult = addBonusRuleByText(input, nextModel);
  if (addBonusResult.matchedAny) {
    nextModel = addBonusResult.nextModel;
    doneActions.push(...addBonusResult.replies);
  }

  const deleteBonusResult = deleteBonusRuleByText(input, nextModel);
  if (deleteBonusResult.matchedAny) {
    nextModel = deleteBonusResult.nextModel;
    doneActions.push(...deleteBonusResult.replies);
  }

  const addVetoResult = addVetoRuleByText(input, nextModel);
  if (addVetoResult.matchedAny) {
    nextModel = addVetoResult.nextModel;
    doneActions.push(...addVetoResult.replies);
  }

  const deleteVetoResult = deleteVetoRuleByText(input, nextModel);
  if (deleteVetoResult.matchedAny) {
    nextModel = deleteVetoResult.nextModel;
    doneActions.push(...deleteVetoResult.replies);
  }

  const addGradeResult = addGradeLevelByText(input, nextModel);
  if (addGradeResult.matchedAny) {
    nextModel = addGradeResult.nextModel;
    doneActions.push(...addGradeResult.replies);
  }

  const deleteGradeResult = deleteGradeLevelByText(input, nextModel);
  if (deleteGradeResult.matchedAny) {
    nextModel = deleteGradeResult.nextModel;
    doneActions.push(...deleteGradeResult.replies);
  }

  const updateGradeResult = updateGradeScoreByText(input, nextModel);
  if (updateGradeResult.matchedAny) {
    nextModel = updateGradeResult.nextModel;
    doneActions.push(...updateGradeResult.replies);
  }

  const workflowResult = handleWorkflowCommands(input, {
    currentPhase,
    setPhase,
    validationStep,
    setValidationStep,
    updateValidationSettings,
    setResultActiveTab,
    updateResultListFilters,
    resetResultListFilters,
    updatePublishSettings,
    setDocumentStep,
    requestPublishConfirm,
  });
  if (workflowResult.matchedAny) {
    doneActions.push(...workflowResult.replies);
  }

  if (nextModel !== modelSnapshot) {
    setModelSnapshot(nextModel);
  }

  if (
    doneActions.length === 0 &&
    (hasModelRuleIntent || workflowIntent)
  ) {
    if (workflowIntent && !hasModelRuleIntent) {
      return {
        handled: true,
        reply:
          '我识别到了流程控制意图，但缺少关键信息。示例：\n' +
          '1) 开始验算\n' +
          '2) 验算样本量改为300\n' +
          '3) 验算行业改为环境保护\n' +
          '4) 切到企业列表\n' +
          '5) 只看有否决项企业\n' +
          '6) 使用北京市95家供热企业样本\n' +
          '7) 版本号改为V1.2，生效日期改为2026-04-01，有效期2年\n' +
          '8) 进入管理办法并预览文档',
      };
    }
    return {
      handled: true,
      reply:
        '我识别到了评分规则调整意图，但缺少关键信息。示例：\n' +
        '1) 改为百分制\n' +
        '2) 增加加分项 获得国家奖项 +8分\n' +
        '3) 删除加分项 系统智能化项目获省级以上试点\n' +
        '4) 增加否决项 发生重大安全事故 说明一年内出现2次及以上较大事故\n' +
        '5) 删除否决项 被司法机关纳入失信被执行人名单\n' +
        '6) 把公共信用综合评价占比改为20%\n' +
        '7) 增加等级 E 20\n' +
        '8) 把A等级分值改为85',
    };
  }

  if (wantsExcel) {
    const fileName = exportModelAsExcel(nextModel);
    doneActions.push(`已导出 Excel 文件：\`${fileName}\``);
  }

  if (wantsCsv) {
    const fileName = exportModelAsCsv(nextModel);
    doneActions.push(`已导出 CSV 文件：\`${fileName}\``);
  }

  return {
    handled: true,
    reply: doneActions.join('。\n') + '。',
  };
};

export const shouldConfirmDeleteCommand = (input: string) => {
  if (/(筛选|过滤)/.test(input)) {
    return false;
  }
  const patterns = [
    /(删除|移除|去掉|取消).*(加分项|加分规则|否决项|否决规则|一票否决|等级|评分等级|指标)/,
    /(加分项|加分规则|否决项|否决规则|一票否决|等级|评分等级|指标).*(删除|移除|去掉|取消)/,
  ];
  return patterns.some((pattern) => pattern.test(input));
};
