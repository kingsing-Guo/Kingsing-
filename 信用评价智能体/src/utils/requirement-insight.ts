import type { ModelRequirement } from '../types/model';

const OPERATION_COMMAND_RE =
  /(导出|下载|删除|移除|去掉|改为|调整|设置|切换|评分制|等级|加分项|否决项|占比|权重|验算|发布|保存|全屏|模型预览|开始构建指标体系)/;

const REQUIREMENT_HINT_RE =
  /(模型|评价|企业|行业|指标|维度|规则|风险|合规|经营|信用|基础|目标|场景|对象|监管|处罚|失信)/;

const PREFERENCE_HINT_RE =
  /(偏好|偏向|倾向|倾向于|导向|关注点|关注|重点|侧重|聚焦|希望|建议|从严|更关注|更重视|更看重|优先|优先考虑|优先关注|偏重)/;

const cleanText = (text: string) =>
  text
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePoint = (text: string) =>
  text
    .replace(/^(我(们)?(希望|需要|想要|想)|请|请帮我|帮我|我要你帮我|希望|需要|建议)\s*/g, '')
    .replace(/^(可以|能够|能否)\s*/g, '')
    .replace(/[。；;，,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const key = item.replace(/\s+/g, '').toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(item);
  });
  return result;
};

const splitSegments = (text: string) =>
  text
    .split(/[，,。；;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const extractListAfterKeyword = (raw: string) =>
  raw
    .split(/[、,，]|(?:以及|及|和)/)
    .map((item) => normalizePoint(item))
    .filter(Boolean)
    .slice(0, 4);

const extractPreferenceTail = (segment: string) => {
  const patterns = [
    /(?:模型)?(?:偏好|偏向|偏重|倾向(?:于)?|导向|关注点|关注|侧重(?:于)?|聚焦(?:于)?|更关注|更重视|更看重|优先(?:关注|考虑)?)(?:是|为|在于|于|到)?(.+)/,
    /(?:希望|建议)(?:模型|评价)?(?:偏向|倾向|侧重|关注|聚焦)(?:于|在|是|为)?(.+)/,
  ];
  for (const pattern of patterns) {
    const matched = segment.match(pattern);
    if (matched?.[1]) {
      return normalizePoint(matched[1]);
    }
  }
  return '';
};

const buildPreferencePoint = (raw: string) => {
  const normalized = normalizePoint(raw);
  if (!normalized) {
    return '';
  }
  const list = extractListAfterKeyword(normalized);
  if (list.length >= 2) {
    return `重点关注：${list.join('、')}`;
  }
  if (/^(重点关注|优先关注|侧重|关注|偏向|偏好|倾向)/.test(normalized)) {
    return normalized;
  }
  return `偏好方向：${normalized}`;
};

const extractInsights = (input: string) => {
  const text = cleanText(input);
  const requirements: string[] = [];
  const preferences: string[] = [];

  const targetMatch = text.match(
    /(?:设计|构建|建立|搭建|制定|做)(?:一个|一套)?([^，。；;\n]{2,24}?)(?:信用)?评价模型/,
  );
  if (targetMatch?.[1]) {
    requirements.push(`评价对象：${normalizePoint(targetMatch[1])}`);
  }

  const basisMatch = text.match(/(?:以|基于)([^，。；;\n]{2,30}?)(?:为基础|作为基础|为底座|为依据)/);
  if (basisMatch?.[1]) {
    requirements.push(`评价基础：${normalizePoint(basisMatch[1])}`);
  }

  const focusMatch = text.match(/(?:重点(?:关注|考察|考虑)?|侧重|优先关注)([^。；;\n]+)/);
  if (focusMatch?.[1]) {
    const focusItems = extractListAfterKeyword(focusMatch[1]);
    if (focusItems.length > 0) {
      preferences.push(`重点关注：${focusItems.join('、')}`);
    }
  }

  const directPreferenceMatch = text.match(
    /(?:偏好|偏向|倾向(?:于)?|关注点|更关注|更重视|更看重|优先考虑)([^。；;\n]+)/,
  );
  if (directPreferenceMatch?.[1]) {
    const point = buildPreferencePoint(directPreferenceMatch[1]);
    if (point) {
      preferences.push(point);
    }
  }

  splitSegments(text).forEach((segment) => {
    const normalized = normalizePoint(segment);
    if (!normalized) {
      return;
    }

    if (PREFERENCE_HINT_RE.test(segment)) {
      const preferenceTail = extractPreferenceTail(segment);
      const point = buildPreferencePoint(preferenceTail || normalized);
      if (point) {
        preferences.push(point);
      }
      return;
    }

    if (REQUIREMENT_HINT_RE.test(segment)) {
      requirements.push(normalized);
    }
  });

  return {
    requirements: dedupe(requirements).slice(0, 6),
    preferences: dedupe(preferences).slice(0, 6),
  };
};

export const shouldExtractRequirementInsight = (input: string, currentPhase: string) => {
  if (currentPhase !== 'REQUIREMENT') {
    return false;
  }
  const text = cleanText(input);
  if (text.length < 6) {
    return false;
  }
  if (OPERATION_COMMAND_RE.test(text)) {
    return false;
  }
  return REQUIREMENT_HINT_RE.test(text) || PREFERENCE_HINT_RE.test(text);
};

export const mergeRequirementInsightFromInput = (
  current: ModelRequirement,
  input: string,
): Partial<ModelRequirement> | null => {
  const extracted = extractInsights(input);
  if (extracted.requirements.length === 0 && extracted.preferences.length === 0) {
    return null;
  }

  const nextRequirementSummary = dedupe([...current.requirementSummary, ...extracted.requirements]).slice(0, 8);
  const nextPreferenceSummary = dedupe([...current.preferenceSummary, ...extracted.preferences]).slice(0, 8);

  return {
    requirementSummary: nextRequirementSummary,
    preferenceSummary: nextPreferenceSummary,
    preferences: nextPreferenceSummary.map((item) => `- ${item}`).join('\n'),
  };
};
