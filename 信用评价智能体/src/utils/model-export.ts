import type { CreditEvalModel, IndicatorNode } from '../types/model';

const LEVEL_TEXT = ['一', '二', '三', '四', '五', '六', '七', '八'];

const getLevelLabel = (level: number) => `${LEVEL_TEXT[level - 1] || `${level}`}级指标`;

const formatIndicatorWithWeight = (node?: IndicatorNode) => {
  if (!node) {
    return '-';
  }
  return `${node.name} (${Math.round(node.weight || 0)})`;
};

const getDirectionLabel = (node?: IndicatorNode) => {
  if (!node?.direction) {
    return '-';
  }
  return node.direction === 'negative' ? '负向' : '正向';
};

const getRuleSummaryText = (node?: IndicatorNode) => {
  if (!node) {
    return '-';
  }
  if (node.children && node.children.length > 0) {
    return '由子指标加权聚合得分';
  }
  if (node.name.includes('公共信用综合评价')) {
    return '直接引用主体公共信用综合评价现有得分';
  }
  switch (node.ruleType) {
    case 'interval':
      return node.ruleConfig?.intervalRanges?.length
        ? `${node.ruleConfig.intervalRanges.length} 个区间映射`
        : '区间分段映射得分';
    case 'threshold':
      return node.ruleConfig?.thresholdRule
        ? `阈值判定 ${node.ruleConfig.thresholdRule.operator} ${node.ruleConfig.thresholdRule.threshold}`
        : '阈值达标判定';
    case 'linear':
      return node.ruleConfig?.linearRule
        ? `线性映射 ${node.ruleConfig.linearRule.min}~${node.ruleConfig.linearRule.max}`
        : '线性比例映射';
    case 'ratio':
      return node.ruleConfig?.ratioRule
        ? `比例折算 目标值 ${node.ruleConfig.ratioRule.targetValue}`
        : '比例折算评分';
    case 'cumulative':
      return node.ruleConfig?.cumulativeRule
        ? `累计计分 步长 ${node.ruleConfig.cumulativeRule.unitCount}`
        : '累计计分评分';
    case 'boolean':
      return '布尔判定评分';
    case 'formula':
      return '公式计算评分';
    default:
      return '未配置评分规则';
  }
};

const collectLeafPaths = (nodes: IndicatorNode[]): IndicatorNode[][] => {
  const paths: IndicatorNode[][] = [];
  const walk = (node: IndicatorNode, path: IndicatorNode[]) => {
    const nextPath = [...path, node];
    if (!node.children || node.children.length === 0) {
      paths.push(nextPath);
      return;
    }
    node.children.forEach((child) => walk(child, nextPath));
  };
  nodes.forEach((node) => walk(node, []));
  return paths;
};

const getLevelCountMap = (nodes: IndicatorNode[]) => {
  const levelCountMap: Record<number, number> = {};
  let maxLevel = 1;
  const walk = (items: IndicatorNode[]) => {
    items.forEach((node) => {
      const level = Number(node.level) || 1;
      levelCountMap[level] = (levelCountMap[level] || 0) + 1;
      maxLevel = Math.max(maxLevel, level);
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return { levelCountMap, maxLevel };
};

const escapeCsvCell = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_').trim() || '信用评价模型';

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildExportTable = (model: CreditEvalModel) => {
  const { levelCountMap, maxLevel } = getLevelCountMap(model.indicators);
  const levelHeaders = Array.from({ length: maxLevel }, (_, idx) => {
    const level = idx + 1;
    return {
      level,
      label: getLevelLabel(level),
      count: levelCountMap[level] || 0,
    };
  });
  const leafPaths = collectLeafPaths(model.indicators);

  const headers = [...levelHeaders.map((item) => item.label), '指标说明', '评分指向', '评分规则', '数据来源'];
  const rows = leafPaths.map((path) => {
    const leaf = path[path.length - 1];
    const levelCells = levelHeaders.map((item) => {
      const matched = path.find((node) => Number(node.level) === item.level);
      return formatIndicatorWithWeight(matched);
    });
    return [
      ...levelCells,
      leaf?.description?.trim() || '-',
      getDirectionLabel(leaf),
      getRuleSummaryText(leaf),
      leaf?.dataSource || '-',
    ];
  });

  return {
    levelHeaders,
    headers,
    rows,
  };
};

const buildGradeRows = (model: CreditEvalModel) => {
  const sorted = [...model.gradeLevels].sort((a, b) => b.minScore - a.minScore);
  return sorted.map((level, index) => {
    const maxScore = index === 0 ? model.totalScoreMode : sorted[index - 1].minScore - 1;
    return {
      level: level.name,
      min: level.minScore,
      max: Math.max(level.minScore, maxScore),
    };
  });
};

export const exportModelAsCsv = (model: CreditEvalModel) => {
  const { headers, rows } = buildExportTable(model);
  const csvRows = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const fileName = `${sanitizeFileName(model.modelName)}_模型明细.csv`;
  triggerDownload(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }), fileName);
  return fileName;
};

export const exportModelAsExcel = (model: CreditEvalModel) => {
  const { levelHeaders, headers, rows } = buildExportTable(model);
  const gradeRows = buildGradeRows(model);
  const modelName = model.modelName?.trim() || '评价指标体系';

  const summaryHtml = [
    ...levelHeaders.map((item) => `${item.label}: ${item.count}`),
    `评分机制: ${model.totalScoreMode === 100 ? '百分制(100)' : '千分制(1000)'}`,
    `等级数: ${model.gradeLevels.length}`,
    `否决项: ${model.vetoRules.length}`,
    `加分项: ${model.bonusRules.length}`,
  ]
    .map((item) => `<span style="margin-right:18px;">${escapeHtml(item)}</span>`)
    .join('');

  const headerHtml = headers.map((header) => `<th style="background:#f5f7fb;padding:8px;border:1px solid #d9d9d9;">${escapeHtml(header)}</th>`).join('');
  const bodyHtml = rows
    .map((row) => {
      const cells = row.map((cell) => `<td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(cell)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const gradeHtml = gradeRows
    .map(
      (item) =>
        `<tr><td style="padding:6px;border:1px solid #e5e7eb;">${escapeHtml(item.level)}</td><td style="padding:6px;border:1px solid #e5e7eb;">${item.min}</td><td style="padding:6px;border:1px solid #e5e7eb;">${item.max}</td></tr>`,
    )
    .join('');

  const vetoHtml = model.vetoRules
    .map(
      (item) =>
        `<tr><td style="padding:6px;border:1px solid #e5e7eb;">${escapeHtml(item.name)}</td><td style="padding:6px;border:1px solid #e5e7eb;">${escapeHtml(item.description)}</td></tr>`,
    )
    .join('');

  const bonusHtml = model.bonusRules
    .map(
      (item) =>
        `<tr><td style="padding:6px;border:1px solid #e5e7eb;">${escapeHtml(item.name)}</td><td style="padding:6px;border:1px solid #e5e7eb;">+${item.score}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(modelName)}</title>
  </head>
  <body>
    <h2>${escapeHtml(modelName)}</h2>
    <div style="margin:8px 0 14px 0;font-size:13px;color:#374151;">${summaryHtml}</div>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
    <h3 style="margin-top:18px;">等级与分值关系</h3>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">等级</th>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">最低分（含）</th>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">最高分（含）</th>
        </tr>
      </thead>
      <tbody>${gradeHtml}</tbody>
    </table>
    <h3 style="margin-top:18px;">一票否决规则</h3>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">规则名称</th>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">规则说明</th>
        </tr>
      </thead>
      <tbody>${vetoHtml || '<tr><td colspan="2" style="padding:6px;border:1px solid #e5e7eb;">暂无</td></tr>'}</tbody>
    </table>
    <h3 style="margin-top:18px;">加分项规则</h3>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">规则名称</th>
          <th style="background:#f5f7fb;padding:6px;border:1px solid #d9d9d9;">加分值</th>
        </tr>
      </thead>
      <tbody>${bonusHtml || '<tr><td colspan="2" style="padding:6px;border:1px solid #e5e7eb;">暂无</td></tr>'}</tbody>
    </table>
  </body>
</html>`;

  const fileName = `${sanitizeFileName(modelName)}_模型明细.xls`;
  triggerDownload(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), fileName);
  return fileName;
};
