import React, { useMemo, useState } from 'react';
import { useAgentStore } from '../../store';
import {
  Eye,
  Download,
  ShieldAlert,
  Zap,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Table, Tag, InputNumber, Modal, Button, Input, Divider, Select, Drawer, Radio, Switch, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  IndicatorNode,
  GradeLevel,
  IntervalRangeRule,
  ThresholdRuleConfig,
  LinearRuleConfig,
  RatioRuleConfig,
  CumulativeRuleConfig,
} from '../../types/model';
import { DraggableWeightBar } from './DraggableWeightBar';
import {
  DATA_INDICATOR_OPTIONS,
  findDataIndicatorByDataSource,
  getRuleRecommendation,
  toDataSourceLabel,
  type ConfigurableRuleType,
} from '../../utils/rule-recommendation';

interface PreviewRow {
  id: string;
  levelValues: Record<number, string>;
  levelIds: Partial<Record<number, string>>;
  levelRowSpans: Record<number, number>;
  description: string;
  directionLabel: string;
  ruleText: string;
  dataSource: string;
}

interface LevelSummaryItem {
  level: number;
  label: string;
  count: number;
}

interface GradeRangeRow {
  id: string;
  level: string;
  minScore: number;
  maxScore: number;
  range: string;
}

interface DrawerFormState {
  name: string;
  weight: number;
  direction: 'positive' | 'negative';
  description: string;
  indicatorType: 'leaf' | 'category';
  dataIndicatorKey: string;
  ruleType: ConfigurableRuleType;
  intervalRanges: IntervalRangeRule[];
  thresholdRule: ThresholdRuleConfig;
  linearRule: LinearRuleConfig;
  ratioRule: RatioRuleConfig;
  cumulativeRule: CumulativeRuleConfig;
}

interface RuleDialogState {
  open: boolean;
  type: 'veto' | 'bonus';
  name: string;
  description: string;
  score: number;
}

interface ChildWeightIssue {
  parentId: string;
  parentName: string;
  totalWeight: number;
}

interface DeleteConfirmState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: (() => void) | null;
}

const formatIndicatorWithWeight = (node: IndicatorNode) => `${node.name} (${Math.round(node.weight || 0)})`;

const LEVEL_TEXT = ['一', '二', '三', '四', '五', '六', '七', '八'];

const getLevelLabel = (level: number) => `${LEVEL_TEXT[level - 1] || `${level}`}级指标`;

const collectLevelSummaryItems = (nodes: IndicatorNode[]): LevelSummaryItem[] => {
  const levelCountMap: Record<number, number> = {};
  let maxLevel = 1;
  const traverse = (items: IndicatorNode[]) => {
    items.forEach((node) => {
      const level = Number(node.level) || 1;
      levelCountMap[level] = (levelCountMap[level] || 0) + 1;
      maxLevel = Math.max(maxLevel, level);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return Array.from({ length: maxLevel }, (_, idx) => {
    const level = idx + 1;
    return {
      level,
      label: getLevelLabel(level),
      count: levelCountMap[level] || 0,
    };
  });
};

const buildPreviewRows = (nodes: IndicatorNode[], maxLevel: number): PreviewRow[] => {
  const rows: PreviewRow[] = [];
  const walk = (node: IndicatorNode, path: IndicatorNode[]) => {
    const nextPath = [...path, node];
    if (!node.children || node.children.length === 0) {
      const levelValues: Record<number, string> = {};
      const levelIds: Partial<Record<number, string>> = {};
      const levelRowSpans: Record<number, number> = {};
      for (let level = 1; level <= maxLevel; level += 1) {
        const matchedNode = nextPath.find((pathNode) => Number(pathNode.level) === level);
        levelValues[level] = matchedNode ? formatIndicatorWithWeight(matchedNode) : '-';
        levelIds[level] = matchedNode?.id;
        levelRowSpans[level] = 1;
      }
      rows.push({
        id: node.id,
        levelValues,
        levelIds,
        levelRowSpans,
        description: node.description?.trim() || '-',
        directionLabel: node.direction === 'negative' ? '负向' : node.direction === 'positive' ? '正向' : '-',
        ruleText: getRuleSummaryText(node),
        dataSource: node.dataSource || '-',
      });
      return;
    }
    node.children.forEach((child) => walk(child, nextPath));
  };

  nodes.forEach((rootNode) => walk(rootNode, []));

  for (let level = 1; level <= maxLevel; level += 1) {
    let cursor = 0;
    while (cursor < rows.length) {
      const currentLevelId = rows[cursor].levelIds[level];
      if (!currentLevelId) {
        rows[cursor].levelRowSpans[level] = 1;
        cursor += 1;
        continue;
      }

      let end = cursor + 1;
      while (end < rows.length && rows[end].levelIds[level] === currentLevelId) {
        end += 1;
      }

      rows[cursor].levelRowSpans[level] = end - cursor;
      for (let idx = cursor + 1; idx < end; idx += 1) {
        rows[idx].levelRowSpans[level] = 0;
      }
      cursor = end;
    }
  }

  return rows;
};

const buildGradeRangeRows = (levels: GradeLevel[], totalScoreMode: 100 | 1000): GradeRangeRow[] => {
  const sorted = [...levels].sort((a, b) => b.minScore - a.minScore);
  return sorted.map((level, index) => {
    const maxScore = index === 0 ? totalScoreMode : sorted[index - 1].minScore - 1;
    return {
      id: level.id,
      level: level.name,
      minScore: level.minScore,
      maxScore: Math.max(level.minScore, maxScore),
      range: `${level.minScore} - ${Math.max(level.minScore, maxScore)}`,
    };
  });
};

const sortGradeLevels = (levels: GradeLevel[]) => [...levels].sort((a, b) => b.minScore - a.minScore);

const createDefaultGradeLevels = (scoreMode: 100 | 1000): GradeLevel[] => {
  const factor = scoreMode === 1000 ? 10 : 1;
  return [
    { id: 'g1', name: 'A', minScore: 80 * factor, color: '#10b981' },
    { id: 'g2', name: 'B', minScore: 60 * factor, color: '#3b82f6' },
    { id: 'g3', name: 'C', minScore: 40 * factor, color: '#f59e0b' },
    { id: 'g4', name: 'D', minScore: 0, color: '#ef4444' },
  ];
};

const createIndicatorId = () => `ind-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createRuleId = (prefix: 'v' | 'b') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const createRangeId = () => `range-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_INTERVAL_RANGES: IntervalRangeRule[] = [
  { id: createRangeId(), min: 0, max: 1, scoreRatio: 50 },
  { id: createRangeId(), min: 1, max: 2, scoreRatio: 100 },
];

const DEFAULT_THRESHOLD_RULE: ThresholdRuleConfig = {
  operator: '>=',
  threshold: 1,
  passScoreRatio: 100,
  failScoreRatio: 0,
};

const DEFAULT_LINEAR_RULE: LinearRuleConfig = {
  min: 0,
  max: 100,
  minScoreRatio: 0,
  maxScoreRatio: 100,
};

const DEFAULT_RATIO_RULE: RatioRuleConfig = {
  targetValue: 100,
  floorScoreRatio: 0,
  capScoreRatio: 100,
};

const DEFAULT_CUMULATIVE_RULE: CumulativeRuleConfig = {
  unitCount: 1,
  scorePerUnit: 10,
  baseScoreRatio: 0,
  maxScoreRatio: 100,
};

const RULE_TYPE_LABEL: Record<ConfigurableRuleType, string> = {
  interval: '区间评分',
  threshold: '阈值评分',
  linear: '线性评分',
  ratio: '比例评分',
  cumulative: '累计计分',
};

const PUBLIC_CREDIT_FIXED_INDICATOR = {
  label: '主体公共信用综合评价',
  code: 'CP_SUBJECT_PUBLIC_CREDIT_SCORE',
  dataType: '标准评分值',
  description: '由公共信用平台统一计算并下发，不在当前模型内配置评分规则。',
};

const RULE_TYPE_ORDER: ConfigurableRuleType[] = ['interval', 'threshold', 'linear', 'ratio', 'cumulative'];

const ensureRuleType = (ruleType?: IndicatorNode['ruleType']): ConfigurableRuleType =>
  RULE_TYPE_ORDER.includes(ruleType as ConfigurableRuleType) ? (ruleType as ConfigurableRuleType) : 'interval';

const updateNodeById = (
  nodes: IndicatorNode[],
  targetId: string,
  updater: (node: IndicatorNode) => IndicatorNode,
): IndicatorNode[] =>
  nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node);
    }
    if (!node.children || node.children.length === 0) {
      return node;
    }
    return { ...node, children: updateNodeById(node.children, targetId, updater) };
  });

const addChildNode = (nodes: IndicatorNode[], parentId: string, childNode: IndicatorNode): IndicatorNode[] =>
  nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), childNode] };
    }
    if (!node.children || node.children.length === 0) {
      return node;
    }
    return { ...node, children: addChildNode(node.children, parentId, childNode) };
  });

const findNodeById = (nodes: IndicatorNode[], targetId: string): IndicatorNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const matched = findNodeById(node.children, targetId);
      if (matched) {
        return matched;
      }
    }
  }
  return null;
};

const findParentNodeByChildId = (nodes: IndicatorNode[], childId: string): IndicatorNode | null => {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === childId)) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const matched = findParentNodeByChildId(node.children, childId);
      if (matched) {
        return matched;
      }
    }
  }
  return null;
};

const getChildrenWeightTotal = (node: IndicatorNode): number =>
  (node.children || []).reduce((sum, child) => sum + (child.weight || 0), 0);

const getNodeChildWeightIssue = (nodes: IndicatorNode[], parentId: string): ChildWeightIssue | null => {
  const parentNode = findNodeById(nodes, parentId);
  if (!parentNode?.children || parentNode.children.length === 0) {
    return null;
  }
  const totalWeight = getChildrenWeightTotal(parentNode);
  if (totalWeight === 100) {
    return null;
  }
  return {
    parentId,
    parentName: parentNode.name,
    totalWeight,
  };
};

const collectChildWeightIssues = (nodes: IndicatorNode[]): ChildWeightIssue[] => {
  const issues: ChildWeightIssue[] = [];
  const traverse = (items: IndicatorNode[]) => {
    items.forEach((node) => {
      if (node.children && node.children.length > 0) {
        const totalWeight = getChildrenWeightTotal(node);
        if (totalWeight !== 100) {
          issues.push({
            parentId: node.id,
            parentName: node.name,
            totalWeight,
          });
        }
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return issues;
};

const formatWeightIssueText = (issue: ChildWeightIssue) => {
  const diff = Math.abs(issue.totalWeight - 100);
  const stateText = issue.totalWeight > 100 ? '超出' : '不足';
  return `「${issue.parentName}」下级指标权重合计 ${issue.totalWeight}%（${stateText} ${diff}%），请调整为 100%。`;
};

const getRuleTypeTagLabel = (node: IndicatorNode) => {
  if (node.children && node.children.length > 0) {
    return '聚合指标';
  }
  if (!node.ruleType) {
    return '未配置';
  }
  if (node.ruleType in RULE_TYPE_LABEL) {
    return RULE_TYPE_LABEL[node.ruleType as ConfigurableRuleType];
  }
  if (node.ruleType === 'boolean') {
    return '布尔评分';
  }
  if (node.ruleType === 'formula') {
    return '公式评分';
  }
  return node.ruleType;
};

const getRuleTypeTagColor = (node: IndicatorNode) => {
  if (node.children && node.children.length > 0) {
    return 'default';
  }
  switch (node.ruleType) {
    case 'interval':
      return 'blue';
    case 'threshold':
      return 'orange';
    case 'linear':
      return 'cyan';
    case 'ratio':
      return 'geekblue';
    case 'cumulative':
      return 'purple';
    case 'boolean':
      return 'gold';
    case 'formula':
      return 'magenta';
    default:
      return 'default';
  }
};

function getRuleSummaryText(node: IndicatorNode) {
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
}

const removeNodeById = (nodes: IndicatorNode[], targetId: string): IndicatorNode[] =>
  nodes
    .filter((node) => node.id !== targetId)
    .map((node) => {
      if (!node.children || node.children.length === 0) {
        return node;
      }
      return { ...node, children: removeNodeById(node.children, targetId) };
    });

const getAllNodeIds = (nodes: IndicatorNode[]): string[] => {
  let ids: string[] = [];
  nodes.forEach((node) => {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      ids = ids.concat(getAllNodeIds(node.children));
    }
  });
  return ids;
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
      return {
        id: item.id,
        base: Math.floor(exact),
        frac: exact - Math.floor(exact),
      };
    });

    let left = remaining - raw.reduce((sum, item) => sum + item.base, 0);
    raw
      .sort((a, b) => b.frac - a.frac)
      .forEach((item) => {
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

const ModelAdjustPanel: React.FC = () => {
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const setModelSnapshot = useAgentStore((state) => state.setModelSnapshot);
  const isSidebarCollapsed = useAgentStore((state) => state.isSidebarCollapsed);
  const setPhase = useAgentStore((state) => state.setPhase);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isRulePanelVisible, setIsRulePanelVisible] = useState(false);
  const [rulePanelFocus, setRulePanelFocus] = useState<'veto' | 'bonus'>('veto');
  const [isGradeRangeVisible, setIsGradeRangeVisible] = useState(false);
  const [showCollapsedDescription, setShowCollapsedDescription] = useState(true);
  const [showCollapsedRule, setShowCollapsedRule] = useState(true);
  const [isEditingModelName, setIsEditingModelName] = useState(false);
  const [modelNameDraft, setModelNameDraft] = useState('');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [targetNode, setTargetNode] = useState<IndicatorNode | null>(null);
  const [drawerForm, setDrawerForm] = useState<DrawerFormState>({
    name: '',
    weight: 10,
    direction: 'positive',
    description: '',
    indicatorType: 'leaf',
    dataIndicatorKey: DATA_INDICATOR_OPTIONS[0].key,
    ruleType: 'interval',
    intervalRanges: DEFAULT_INTERVAL_RANGES,
    thresholdRule: DEFAULT_THRESHOLD_RULE,
    linearRule: DEFAULT_LINEAR_RULE,
    ratioRule: DEFAULT_RATIO_RULE,
    cumulativeRule: DEFAULT_CUMULATIVE_RULE,
  });

  const [weightExpandId, setWeightExpandId] = useState<string | null>(null);
  const [ruleDialog, setRuleDialog] = useState<RuleDialogState>({
    open: false,
    type: 'veto',
    name: '',
    description: '',
    score: 5,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
  });
  const editingGradeLevels = useMemo(() => sortGradeLevels(modelSnapshot?.gradeLevels || []), [modelSnapshot]);

  const publicCreditNodeId = useMemo(
    () => modelSnapshot?.indicators.find((node) => node.name.includes('公共信用综合评价'))?.id || null,
    [modelSnapshot],
  );

  if (!modelSnapshot) {
    return <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">模型生成中或未初始化...</div>;
  }

  const levelSummaryItems = collectLevelSummaryItems(modelSnapshot.indicators);
  const previewMaxLevel = levelSummaryItems.length || 1;
  const previewRows = buildPreviewRows(modelSnapshot.indicators, previewMaxLevel);
  const gradeRangeRows = buildGradeRangeRows(modelSnapshot.gradeLevels, modelSnapshot.totalScoreMode);
  const previewColumns: ColumnsType<PreviewRow> = [
    ...levelSummaryItems.map((item) => ({
      title: item.label,
      dataIndex: ['levelValues', item.level],
      key: `level-${item.level}`,
      width: 220,
      render: (_value: string, row: PreviewRow) => ({
        children: <span className={item.level === 1 ? 'font-medium text-gray-800' : 'text-gray-800'}>{row.levelValues[item.level] || '-'}</span>,
        props: { rowSpan: row.levelRowSpans[item.level] ?? 1 },
      }),
    })),
    {
      title: '指标说明',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (value) => <div className="text-xs text-gray-600 leading-6 whitespace-pre-wrap">{value}</div>,
    },
    {
      title: '评分指向',
      dataIndex: 'directionLabel',
      key: 'directionLabel',
      width: 90,
      align: 'center',
      render: (value: string) => (
        <Tag color={value === '负向' ? 'error' : value === '正向' ? 'processing' : 'default'} className="!m-0 !text-[11px]">
          {value}
        </Tag>
      ),
    },
    {
      title: '评分规则',
      dataIndex: 'ruleText',
      key: 'ruleText',
      width: 250,
      render: (value) => <div className="text-xs text-gray-600 leading-6 whitespace-pre-wrap">{value}</div>,
    },
    {
      title: '数据来源',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 220,
      render: (value) => <div className="text-xs text-gray-600 leading-6">{value}</div>,
    },
  ];
  const gradeRangeColumns: ColumnsType<GradeRangeRow> = [
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (value: string) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      title: '最低分（含）',
      dataIndex: 'minScore',
      key: 'minScore',
      width: 180,
      align: 'center',
    },
    {
      title: '最高分（含）',
      dataIndex: 'maxScore',
      key: 'maxScore',
      width: 180,
      align: 'center',
    },
    {
      title: '分值区间',
      dataIndex: 'range',
      key: 'range',
      render: (value: string) => <span className="text-gray-600">{value}</span>,
    },
  ];
  const previewSummary = {
    scoreModeLabel: modelSnapshot.totalScoreMode === 100 ? '百分制 (100)' : '千分制 (1000)',
    gradeCount: modelSnapshot.gradeLevels.length,
    vetoCount: modelSnapshot.vetoRules.length,
    bonusCount: modelSnapshot.bonusRules.length,
  };
  const previewModelName = modelSnapshot.modelName?.trim() || '评价指标体系';
  const previewTableMinWidth = Math.max(1260, levelSummaryItems.length * 220 + 860);

  const closePreviewModal = () => {
    setIsPreviewVisible(false);
    setIsPreviewFullscreen(false);
    setIsRulePanelVisible(false);
    setIsGradeRangeVisible(false);
  };

  const beginEditModelName = () => {
    setModelNameDraft(previewModelName);
    setIsEditingModelName(true);
  };

  const cancelEditModelName = () => {
    setIsEditingModelName(false);
    setModelNameDraft(previewModelName);
  };

  const commitModelName = () => {
    const nextName = modelNameDraft.trim();
    if (!nextName) {
      message.warning('评价体系名称不能为空');
      return;
    }
    setModelSnapshot({
      ...modelSnapshot,
      modelName: nextName,
    });
    setIsEditingModelName(false);
  };

  const openDrawer = (mode: 'add' | 'edit', record: IndicatorNode) => {
    if (mode === 'add' && record.level >= 3) {
      message.warning('三级指标下不能继续添加子指标');
      return;
    }

    const matchedDataIndicator =
      mode === 'edit' ? findDataIndicatorByDataSource(record.dataSource) : DATA_INDICATOR_OPTIONS[0];
    const suggestedRule = getRuleRecommendation({
      name: mode === 'edit' ? record.name : '',
      description: mode === 'edit' ? record.description || '' : '',
      direction: mode === 'edit' ? record.direction || 'positive' : 'positive',
      dataIndicator: matchedDataIndicator,
    });
    const nextRuleType = mode === 'edit' ? ensureRuleType(record.ruleType) : suggestedRule.topRuleType;

    setDrawerMode(mode);
    setTargetNode(record);
    setDrawerForm({
      name: mode === 'edit' ? record.name : '',
      weight: mode === 'edit' ? record.weight : 10,
      direction: mode === 'edit' ? record.direction || 'positive' : 'positive',
      description: mode === 'edit' ? record.description || '' : '',
      indicatorType:
        mode === 'edit'
          ? record.children && record.children.length > 0
            ? 'category'
            : 'leaf'
          : record.level === 1
            ? 'category'
            : 'leaf',
      dataIndicatorKey: matchedDataIndicator.key,
      ruleType: nextRuleType,
      intervalRanges:
        mode === 'edit' && record.ruleConfig?.intervalRanges && record.ruleConfig.intervalRanges.length > 0
          ? record.ruleConfig.intervalRanges.map((item) => ({ ...item }))
          : suggestedRule.intervalRanges.map((item) => ({ ...item })),
      thresholdRule:
        mode === 'edit' && record.ruleConfig?.thresholdRule
          ? { ...record.ruleConfig.thresholdRule }
          : { ...suggestedRule.thresholdRule },
      linearRule:
        mode === 'edit' && record.ruleConfig?.linearRule
          ? { ...record.ruleConfig.linearRule }
          : { ...suggestedRule.linearRule },
      ratioRule:
        mode === 'edit' && record.ruleConfig?.ratioRule
          ? { ...record.ruleConfig.ratioRule }
          : { ...suggestedRule.ratioRule },
      cumulativeRule:
        mode === 'edit' && record.ruleConfig?.cumulativeRule
          ? { ...record.ruleConfig.cumulativeRule }
          : { ...suggestedRule.cumulativeRule },
    });
    setIsDrawerOpen(true);
  };

  const handleSaveWeights = (parentId: string, newWeights: { id: string; weight: number }[]) => {
    const newIndicators = updateNodeById(modelSnapshot.indicators, parentId, (node) => ({
      ...node,
      children: node.children?.map((child) => {
        const matchedWeight = newWeights.find((item) => item.id === child.id);
        return { ...child, weight: matchedWeight ? matchedWeight.weight : child.weight };
      }),
    }));

    setModelSnapshot({ ...modelSnapshot, indicators: newIndicators });
    setWeightExpandId(null);
    const issue = getNodeChildWeightIssue(newIndicators, parentId);
    if (issue) {
      message.warning(formatWeightIssueText(issue));
    }
  };

  const handleScoreModeChange = (scoreMode: 100 | 1000) => {
    if (scoreMode === modelSnapshot.totalScoreMode) {
      return;
    }

    const factor = scoreMode === 1000 ? 10 : 0.1;
    const nextGradeLevels = sortGradeLevels(
      modelSnapshot.gradeLevels.map((item) => ({
        ...item,
        minScore: Math.max(0, Math.round(item.minScore * factor)),
      })),
    );

    setModelSnapshot({
      ...modelSnapshot,
      totalScoreMode: scoreMode,
      gradeLevels: nextGradeLevels,
    });
  };

  const syncGradeLevels = (nextLevels: GradeLevel[]) => {
    const sorted = sortGradeLevels(nextLevels);
    setModelSnapshot({ ...modelSnapshot, gradeLevels: sorted });
  };

  const handleResetGradeLevels = () => {
    syncGradeLevels(createDefaultGradeLevels(modelSnapshot.totalScoreMode));
  };

  const handleDeleteGradeLevel = (id: string) => {
    if (editingGradeLevels.length <= 2) {
      message.warning('至少保留两个等级');
      return;
    }
    const target = editingGradeLevels.find((item) => item.id === id);
    openDeleteConfirm(`确认删除等级「${target?.name || ''}」？`, () => {
      syncGradeLevels(editingGradeLevels.filter((item) => item.id !== id));
      message.success('等级已删除');
    });
  };

  const handleAddGradeLevel = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const label = alphabet[Math.min(editingGradeLevels.length, alphabet.length - 1)] || `L${editingGradeLevels.length + 1}`;
    const next: GradeLevel = {
      id: `g-${Date.now()}`,
      name: label,
      minScore: 0,
      color: '#9ca3af',
    };
    syncGradeLevels([...editingGradeLevels, next]);
  };

  const openRuleDialog = (type: 'veto' | 'bonus') => {
    setRuleDialog({
      open: true,
      type,
      name: '',
      description: '',
      score: 5,
    });
  };

  const closeRuleDialog = () => {
    setRuleDialog((prev) => ({ ...prev, open: false }));
  };

  const openDeleteConfirm = (title: string, onConfirm: () => void, content = '该操作不可恢复，请确认是否继续。') => {
    setDeleteConfirm({
      open: true,
      title,
      content,
      onConfirm,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const submitDeleteConfirm = () => {
    const action = deleteConfirm.onConfirm;
    closeDeleteConfirm();
    action?.();
  };

  const handleSubmitRuleDialog = () => {
    const name = ruleDialog.name.trim();
    if (!name) {
      message.error('请输入规则名称');
      return;
    }

    if (ruleDialog.type === 'veto') {
      const nextVetoRules = [
        ...modelSnapshot.vetoRules,
        {
          id: createRuleId('v'),
          name,
          description: ruleDialog.description.trim() || '未填写规则说明',
        },
      ];
      setModelSnapshot({
        ...modelSnapshot,
        vetoRules: nextVetoRules,
      });
      closeRuleDialog();
      message.success('否决规则已添加');
      return;
    }

    if (ruleDialog.score <= 0) {
      message.error('加分值必须大于 0');
      return;
    }

    const nextBonusRules = [
      ...modelSnapshot.bonusRules,
      {
        id: createRuleId('b'),
        name,
        score: Math.round(ruleDialog.score),
      },
    ];
    setModelSnapshot({
      ...modelSnapshot,
      bonusRules: nextBonusRules,
    });
    closeRuleDialog();
    message.success('加分规则已添加');
  };

  const handleDeleteVetoRule = (ruleId: string) => {
    const target = modelSnapshot.vetoRules.find((rule) => rule.id === ruleId);
    openDeleteConfirm(`确认删除否决规则「${target?.name || ''}」？`, () => {
      useAgentStore.setState((state) => {
        if (!state.modelSnapshot) {
          return {};
        }
        return {
          modelSnapshot: {
            ...state.modelSnapshot,
            vetoRules: state.modelSnapshot.vetoRules.filter((rule) => rule.id !== ruleId),
          },
        };
      });
      message.success('否决规则已删除');
    });
  };

  const handleDeleteBonusRule = (ruleId: string) => {
    const target = modelSnapshot.bonusRules.find((rule) => rule.id === ruleId);
    openDeleteConfirm(`确认删除加分规则「${target?.name || ''}」？`, () => {
      useAgentStore.setState((state) => {
        if (!state.modelSnapshot) {
          return {};
        }
        return {
          modelSnapshot: {
            ...state.modelSnapshot,
            bonusRules: state.modelSnapshot.bonusRules.filter((rule) => rule.id !== ruleId),
          },
        };
      });
      message.success('加分规则已删除');
    });
  };

  const handlePublicCreditWeightChange = (value: number | null) => {
    if (value === null) {
      return;
    }

    const weight = Math.round(value);
    if (weight < 10) {
      message.error('公共信用综合评价权重不能低于 10%');
      return;
    }

    const nextIndicators = publicCreditNodeId
      ? rebalanceRootWeights(modelSnapshot.indicators, publicCreditNodeId, weight)
      : modelSnapshot.indicators;

    setModelSnapshot({
      ...modelSnapshot,
      publicCreditWeight: weight,
      indicators: nextIndicators,
    });
  };

  const handleDeleteIndicator = (record: IndicatorNode) => {
    if (publicCreditNodeId && record.id === publicCreditNodeId) {
      message.warning('公共信用综合评价指标为必选项，不能删除');
      return;
    }

    Modal.confirm({
      title: `确认删除「${record.name}」?`,
      content: '删除后将移除其所有下级指标。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const nextIndicators = removeNodeById(modelSnapshot.indicators, record.id);
        if (nextIndicators.length === 0) {
          message.warning('模型至少需要保留一个一级指标');
          return;
        }
        setModelSnapshot({ ...modelSnapshot, indicators: nextIndicators });
      },
    });
  };

  const handleSubmitDrawer = () => {
    if (!targetNode) {
      return;
    }

    const name = drawerForm.name.trim();
    if (!name) {
      message.error('请输入指标名称');
      return;
    }

    if (drawerForm.weight < 0 || drawerForm.weight > 100) {
      message.error('权重范围必须在 0-100 之间');
      return;
    }

    if (drawerMode === 'edit' && publicCreditNodeId && targetNode.id === publicCreditNodeId) {
      const weight = Math.round(drawerForm.weight);
      if (weight < 10) {
        message.error('公共信用综合评价权重不能低于 10%');
        return;
      }
      const nextIndicators = rebalanceRootWeights(modelSnapshot.indicators, publicCreditNodeId, weight);
      setModelSnapshot({
        ...modelSnapshot,
        publicCreditWeight: weight,
        indicators: nextIndicators,
      });
      setIsDrawerOpen(false);
      message.success('公共信用综合评价权重已更新');
      return;
    }

    if (drawerForm.ruleType === 'ratio' && drawerForm.ratioRule.targetValue <= 0) {
      message.error('比例评分的目标值必须大于 0');
      return;
    }

    if (drawerForm.ruleType === 'cumulative' && drawerForm.cumulativeRule.unitCount <= 0) {
      message.error('累计计分的单位步长必须大于 0');
      return;
    }

    const selectedDataIndicator =
      DATA_INDICATOR_OPTIONS.find((item) => item.key === drawerForm.dataIndicatorKey) || DATA_INDICATOR_OPTIONS[0];
    const parentNodeForEdit = drawerMode === 'edit' ? findParentNodeByChildId(modelSnapshot.indicators, targetNode.id) : null;

    if (drawerMode === 'add') {
      const nextLevel = Math.min(targetNode.level + 1, 3) as 1 | 2 | 3;
      const type = nextLevel === 3 ? 'leaf' : drawerForm.indicatorType;
      const newNode: IndicatorNode = {
        id: createIndicatorId(),
        name,
        level: nextLevel,
        weight: drawerForm.weight,
        direction: drawerForm.direction,
        description: drawerForm.description.trim() || undefined,
      };

      if (type === 'category' && nextLevel < 3) {
        newNode.children = [];
      } else {
        newNode.ruleType = drawerForm.ruleType;
        newNode.dataSource = toDataSourceLabel(selectedDataIndicator);
        newNode.ruleConfig = {
          intervalRanges: drawerForm.intervalRanges.map((item) => ({ ...item })),
          thresholdRule: { ...drawerForm.thresholdRule },
          linearRule: { ...drawerForm.linearRule },
          ratioRule: { ...drawerForm.ratioRule },
          cumulativeRule: { ...drawerForm.cumulativeRule },
        };
      }

      const nextIndicators = addChildNode(modelSnapshot.indicators, targetNode.id, newNode);
      setModelSnapshot({ ...modelSnapshot, indicators: nextIndicators });
      setIsDrawerOpen(false);
      const issue = getNodeChildWeightIssue(nextIndicators, targetNode.id);
      if (issue) {
        message.warning(`指标已添加。${formatWeightIssueText(issue)}`);
      } else {
        message.success('指标已添加');
      }
      return;
    }

    if (targetNode.children && targetNode.children.length > 0 && drawerForm.indicatorType === 'leaf') {
      message.warning('当前指标存在子指标，不能设置为叶子指标');
      return;
    }

    const nextIndicators = updateNodeById(modelSnapshot.indicators, targetNode.id, (node) => {
      const hasChildren = !!(node.children && node.children.length > 0);
      return {
        ...node,
        name,
        weight: drawerForm.weight,
        direction: drawerForm.direction,
        description: drawerForm.description.trim() || undefined,
        ruleType: hasChildren ? node.ruleType : drawerForm.ruleType,
        dataSource: hasChildren ? node.dataSource : toDataSourceLabel(selectedDataIndicator),
        ruleConfig: hasChildren
          ? node.ruleConfig
          : {
              intervalRanges: drawerForm.intervalRanges.map((item) => ({ ...item })),
              thresholdRule: { ...drawerForm.thresholdRule },
              linearRule: { ...drawerForm.linearRule },
              ratioRule: { ...drawerForm.ratioRule },
              cumulativeRule: { ...drawerForm.cumulativeRule },
            },
      };
    });

    setModelSnapshot({ ...modelSnapshot, indicators: nextIndicators });
    setIsDrawerOpen(false);
    if (parentNodeForEdit) {
      const issue = getNodeChildWeightIssue(nextIndicators, parentNodeForEdit.id);
      if (issue) {
        message.warning(`指标已更新。${formatWeightIssueText(issue)}`);
        return;
      }
    }
    message.success('指标已更新');
  };

  const handlePublishModel = () => {
    const issues = collectChildWeightIssues(modelSnapshot.indicators);
    if (issues.length > 0) {
      const preview = issues
        .slice(0, 2)
        .map((issue) => `${issue.parentName}(${issue.totalWeight}%)`)
        .join('、');
      const suffix = issues.length > 2 ? ' 等' : '';
      message.error(`存在 ${issues.length} 处同级权重异常（需为100%）：${preview}${suffix}`);
      return;
    }
    message.success('当前模型已暂存（演示态）');
  };

  const handleStartValidation = () => {
    setPhase('VALIDATING');
    setValidationStep('checking');
  };

  const handleExportCSV = () => {
    const levelHeaders = levelSummaryItems.map((item) => item.label);
    const headers = [...levelHeaders, '指标说明', '评分指向', '评分规则', '数据来源'];
    const rows = previewRows.map((row) =>
      [...levelSummaryItems.map((item) => row.levelValues[item.level] || '-'), row.description, row.directionLabel, row.ruleText, row.dataSource]
        .map((cell) => `"${(cell || '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '行业信用评价模型_导出.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnsType<IndicatorNode> = [
    {
      title: '指标项',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const paddingLeft = record.level ? (record.level - 1) * 32 : 0;
        const isExpanded = expandedRowKeys.includes(record.id);
        const hasChildren = !!(record.children && record.children.length > 0);
        const weightIssue = childWeightIssueMap.get(record.id);
        const showExtraMeta = isSidebarCollapsed && (showCollapsedDescription || showCollapsedRule);
        const textClass =
          record.level === 1
            ? 'text-gray-900 font-semibold text-[15px]'
            : record.level === 2
              ? 'text-gray-800 font-medium text-[14px]'
              : 'text-gray-700 font-medium text-[13px]';

        const toggleExpand = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isExpanded) {
            setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.id));
          } else {
            setExpandedRowKeys([...expandedRowKeys, record.id]);
          }
        };

        return (
          <div className="flex items-center justify-between w-full pr-4" style={{ paddingLeft }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={toggleExpand}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-5 h-5 inline-block shrink-0" />
              )}
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className={textClass}>
                    {text}{' '}
                    {record.weight !== undefined && (
                      <span className="text-[11px] text-gray-400 font-normal ml-1">({record.weight}%)</span>
                    )}
                    {hasChildren && weightIssue && (
                      <span className="ml-2 text-[11px] font-medium text-red-500">子项合计 {weightIssue.totalWeight}%</span>
                    )}
                  </span>
                  <Tag
                    color={record.direction === 'negative' ? 'error' : 'processing'}
                    className="!m-0 !px-1.5 !py-0 !text-[10px] !leading-5"
                  >
                    {record.direction === 'negative' ? '负向' : '正向'}
                  </Tag>
                  <Tag color={getRuleTypeTagColor(record)} className="!m-0 !px-1.5 !py-0 !text-[10px] !leading-5">
                    {getRuleTypeTagLabel(record)}
                  </Tag>
                </div>
                {showExtraMeta && (
                  <div className="flex flex-col gap-0.5 max-w-[900px]">
                    {showCollapsedDescription && (
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        描述：{record.description?.trim() || '暂无描述'}
                      </div>
                    )}
                    {showCollapsedRule && (
                      <div className="text-[11px] text-gray-500 line-clamp-1">规则：{getRuleSummaryText(record)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {hasChildren && (
                <button
                  className={`p-1.5 rounded shadow-sm text-xs flex items-center gap-1 mr-2 transition-colors ${
                    weightExpandId === record.id
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-500 hover:bg-purple-50 border border-purple-100'
                  }`}
                  title="平衡权重"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWeightExpandId(weightExpandId === record.id ? null : record.id);
                  }}
                >
                  <span className="font-bold">⚖️</span>
                </button>
              )}
              <button
                className="text-gray-400 hover:text-blue-500 hover:bg-gray-100 p-1.5 rounded"
                title="添加下级"
                onClick={() => openDrawer('add', record)}
              >
                <Plus size={14} />
              </button>
              <button
                className="text-gray-400 hover:text-blue-500 hover:bg-gray-100 p-1.5 rounded"
                title="设置"
                onClick={() => openDrawer('edit', record)}
              >
                <Settings size={14} />
              </button>
              <button
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded"
                title="删除"
                onClick={() => handleDeleteIndicator(record)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      },
    },
  ];

  const isEditingNonLeafNode = drawerMode === 'edit' && !!(targetNode?.children && targetNode.children.length > 0);
  const isEditingPublicCreditIndicator =
    drawerMode === 'edit' && !!targetNode && !!publicCreditNodeId && targetNode.id === publicCreditNodeId;
  const nextLevelForAdd = drawerMode === 'add' && targetNode ? Math.min(targetNode.level + 1, 3) : null;
  const isLeafConfigMode =
    !isEditingNonLeafNode &&
    (drawerForm.indicatorType === 'leaf' ||
      (drawerMode === 'edit' && !!targetNode && (!targetNode.children || targetNode.children.length === 0)) ||
      nextLevelForAdd === 3);
  const selectedDataIndicator =
    DATA_INDICATOR_OPTIONS.find((item) => item.key === drawerForm.dataIndicatorKey) || DATA_INDICATOR_OPTIONS[0];
  const aiRecommendation = getRuleRecommendation({
    name: drawerForm.name,
    description: drawerForm.description,
    direction: drawerForm.direction,
    dataIndicator: selectedDataIndicator,
  });
  const recommendedRuleTypeLabels = aiRecommendation.recommendedRuleTypes.map((type) => RULE_TYPE_LABEL[type]).join('、');
  const publicCreditIndicatorRange = modelSnapshot.totalScoreMode === 100 ? '0 ~ 100' : '0 ~ 1000';
  const childWeightIssues = collectChildWeightIssues(modelSnapshot.indicators);
  const childWeightIssueMap = new Map(childWeightIssues.map((issue) => [issue.parentId, issue]));

  const applyAiRecommendation = () => {
    setDrawerForm((prev) => ({
      ...prev,
      ruleType: aiRecommendation.topRuleType,
      intervalRanges: aiRecommendation.intervalRanges.map((item) => ({ ...item, id: createRangeId() })),
      thresholdRule: { ...aiRecommendation.thresholdRule },
      linearRule: { ...aiRecommendation.linearRule },
      ratioRule: { ...aiRecommendation.ratioRule },
      cumulativeRule: { ...aiRecommendation.cumulativeRule },
    }));
    message.success(`已应用推荐：${RULE_TYPE_LABEL[aiRecommendation.topRuleType]}`);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-6 pb-4 border-b border-gray-100 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 tracking-tight">行业信用评价模型控制台</h2>
          <p className="text-sm text-gray-500 mt-1">您可以自由浏览、调节下方的模型指标和计分算法</p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm bg-white hover:bg-gray-50 font-medium transition-colors"
            onClick={() => setIsPreviewVisible(true)}
          >
            模型查看
          </button>
          <button
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm bg-white hover:bg-gray-50 font-medium transition-colors"
            onClick={handlePublishModel}
          >
            保存发布
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm ml-2"
            onClick={handleStartValidation}
          >
            启动模型验算
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        <div className="w-[340px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="font-semibold text-gray-800 text-base">模型调节规则</h3>
            <span className="text-xs text-gray-400">规则配置</span>
          </div>

          <div className="p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    modelSnapshot.totalScoreMode === 100 ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => handleScoreModeChange(100)}
                >
                  百分制
                </button>
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    modelSnapshot.totalScoreMode === 1000 ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => handleScoreModeChange(1000)}
                >
                  千分制
                </button>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">公共信用综合评价权重</span>
                  <span className="text-xs text-gray-400">国标下限 10%</span>
                </div>
                <InputNumber
                  className="w-full"
                  min={10}
                  max={100}
                  addonAfter="%"
                  value={modelSnapshot.publicCreditWeight}
                  onChange={handlePublicCreditWeightChange}
                />
                <div className="text-xs text-gray-500 mt-2">行业专项指标可用权重：{Math.max(0, 100 - modelSnapshot.publicCreditWeight)}%</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">评分等级</span>
                  <button
                    className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-700"
                    onClick={handleResetGradeLevels}
                  >
                    <RefreshCw size={12} />重置
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {editingGradeLevels.map((lvl) => (
                    <div key={lvl.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100 relative group">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: lvl.color }} />
                      <div className="w-16 h-8 rounded-md border border-gray-200 bg-white text-gray-800 font-semibold flex items-center justify-center shrink-0">
                        {lvl.name}
                      </div>
                      <span className="text-gray-400 font-medium">≥</span>
                      <InputNumber
                        className="w-28"
                        size="small"
                        min={0}
                        max={modelSnapshot.totalScoreMode}
                        controls={false}
                        value={lvl.minScore}
                        onChange={(value) => {
                          if (value === null) return;
                          syncGradeLevels(
                            editingGradeLevels.map((item) =>
                              item.id === lvl.id ? { ...item, minScore: Math.round(value) } : item,
                            ),
                          );
                        }}
                      />
                      <button
                        className="ml-auto text-gray-400 hover:text-red-500 p-1 transition-colors"
                        onClick={() => handleDeleteGradeLevel(lvl.id)}
                        title="删除等级"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-sm text-blue-600 border border-dashed border-blue-200 rounded-lg py-1.5 mt-1 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                    onClick={handleAddGradeLevel}
                  >
                    + 添加等级
                  </button>
                </div>
              </div>
            </div>

            <Divider className="!my-0" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-800 cursor-pointer">
                <span className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" /> 一票否决规则
                  <span className="bg-red-100 text-red-600 text-xs px-1.5 rounded-full">{modelSnapshot.vetoRules?.length || 0}</span>
                </span>
                <span className="text-gray-400">^</span>
              </div>
              <div className="flex flex-col gap-2">
                {modelSnapshot.vetoRules?.map((rule) => (
                  <div key={rule.id} className="bg-red-50/50 p-3 rounded-lg border border-red-100 relative">
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-gray-400 hover:text-red-500 p-1 transition-colors"
                      title="删除规则"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteVetoRule(rule.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="text-sm font-medium text-gray-800 mb-1 pr-6">{rule.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-2" title={rule.description}>
                      {rule.description}
                    </div>
                  </div>
                ))}
                <button
                  className="text-sm text-red-500 border border-dashed border-red-300 rounded-lg py-2 mt-1 hover:bg-red-50 transition-colors"
                  onClick={() => openRuleDialog('veto')}
                >
                  + 添加规则
                </button>
              </div>
            </div>

            <Divider className="!my-0" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-800 cursor-pointer">
                <span className="flex items-center gap-2">
                  <Zap size={16} className="text-green-500" /> 加分项规则
                  <span className="bg-green-100 text-green-600 text-xs px-1.5 rounded-full">{modelSnapshot.bonusRules?.length || 0}</span>
                </span>
                <span className="text-gray-400">^</span>
              </div>
              <div className="flex flex-col gap-2">
                {modelSnapshot.bonusRules?.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-green-50/50 p-3 rounded-lg border border-green-100 flex items-center justify-between gap-2"
                  >
                    <div className="text-sm font-medium text-gray-800 truncate pr-2">{rule.name}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tag color="success" className="!m-0 !text-xs">
                        +{rule.score}
                      </Tag>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="删除规则"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteBonusRule(rule.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="text-sm text-green-600 border border-dashed border-green-300 rounded-lg py-2 mt-1 hover:bg-green-50 transition-colors"
                  onClick={() => openRuleDialog('bonus')}
                >
                  + 添加规则
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            {isEditingModelName ? (
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  autoFocus
                  value={modelNameDraft}
                  onChange={(e) => setModelNameDraft(e.target.value)}
                  onPressEnter={commitModelName}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      cancelEditModelName();
                    }
                  }}
                  className="w-[360px] max-w-[42vw] h-8"
                  placeholder="请输入评价模型名称"
                />
                <button
                  type="button"
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                  onClick={commitModelName}
                  title="保存名称"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                  onClick={cancelEditModelName}
                  title="取消修改"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h3 className="font-semibold text-gray-800 text-base flex items-center gap-2 min-w-0">
                <span className="truncate max-w-[46vw]">{previewModelName}</span>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  onClick={beginEditModelName}
                  title="编辑名称"
                >
                  <Pencil size={14} />
                </button>
              </h3>
            )}
            <div className="flex items-center gap-2">
              {isSidebarCollapsed && (
                <div className="mr-1 pl-2 border-l border-gray-200 flex items-center gap-3">
                  <span className="text-[11px] text-gray-500">附加信息</span>
                  <label className="flex items-center gap-1 text-[11px] text-gray-600">
                    描述
                    <Switch size="small" checked={showCollapsedDescription} onChange={setShowCollapsedDescription} />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-gray-600">
                    规则
                    <Switch size="small" checked={showCollapsedRule} onChange={setShowCollapsedRule} />
                  </label>
                </div>
              )}
              <button
                className="flex items-center gap-1.5 text-xs text-purple-600 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors mr-2"
                onClick={() => setIsPreviewVisible(true)}
              >
                <Eye size={14} /> 模型预览
              </button>
              <Select
                defaultValue="expand-l1"
                size="small"
                className="w-28 text-xs"
                onChange={(value) => {
                  if (value === 'expand-l1') {
                    setExpandedRowKeys(modelSnapshot.indicators.map((item) => item.id));
                    return;
                  }
                  if (value === 'expand-all') {
                    setExpandedRowKeys(getAllNodeIds(modelSnapshot.indicators));
                    return;
                  }
                  if (value === 'collapse-all') {
                    setExpandedRowKeys([]);
                  }
                }}
                options={[
                  { value: 'expand-l1', label: '展开一级' },
                  { value: 'expand-all', label: '全部展开' },
                  { value: 'collapse-all', label: '全部收起' },
                ]}
              />
            </div>
          </div>
          {childWeightIssues.length > 0 && (
            <div className="mx-3 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              检测到同级权重未归一（应为 100%）：{childWeightIssues.slice(0, 3).map((issue) => `${issue.parentName}=${issue.totalWeight}%`).join('、')}
              {childWeightIssues.length > 3 ? ' ...' : ''}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2">
            <Table<IndicatorNode>
              columns={columns}
              dataSource={modelSnapshot.indicators}
              rowKey="id"
              pagination={false}
              size="middle"
              showHeader={false}
              expandable={{
                expandedRowKeys: Array.from(new Set([...expandedRowKeys, ...(weightExpandId ? [weightExpandId] : [])])),
                onExpandedRowsChange: (keys) => {
                  const newKeys = (keys as React.Key[]).filter((key) => key !== weightExpandId);
                  setExpandedRowKeys(newKeys);
                },
                expandIconColumnIndex: -1,
                indentSize: 0,
                expandedRowRender: (record) => {
                  if (weightExpandId !== record.id || !record.children || record.children.length === 0) {
                    return null;
                  }
                  return (
                    <DraggableWeightBar
                      node={record}
                      onCancel={() => setWeightExpandId(null)}
                      onSave={(weights) => handleSaveWeights(record.id, weights)}
                    />
                  );
                },
                rowExpandable: (record) => weightExpandId === record.id,
              }}
              rowClassName="group hover:bg-gray-50/50 transition-colors"
              className="[&_.ant-table-cell]:!border-b-gray-100 [&_.ant-table-row-level-0>td]:bg-gray-50/30 [&_.ant-table-row-level-0>td]:font-semibold [&_.ant-table-row-level-0]:border-y [&_.ant-table-row-level-0]:border-gray-200"
            />
          </div>
        </div>
      </div>

      <Modal
        title={deleteConfirm.title || '确认删除'}
        open={deleteConfirm.open}
        centered
        onOk={submitDeleteConfirm}
        onCancel={closeDeleteConfirm}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        maskClosable={false}
      >
        <div className="text-sm text-gray-600 leading-6">{deleteConfirm.content || '该操作不可恢复，请确认是否继续。'}</div>
      </Modal>

      <Modal
        title={ruleDialog.type === 'veto' ? '新增否决规则' : '新增加分规则'}
        open={ruleDialog.open}
        onCancel={closeRuleDialog}
        onOk={handleSubmitRuleDialog}
        okText="确认添加"
        cancelText="取消"
        okButtonProps={{ className: 'bg-blue-600' }}
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">规则名称</label>
            <Input
              value={ruleDialog.name}
              onChange={(event) => setRuleDialog((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={ruleDialog.type === 'veto' ? '例如：发生重大安全生产事故' : '例如：获得国家级科技奖项'}
            />
          </div>

          {ruleDialog.type === 'veto' ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">规则说明</label>
              <Input.TextArea
                rows={3}
                value={ruleDialog.description}
                onChange={(event) => setRuleDialog((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="请输入触发该否决项的具体条件或依据条款"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">加分值</label>
              <InputNumber
                className="w-full"
                min={1}
                max={100}
                addonBefore="+"
                value={ruleDialog.score}
                onChange={(value) => setRuleDialog((prev) => ({ ...prev, score: Math.round(value || 0) }))}
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2 text-gray-800">
            <Eye size={18} className="text-blue-500" />
            {previewModelName}
          </div>
        }
        open={isPreviewVisible}
        onCancel={closePreviewModal}
        width={isPreviewFullscreen ? '96vw' : 1320}
        style={{ top: isPreviewFullscreen ? 8 : 18 }}
        bodyStyle={{ padding: '14px 16px', height: isPreviewFullscreen ? 'calc(100vh - 150px)' : '74vh' }}
        footer={[
          <Button
            key="fullscreen"
            onClick={() => setIsPreviewFullscreen((prev) => !prev)}
            className="border-gray-200"
          >
            {isPreviewFullscreen ? '退出全屏' : '全屏查看'}
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            className="flex items-center gap-1 bg-blue-600"
          >
            下载为 CSV
          </Button>,
          <Button
            key="close"
            onClick={closePreviewModal}
          >
            关闭阅览
          </Button>,
        ]}
      >
        <div className="h-full flex flex-col gap-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="text-lg font-semibold text-gray-800">{previewModelName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
              {levelSummaryItems.map((item) => (
                <span key={`summary-level-${item.level}`}>
                  {item.label} <span className="text-indigo-600 font-semibold">{item.count}</span>
                </span>
              ))}
              <span>
                评分机制 <span className="text-indigo-600 font-semibold">{previewSummary.scoreModeLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsGradeRangeVisible(true)}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                等级数 <span className="text-indigo-600 font-semibold">{previewSummary.gradeCount}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRulePanelFocus('veto');
                  setIsRulePanelVisible(true);
                }}
                className="text-red-600 hover:text-red-700 hover:underline"
              >
                否决项 <span className="font-semibold">{previewSummary.vetoCount}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRulePanelFocus('bonus');
                  setIsRulePanelVisible(true);
                }}
                className="text-green-600 hover:text-green-700 hover:underline"
              >
                加分项 <span className="font-semibold">{previewSummary.bonusCount}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
            <Table
              columns={previewColumns}
              dataSource={previewRows}
              pagination={false}
              size="small"
              rowKey="id"
              scroll={{ x: previewTableMinWidth, y: isPreviewFullscreen ? 560 : 420 }}
              className="[&_.ant-table-thead_th]:!bg-gray-50/80 [&_.ant-table-thead_th]:!font-medium [&_.ant-table-cell]:align-top"
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="等级与分值关系"
        open={isGradeRangeVisible}
        onCancel={() => setIsGradeRangeVisible(false)}
        width={680}
        footer={[
          <Button key="close" onClick={() => setIsGradeRangeVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <Table
            columns={gradeRangeColumns}
            dataSource={gradeRangeRows}
            rowKey="id"
            pagination={false}
            size="small"
            className="[&_.ant-table-thead_th]:!bg-gray-50/80"
          />
          <div className="mt-3 text-xs text-gray-500">
            区间口径：当前等级最低分 ≤ 得分 ≤ 当前等级最高分；当前为{modelSnapshot.totalScoreMode === 100 ? '百分制' : '千分制'}。
          </div>
        </div>
      </Modal>

      <Modal
        title="否决项与加分项规则"
        open={isRulePanelVisible}
        onCancel={() => setIsRulePanelVisible(false)}
        width={isPreviewFullscreen ? '94vw' : 1100}
        footer={[
          <Button key="close" onClick={() => setIsRulePanelVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div className="max-h-[68vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4 pr-1">
          <div
            className={`rounded-lg p-3 border ${
              rulePanelFocus === 'veto' ? 'border-red-300 bg-red-50/50' : 'border-red-200 bg-red-50/30'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-red-700">一票否决规则</div>
              <span className="text-xs text-red-600">{modelSnapshot.vetoRules.length} 项</span>
            </div>
            <div className="flex flex-col gap-3">
              {modelSnapshot.vetoRules.length > 0 ? (
                modelSnapshot.vetoRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-red-200 bg-white/80 p-3">
                    <div className="text-sm font-semibold text-red-700 mb-1">{rule.name}</div>
                    <div className="text-xs text-gray-600 leading-6">{rule.description}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-red-200 p-3 text-xs text-gray-500">暂无否决项规则</div>
              )}
            </div>
          </div>
          <div
            className={`rounded-lg p-3 border ${
              rulePanelFocus === 'bonus' ? 'border-green-300 bg-green-50/50' : 'border-green-200 bg-green-50/30'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-green-700">加分项规则</div>
              <span className="text-xs text-green-600">{modelSnapshot.bonusRules.length} 项</span>
            </div>
            <div className="flex flex-col gap-3">
              {modelSnapshot.bonusRules.length > 0 ? (
                modelSnapshot.bonusRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-green-200 bg-white/80 p-3 flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-800 leading-6">{rule.name}</div>
                    <Tag color="success" className="!m-0 !text-sm !font-semibold">
                      +{rule.score}
                    </Tag>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-green-200 p-3 text-xs text-gray-500">暂无加分项规则</div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Drawer
        title={<div className="flex items-center gap-2">{drawerMode === 'add' ? `在「${targetNode?.name}」下添加子指标` : '编辑指标属性'}</div>}
        width={680}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        bodyStyle={{ padding: '24px' }}
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsDrawerOpen(false)}>取消</Button>
            <Button type="primary" className="bg-blue-600" onClick={handleSubmitDrawer}>
              {drawerMode === 'add' ? '添加' : '保存修改'}
            </Button>
          </div>
        }
      >
        {isEditingNonLeafNode ? (
          <div className="flex flex-col gap-6">
            <div className={`grid gap-4 ${isEditingPublicCreditIndicator ? 'grid-cols-[2fr_1fr]' : 'grid-cols-[2fr_1fr_1fr]'}`}>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> 指标名称
                </label>
                <Input
                  placeholder="请输入指标名称"
                  value={drawerForm.name}
                  onChange={(e) => setDrawerForm({ ...drawerForm, name: e.target.value })}
                  className="h-8"
                  disabled={isEditingPublicCreditIndicator}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> 权重 (%)
                </label>
                <InputNumber
                  addonAfter="%"
                  className="w-full h-8"
                  min={0}
                  max={100}
                  value={drawerForm.weight}
                  onChange={(value) => setDrawerForm({ ...drawerForm, weight: Math.round(value || 0) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  指标方向 <CircleHelp size={14} className="text-gray-400" />
                </label>
                <Radio.Group
                  value={drawerForm.direction}
                  onChange={(e) => setDrawerForm({ ...drawerForm, direction: e.target.value })}
                  className="w-full"
                >
                  <Radio.Button value="positive" className="w-1/2 text-center">
                    ↑ 正向
                  </Radio.Button>
                  <Radio.Button value="negative" className="w-1/2 text-center text-red-500">
                    ↓ 负向
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">指标描述</label>
              <Input.TextArea
                placeholder="描述该指标的含义、计算方式或评判标准..."
                rows={4}
                maxLength={500}
                value={drawerForm.description}
                onChange={(e) => setDrawerForm({ ...drawerForm, description: e.target.value })}
                className="text-sm"
              />
              <div className="text-right text-xs text-gray-400">{drawerForm.description.length} / 500</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-gray-500">
              该指标包含子指标，得分将根据子指标的加权得分自动计算。
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {drawerMode === 'add' && (
              <div className="flex flex-col gap-2">
                <div className="text-blue-600 font-medium text-sm mb-1">选择指标类型</div>
                <Radio.Group
                  value={drawerForm.indicatorType}
                  buttonStyle="solid"
                  className="w-full flex shadow-sm rounded-lg overflow-hidden"
                  disabled={nextLevelForAdd === 3}
                  onChange={(e) => setDrawerForm({ ...drawerForm, indicatorType: e.target.value })}
                >
                  <Radio.Button value="leaf" className="flex-1 text-center py-1 h-auto leading-normal">
                    <span className="font-medium">🍃 叶子指标</span>{' '}
                    <span className="text-gray-400 text-xs ml-1">(可配置评分规则)</span>
                  </Radio.Button>
                  <Radio.Button value="category" className="flex-1 text-center py-1 h-auto leading-normal">
                    <span className="font-medium">📁 分类指标</span>{' '}
                    <span className="text-gray-400 text-xs ml-1">(包含子指标)</span>
                  </Radio.Button>
                </Radio.Group>
              </div>
            )}

            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> 指标名称
                </label>
                <Input
                  placeholder="请输入指标名称"
                  value={drawerForm.name}
                  onChange={(e) => setDrawerForm({ ...drawerForm, name: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> 权重 (%)
                </label>
                <InputNumber
                  addonAfter="%"
                  className="w-full h-8"
                  min={0}
                  max={100}
                  value={drawerForm.weight}
                  onChange={(value) => setDrawerForm({ ...drawerForm, weight: Math.round(value || 0) })}
                />
              </div>
              {!isEditingPublicCreditIndicator && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    指标方向 <CircleHelp size={14} className="text-gray-400" />
                  </label>
                  <Radio.Group
                    value={drawerForm.direction}
                    onChange={(e) => setDrawerForm({ ...drawerForm, direction: e.target.value })}
                    className="w-full"
                  >
                    <Radio.Button value="positive" className="w-1/2 text-center">
                      ↑ 正向
                    </Radio.Button>
                    <Radio.Button value="negative" className="w-1/2 text-center text-red-500">
                      ↓ 负向
                    </Radio.Button>
                  </Radio.Group>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">指标描述</label>
              <Input.TextArea
                placeholder="描述该指标的含义、计算方式或评判标准..."
                rows={3}
                maxLength={500}
                value={drawerForm.description}
                onChange={(e) => setDrawerForm({ ...drawerForm, description: e.target.value })}
                className="text-sm"
                disabled={isEditingPublicCreditIndicator}
              />
              <div className="text-right text-xs text-gray-400">{drawerForm.description.length} / 500</div>
            </div>

            {isLeafConfigMode ? (
              isEditingPublicCreditIndicator ? (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center gap-4 mb-1">
                    <Divider className="flex-1 !my-0" />
                    <span className="text-gray-400 text-sm font-medium whitespace-nowrap">公共信用指标配置说明</span>
                    <Divider className="flex-1 !my-0" />
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="text-lg font-semibold text-blue-700 mb-2">
                      {PUBLIC_CREDIT_FIXED_INDICATOR.label} ({PUBLIC_CREDIT_FIXED_INDICATOR.code})
                    </div>
                    <div className="text-blue-700 leading-7 text-sm">
                      <div>数据类型：{PUBLIC_CREDIT_FIXED_INDICATOR.dataType}</div>
                      <div>取值范围：{publicCreditIndicatorRange}</div>
                      <div>特征说明：{PUBLIC_CREDIT_FIXED_INDICATOR.description}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                    评分规则：直接引用“主体公共信用综合评价”现有得分，不在该页面配置评分类型与取值范围。
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    当前仅允许调整该指标权重占比，系统会自动保持一级指标总权重平衡。
                  </div>
                </div>
              ) : (
              <>
                <div className="flex items-center gap-4 mt-2 mb-1">
                  <Divider className="flex-1 !my-0" />
                  <span className="text-gray-400 text-sm font-medium whitespace-nowrap">评分规则配置</span>
                  <Divider className="flex-1 !my-0" />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      关联数据指标 <CircleHelp size={14} className="text-gray-400" />
                    </label>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      value={drawerForm.dataIndicatorKey}
                      onChange={(value) => setDrawerForm({ ...drawerForm, dataIndicatorKey: value })}
                      options={DATA_INDICATOR_OPTIONS.map((option) => ({
                        value: option.key,
                        label: toDataSourceLabel(option),
                      }))}
                    />
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="text-xl font-semibold text-blue-700 mb-2">{selectedDataIndicator.label}</div>
                    <div className="text-blue-700 leading-7 text-sm">
                      <div>数据类型：{selectedDataIndicator.dataType}</div>
                      <div>取值范围：{selectedDataIndicator.valueRange}</div>
                      <div>特征说明：{selectedDataIndicator.description}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">评分类型</label>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs text-blue-500">AI 推荐：{recommendedRuleTypeLabels}</div>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-0.5"
                        onClick={applyAiRecommendation}
                      >
                        一键应用推荐
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{aiRecommendation.reason}</div>
                    <Radio.Group
                      value={drawerForm.ruleType}
                      buttonStyle="solid"
                      onChange={(e) => setDrawerForm({ ...drawerForm, ruleType: e.target.value })}
                    >
                      <Radio.Button value="interval" className="w-24 text-center">
                        区间评分
                      </Radio.Button>
                      <Radio.Button value="threshold" className="w-24 text-center">
                        阈值评分
                      </Radio.Button>
                      <Radio.Button value="linear" className="w-24 text-center">
                        线性评分
                      </Radio.Button>
                      <Radio.Button value="ratio" className="w-24 text-center">
                        比例评分
                      </Radio.Button>
                      <Radio.Button value="cumulative" className="w-24 text-center">
                        累计计分
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {drawerForm.ruleType === 'interval' && (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-t-lg border-x border-t border-gray-100">
                        配置不同数值区间对应的得分（区间规则：最小值 ≤ 数值 {'<'} 最大值）：
                      </div>
                      <div className="bg-gray-50/50 border border-gray-100 rounded-b-lg p-2 flex flex-col gap-2">
                        <div className="grid grid-cols-[1fr_1fr_1fr_24px] gap-3 font-medium text-gray-700 text-sm px-1">
                          <span>最小值(含)</span>
                          <span>最大值(不含)</span>
                          <span>得分比例</span>
                          <span></span>
                        </div>
                        {drawerForm.intervalRanges.map((rangeItem) => (
                          <div
                            key={rangeItem.id}
                            className="grid grid-cols-[1fr_1fr_1fr_24px] gap-3 items-center bg-white p-1.5 rounded-md border border-gray-200 shadow-sm"
                          >
                            <InputNumber
                              className="w-full"
                              size="small"
                              value={rangeItem.min}
                              onChange={(value) =>
                                setDrawerForm((prev) => ({
                                  ...prev,
                                  intervalRanges: prev.intervalRanges.map((item) =>
                                    item.id === rangeItem.id ? { ...item, min: Math.round(value || 0) } : item,
                                  ),
                                }))
                              }
                            />
                            <InputNumber
                              className="w-full"
                              size="small"
                              value={rangeItem.max}
                              onChange={(value) =>
                                setDrawerForm((prev) => ({
                                  ...prev,
                                  intervalRanges: prev.intervalRanges.map((item) =>
                                    item.id === rangeItem.id ? { ...item, max: Math.round(value || 0) } : item,
                                  ),
                                }))
                              }
                            />
                            <InputNumber
                              addonAfter="%"
                              className="w-full"
                              size="small"
                              value={rangeItem.scoreRatio}
                              min={0}
                              max={100}
                              onChange={(value) =>
                                setDrawerForm((prev) => ({
                                  ...prev,
                                  intervalRanges: prev.intervalRanges.map((item) =>
                                    item.id === rangeItem.id ? { ...item, scoreRatio: Math.round(value || 0) } : item,
                                  ),
                                }))
                              }
                            />
                            <button
                              className="text-gray-400 hover:text-red-500 flex justify-center py-1 transition-colors"
                              onClick={() =>
                                setDrawerForm((prev) => ({
                                  ...prev,
                                  intervalRanges:
                                    prev.intervalRanges.length <= 1
                                      ? prev.intervalRanges
                                      : prev.intervalRanges.filter((item) => item.id !== rangeItem.id),
                                }))
                              }
                              title={drawerForm.intervalRanges.length <= 1 ? '至少保留一个区间' : '删除区间'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          className="w-full text-gray-500 mt-2 flex items-center justify-center gap-1 hover:text-blue-500 hover:border-blue-400"
                          onClick={() =>
                            setDrawerForm((prev) => ({
                              ...prev,
                              intervalRanges: [
                                ...prev.intervalRanges,
                                { id: createRangeId(), min: 0, max: 0, scoreRatio: 100 },
                              ],
                            }))
                          }
                        >
                          <Plus size={14} /> 添加区间
                        </Button>
                      </div>
                    </div>
                  )}

                  {drawerForm.ruleType === 'threshold' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3">
                      <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                        <span className="text-sm text-gray-600">判断关系</span>
                        <Select
                          value={drawerForm.thresholdRule.operator}
                          onChange={(value) =>
                            setDrawerForm((prev) => ({
                              ...prev,
                              thresholdRule: { ...prev.thresholdRule, operator: value },
                            }))
                          }
                          options={[
                            { value: '>=', label: '大于等于 (>=)' },
                            { value: '>', label: '大于 (>)' },
                            { value: '<=', label: '小于等于 (<=)' },
                            { value: '<', label: '小于 (<)' },
                            { value: '==', label: '等于 (==)' },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                        <span className="text-sm text-gray-600">阈值</span>
                        <InputNumber
                          className="w-full"
                          value={drawerForm.thresholdRule.threshold}
                          onChange={(value) =>
                            setDrawerForm((prev) => ({
                              ...prev,
                              thresholdRule: { ...prev.thresholdRule, threshold: Math.round(value || 0) },
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                        <span className="text-sm text-gray-600">得分比例</span>
                        <InputNumber
                          addonAfter="%"
                          className="w-full"
                          min={0}
                          max={100}
                          value={drawerForm.thresholdRule.passScoreRatio}
                          onChange={(value) =>
                            setDrawerForm((prev) => ({
                              ...prev,
                              thresholdRule: { ...prev.thresholdRule, passScoreRatio: Math.round(value || 0) },
                            }))
                          }
                        />
                        <InputNumber
                          addonAfter="%"
                          className="w-full"
                          min={0}
                          max={100}
                          value={drawerForm.thresholdRule.failScoreRatio}
                          onChange={(value) =>
                            setDrawerForm((prev) => ({
                              ...prev,
                              thresholdRule: { ...prev.thresholdRule, failScoreRatio: Math.round(value || 0) },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {drawerForm.ruleType === 'linear' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">最小值</span>
                          <InputNumber
                            className="w-full"
                            value={drawerForm.linearRule.min}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                linearRule: { ...prev.linearRule, min: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">最大值</span>
                          <InputNumber
                            className="w-full"
                            value={drawerForm.linearRule.max}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                linearRule: { ...prev.linearRule, max: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">最小值对应得分</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.linearRule.minScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                linearRule: { ...prev.linearRule, minScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">最大值对应得分</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.linearRule.maxScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                linearRule: { ...prev.linearRule, maxScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {drawerForm.ruleType === 'ratio' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3">
                      <div className="text-xs text-gray-500">
                        比例评分公式：得分比例 = clamp(实际值 / 目标值 × 100, 下限, 上限)
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">目标值</span>
                          <InputNumber
                            className="w-full"
                            min={0}
                            value={drawerForm.ratioRule.targetValue}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                ratioRule: { ...prev.ratioRule, targetValue: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">下限得分比例</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.ratioRule.floorScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                ratioRule: { ...prev.ratioRule, floorScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">上限得分比例</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.ratioRule.capScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                ratioRule: { ...prev.ratioRule, capScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {drawerForm.ruleType === 'cumulative' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3">
                      <div className="text-xs text-gray-500">
                        累计计分公式：得分比例 = min(基础分 + floor(实际值 / 单位步长) × 单位加分, 上限)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">单位步长</span>
                          <InputNumber
                            className="w-full"
                            min={1}
                            value={drawerForm.cumulativeRule.unitCount}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                cumulativeRule: { ...prev.cumulativeRule, unitCount: Math.max(1, Math.round(value || 1)) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">单位加分</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.cumulativeRule.scorePerUnit}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                cumulativeRule: { ...prev.cumulativeRule, scorePerUnit: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">基础分比例</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.cumulativeRule.baseScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                cumulativeRule: { ...prev.cumulativeRule, baseScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">得分上限</span>
                          <InputNumber
                            addonAfter="%"
                            className="w-full"
                            min={0}
                            max={100}
                            value={drawerForm.cumulativeRule.maxScoreRatio}
                            onChange={(value) =>
                              setDrawerForm((prev) => ({
                                ...prev,
                                cumulativeRule: { ...prev.cumulativeRule, maxScoreRatio: Math.round(value || 0) },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
              )
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-gray-500">
                分类指标不直接评分，仅用于组织子指标结构和聚合权重。
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ModelAdjustPanel;
