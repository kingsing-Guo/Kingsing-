const PREFIX_RE =
  /^(重点关注|优先关注|偏好方向|偏好重点|偏好|偏向|倾向|侧重|关注点|关注|模型偏好|模型偏向|导向)\s*[：:]\s*/;

const splitByDelimiters = (text: string) =>
  text
    .split(/[、,，；;]|(?:以及|及|和)/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeToken = (raw: string) => {
  const cleaned = raw
    .replace(/^-\s*/, '')
    .replace(PREFIX_RE, '')
    .replace(/^(是|为|于|在)\s*/, '')
    .replace(/[。；;，,]+$/g, '')
    .trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > 24 ? cleaned.slice(0, 24) : cleaned;
};

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

export const toPreferenceTags = (summary: string[], fallbackText?: string) => {
  const source = summary.length > 0 ? summary : fallbackText ? [fallbackText] : [];
  const tags = source.flatMap((item) => splitByDelimiters(item).map((token) => normalizeToken(token)));
  return dedupe(tags.filter(Boolean)).slice(0, 8);
};
