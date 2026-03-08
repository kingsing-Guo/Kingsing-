import React, { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Modal, Switch, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Filter, Search, Download } from 'lucide-react';
import { useAgentStore } from '../../store';
import type { IndicatorNode } from '../../types/model';
import { BEIJING_HEATING_VALIDATION_DATASET, type HeatingEnterprise } from '../../mock/beijing-heating-data';

interface IndicatorResult {
  key: string;
  name: string;
  weight: number;
  fullScore: number;
  score: number;
  basis?: string;
  children?: IndicatorResult[];
}

interface EnterpriseResult {
  key: string;
  index: number;
  name: string;
  creditCode: string;
  score: number;
  grade: string;
  bonus: string;
  bonusBasis?: string;
  veto: string;
  vetoBasis?: string;
  details: IndicatorResult[];
}

interface EnterpriseProfile {
  publicCreditScore: number;
  roomTempRate: number;
  complaintRatePer1k: number;
  hotRunStability: number;
  safetySystemPass: boolean;
  safetyIncidentCount: number;
  majorAccident: boolean;
  emergencyDrillRate: number;
  energyIntensity: number;
  cleanHeatRate: number;
  carbonComplianceScore: number;
  hasTechAward: boolean;
  hasSmartPilot: boolean;
  satisfactionTop3Years: boolean;
  onDishonestList: boolean;
  severeHeatSupplyStop: boolean;
}

const GRADE_PALETTE = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

const hashToUnit = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

const collectExpandableKeys = (data: IndicatorResult[]) => {
  const keys: string[] = [];
  const traverse = (items: IndicatorResult[]) => {
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        keys.push(item.key);
        traverse(item.children);
      }
    });
  };
  traverse(data);
  return keys;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ratioByThreshold = (value: number, ranges: Array<{ min: number; ratio: number }>) => {
  const sorted = [...ranges].sort((a, b) => b.min - a.min);
  return sorted.find((item) => value >= item.min)?.ratio ?? sorted[sorted.length - 1]?.ratio ?? 0;
};

const toPercent = (value: number, digits = 1) => Number(value.toFixed(digits));

const buildEnterprisePool = (
  mode: 'database' | 'import',
  sampleCount: number,
  industry: string,
  importedDatasetId: string | null,
): HeatingEnterprise[] => {
  if (mode === 'import' && importedDatasetId === BEIJING_HEATING_VALIDATION_DATASET.id) {
    return BEIJING_HEATING_VALIDATION_DATASET.enterprises.map((item) => ({ ...item }));
  }
  const base = BEIJING_HEATING_VALIDATION_DATASET.enterprises;
  const total = Math.max(1, sampleCount);
  return Array.from({ length: total }).map((_, idx) => {
    const source = base[idx % base.length];
    const round = Math.floor(idx / base.length);
    const industryPrefix = industry === 'all' ? '' : `${industry}-`;
    return {
      creditCode: round === 0 ? source.creditCode : `${source.creditCode}-${round + 1}`,
      name: `${industryPrefix}${source.name}${round === 0 ? '' : `（样本${round + 1}）`}`,
    };
  });
};

const buildProfile = (enterprise: HeatingEnterprise): EnterpriseProfile => {
  const seed = `${enterprise.creditCode}:${enterprise.name}`;
  const rand = (tag: string) => hashToUnit(`${seed}:${tag}`);
  const incidentSeed = rand('incident');
  const majorAccident = incidentSeed > 0.994;
  const safetyIncidentCount = majorAccident ? 2 : incidentSeed > 0.935 ? 1 : 0;
  return {
    publicCreditScore: Math.round(62 + rand('public-credit') * 35),
    roomTempRate: toPercent(88 + rand('room-temp') * 11, 2),
    complaintRatePer1k: toPercent(0.2 + rand('complaint') * 5.8, 2),
    hotRunStability: toPercent(70 + rand('hot-run') * 30, 2),
    safetySystemPass: rand('safety-system') > 0.16,
    safetyIncidentCount,
    majorAccident,
    emergencyDrillRate: toPercent(68 + rand('drill') * 32, 2),
    energyIntensity: toPercent(24 + rand('energy') * 30, 2),
    cleanHeatRate: toPercent(18 + rand('clean') * 77, 2),
    carbonComplianceScore: toPercent(60 + rand('carbon') * 40, 2),
    hasTechAward: rand('tech-award') > 0.9,
    hasSmartPilot: rand('smart-pilot') > 0.84,
    satisfactionTop3Years: rand('satisfaction') > 0.8,
    onDishonestList: rand('dishonest') > 0.985,
    severeHeatSupplyStop: rand('heat-stop') > 0.988,
  };
};

const evaluateLeafRatio = (
  node: IndicatorNode,
  profile: EnterpriseProfile,
  entityId: string,
  nodeIdx: number,
) => {
  const text = `${node.name} ${node.description || ''} ${node.dataSource || ''}`;

  if (/公共信用综合评价|主体公共信用/.test(text)) {
    const ratio = clamp(profile.publicCreditScore / 100, 0, 1);
    return {
      ratio,
      basis: `公共信用综合得分 ${profile.publicCreditScore}，按比例折算。`,
    };
  }

  if (/室温|达标率/.test(text)) {
    const ratio = ratioByThreshold(profile.roomTempRate, [
      { min: 98, ratio: 1 },
      { min: 95, ratio: 0.9 },
      { min: 92, ratio: 0.75 },
      { min: 0, ratio: 0.5 },
    ]);
    return {
      ratio,
      basis: `室温达标率 ${profile.roomTempRate}%`,
    };
  }

  if (/投诉/.test(text)) {
    const ratio = ratioByThreshold(profile.complaintRatePer1k, [
      { min: 5, ratio: 0.2 },
      { min: 3, ratio: 0.45 },
      { min: 2, ratio: 0.7 },
      { min: 1, ratio: 0.85 },
      { min: 0, ratio: 1 },
    ]);
    return {
      ratio,
      basis: `千户有效投诉率 ${profile.complaintRatePer1k}`,
    };
  }

  if (/热态|稳定|试运行/.test(text)) {
    const ratio = clamp(profile.hotRunStability / 100, 0, 1);
    return {
      ratio,
      basis: `热态试运行稳定性评分 ${profile.hotRunStability}`,
    };
  }

  if (/安全生产制度|制度与执行/.test(text)) {
    return {
      ratio: profile.safetySystemPass ? 1 : 0.45,
      basis: profile.safetySystemPass ? '制度执行核查通过。' : '制度执行存在缺项。',
    };
  }

  if (/安全事故/.test(text)) {
    const ratio = profile.safetyIncidentCount >= 2 ? 0.15 : profile.safetyIncidentCount === 1 ? 0.55 : 1;
    return {
      ratio,
      basis: `评价周期内一般及以上安全事故 ${profile.safetyIncidentCount} 次`,
    };
  }

  if (/应急演练/.test(text)) {
    return {
      ratio: clamp(profile.emergencyDrillRate / 100, 0, 1),
      basis: `应急演练达标率 ${profile.emergencyDrillRate}%`,
    };
  }

  if (/能耗/.test(text)) {
    const ratio = ratioByThreshold(profile.energyIntensity, [
      { min: 45, ratio: 0.35 },
      { min: 38, ratio: 0.55 },
      { min: 32, ratio: 0.78 },
      { min: 0, ratio: 1 },
    ]);
    return {
      ratio,
      basis: `单位供热面积能耗 ${profile.energyIntensity} kgce/m²`,
    };
  }

  if (/清洁能源/.test(text)) {
    const ratio = clamp(profile.cleanHeatRate / 100, 0, 1);
    return {
      ratio,
      basis: `清洁能源供热占比 ${profile.cleanHeatRate}%`,
    };
  }

  if (/碳排放|减排/.test(text)) {
    const ratio = clamp(profile.carbonComplianceScore / 100, 0, 1);
    return {
      ratio,
      basis: `碳排放合规评分 ${profile.carbonComplianceScore}`,
    };
  }

  const performanceMap = [1, 0.85, 0.7, 0.5];
  const perfSeed = hashToUnit(`${entityId}:${node.id}:${nodeIdx}`);
  const perfIndex = Math.min(performanceMap.length - 1, Math.floor(perfSeed * performanceMap.length));
  const rawRatio = performanceMap[perfIndex];
  const ratio = node.direction === 'negative' ? clamp(1.05 - rawRatio, 0.25, 1) : rawRatio;
  return {
    ratio,
    basis: '系统核查：基于历史样本拟合评分。',
  };
};

export const ValidationResultListTab: React.FC = () => {
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const validationSettings = useAgentStore((state) => state.validationSettings);
  const resultListFilters = useAgentStore((state) => state.resultViewSettings.listFilters);
  const updateResultListFilters = useAgentStore((state) => state.updateResultListFilters);
  const [searchText, setSearchText] = useState('');
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseResult | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly React.Key[]>([]);

  const gradeLevels = useMemo(() => {
    const fallback = [
      { id: 'g1', name: 'A', minScore: 85, color: '#16a34a' },
      { id: 'g2', name: 'B', minScore: 70, color: '#2563eb' },
      { id: 'g3', name: 'C', minScore: 60, color: '#f59e0b' },
      { id: 'g4', name: 'D', minScore: 0, color: '#ef4444' },
    ];
    const list = modelSnapshot?.gradeLevels?.length ? modelSnapshot.gradeLevels : fallback;
    return [...list]
      .sort((a, b) => b.minScore - a.minScore)
      .map((item, index) => ({ ...item, color: item.color || GRADE_PALETTE[index % GRADE_PALETTE.length] }));
  }, [modelSnapshot]);

  const allIndicatorKeys = useMemo(
    () => (selectedEnterprise ? collectExpandableKeys(selectedEnterprise.details) : []),
    [selectedEnterprise],
  );

  const openEnterpriseDetail = (record: EnterpriseResult) => {
    setSelectedEnterprise(record);
    setExpandedRowKeys(collectExpandableKeys(record.details));
  };

  const MOCK_DATA = useMemo(() => {
    const totalMode = modelSnapshot?.totalScoreMode || 100;
    const indicators = modelSnapshot?.indicators || [];
    const sampleCount = validationSettings?.sampleCount || 100;
    const industryName = validationSettings?.industry || 'all';

    const generateScores = (
      nodes: IndicatorNode[],
      parentFullScore: number,
      enterprise: HeatingEnterprise,
      profile: EnterpriseProfile,
    ): IndicatorResult[] => {
      return nodes.map((node, nodeIdx) => {
        const weight = node.weight || 0;
        const fullScore = (weight / 100) * parentFullScore;
        const hasChildren = !!(node.children && node.children.length > 0);
        if (hasChildren) {
          const children = generateScores(node.children || [], fullScore, enterprise, profile);
          const score = Number(children.reduce((sum, item) => sum + item.score, 0).toFixed(1));
          return {
            key: `${enterprise.creditCode}-${node.id}-${nodeIdx}`,
            name: node.name,
            weight,
            fullScore: Number(fullScore.toFixed(1)),
            score,
            basis: '-',
            children,
          };
        }
        const { ratio, basis } = evaluateLeafRatio(node, profile, enterprise.creditCode, nodeIdx);
        return {
          key: `${enterprise.creditCode}-${node.id}-${nodeIdx}`,
          name: node.name,
          weight,
          fullScore: Number(fullScore.toFixed(1)),
          score: Number((fullScore * ratio).toFixed(1)),
          basis,
        };
      });
    };

    const effectiveIndicators = indicators.length > 0 ? indicators : [];
    const enterprisePool = buildEnterprisePool(
      validationSettings.mode,
      sampleCount,
      industryName,
      validationSettings.importedDatasetId || null,
    );

    return enterprisePool
      .map((enterprise, index) => {
        const profile = buildProfile(enterprise);
        const details = generateScores(effectiveIndicators, totalMode, enterprise, profile);
        let totalScore = details.reduce((acc, curr) => acc + curr.score, 0);

        const matchedBonusRules = (modelSnapshot?.bonusRules || []).filter((rule) => {
          const text = `${rule.name}`;
          if (/科技|奖项|创新/.test(text)) return profile.hasTechAward;
          if (/试点|示范|智能/.test(text)) return profile.hasSmartPilot;
          if (/满意|三年|连续/.test(text)) return profile.satisfactionTop3Years;
          return hashToUnit(`${enterprise.creditCode}:bonus:${rule.id}`) > 0.95;
        });
        const bonusScore = matchedBonusRules.reduce((sum, rule) => sum + rule.score, 0);
        totalScore = Math.min(totalMode, totalScore + bonusScore);

        const matchedVetoRules = (modelSnapshot?.vetoRules || []).filter((rule) => {
          const text = `${rule.name} ${rule.description || ''}`;
          if (/事故|安全/.test(text)) return profile.majorAccident;
          if (/失信|被执行人/.test(text)) return profile.onDishonestList;
          if (/停业|弃管|停热|中途停热/.test(text)) return profile.severeHeatSupplyStop;
          return hashToUnit(`${enterprise.creditCode}:veto:${rule.id}`) > 0.99;
        });

        let grade = gradeLevels[gradeLevels.length - 1]?.name || 'D';
        const matchedGrade = gradeLevels.find((item) => totalScore >= item.minScore);
        if (matchedGrade) {
          grade = matchedGrade.name;
        }
        if (matchedVetoRules.length > 0) {
          grade = gradeLevels[gradeLevels.length - 1]?.name || grade;
          totalScore = 0;
        }

        return {
          key: `${enterprise.creditCode}-${index}`,
          index: index + 1,
          name: enterprise.name,
          creditCode: enterprise.creditCode,
          score: Number(totalScore.toFixed(1)),
          grade,
          bonus: bonusScore > 0 ? `+${bonusScore}` : '-',
          bonusBasis: matchedBonusRules.length > 0 ? matchedBonusRules.map((item) => item.name).join('；') : '-',
          veto: matchedVetoRules.length > 0 ? '有' : '-',
          vetoBasis: matchedVetoRules.length > 0 ? matchedVetoRules.map((item) => item.name).join('；') : '-',
          details,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [modelSnapshot, validationSettings, gradeLevels]);

  const filteredData = useMemo(() => {
    let result = [...MOCK_DATA];
    if (searchText) {
      const keyword = searchText.trim().toLowerCase();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(keyword) || item.creditCode.toLowerCase().includes(keyword),
      );
    }
    if (resultListFilters.vetoOnly) {
      result = result.filter((item) => item.veto !== '-');
    }
    if (resultListFilters.bonusOnly) {
      result = result.filter((item) => item.bonus !== '-');
    }
    if (resultListFilters.grade !== 'all') {
      result = result.filter((item) => item.grade === resultListFilters.grade);
    }
    return result;
  }, [searchText, resultListFilters, MOCK_DATA]);

  const gradeToneMap = useMemo(() => {
    const classes = [
      'bg-green-50 text-green-600 border-green-100',
      'bg-blue-50 text-blue-600 border-blue-100',
      'bg-orange-50 text-orange-600 border-orange-100',
      'bg-red-50 text-red-600 border-red-100',
      'bg-purple-50 text-purple-600 border-purple-100',
      'bg-cyan-50 text-cyan-600 border-cyan-100',
    ];
    const map: Record<string, string> = {};
    gradeLevels.forEach((item, index) => {
      map[item.name] = classes[index % classes.length];
    });
    return map;
  }, [gradeLevels]);

  const columns: ColumnsType<EnterpriseResult> = useMemo(
    () => [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
      },
      {
        title: '企业名称',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
          <a className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium" onClick={() => openEnterpriseDetail(record)}>
            {text}
          </a>
        ),
      },
      {
        title: '统一社会信用代码',
        dataIndex: 'creditCode',
        key: 'creditCode',
        width: 210,
        render: (value) => <span className="text-xs text-gray-600 font-mono">{value}</span>,
      },
      {
        title: '分数',
        dataIndex: 'score',
        key: 'score',
        sorter: (a, b) => a.score - b.score,
        defaultSortOrder: 'descend',
        render: (val) => <span className="font-bold text-blue-600 text-base">{val}</span>,
      },
      {
        title: '评级',
        dataIndex: 'grade',
        key: 'grade',
        render: (grade: string) => {
          const tone = gradeToneMap[grade] || gradeToneMap[gradeLevels[0]?.name || ''] || 'bg-gray-50 text-gray-600 border-gray-100';
          return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${tone}`}>{grade}级</span>;
        },
      },
      {
        title: '加分',
        dataIndex: 'bonus',
        key: 'bonus',
        render: (val) => <span className={val !== '-' ? 'text-green-600 font-medium' : 'text-gray-400'}>{val}</span>,
      },
      {
        title: '否决',
        dataIndex: 'veto',
        key: 'veto',
        render: (val) => <span className={val !== '-' ? 'text-red-500 font-medium' : 'text-gray-400'}>{val}</span>,
      },
    ],
    [gradeLevels, gradeToneMap],
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1280px] mx-auto min-h-0">
      <div className="flex gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">参与企业数</div>
          <div className="text-2xl font-bold text-blue-600 mb-1">{MOCK_DATA.length}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">平均分</div>
          <div className="text-2xl font-bold text-teal-600 mb-1">
            {MOCK_DATA.length > 0 ? (MOCK_DATA.reduce((a, b) => a + b.score, 0) / MOCK_DATA.length).toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">最高分</div>
          <div className="text-2xl font-bold text-green-500 mb-1">
            {MOCK_DATA.length > 0 ? Math.max(...MOCK_DATA.map((item) => item.score)).toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">最低分</div>
          <div className="text-2xl font-bold text-orange-500 mb-1">
            {MOCK_DATA.length > 0 ? Math.min(...MOCK_DATA.map((item) => item.score)).toFixed(1) : '0.0'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center px-6 py-4 min-h-[64px] gap-8">
        <div className="text-[14px] font-medium text-gray-700 shrink-0">评级分布</div>
        <div className="flex items-center gap-10 flex-wrap">
          {gradeLevels.map((gradeItem) => {
            const count = MOCK_DATA.filter((item) => item.grade === gradeItem.name).length;
            const percentage = MOCK_DATA.length > 0 ? ((count / MOCK_DATA.length) * 100).toFixed(1) : '0.0';
            return (
              <div key={gradeItem.id} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-[13px] font-medium border"
                  style={{ borderColor: gradeItem.color, backgroundColor: `${gradeItem.color}1A`, color: gradeItem.color }}
                >
                  {gradeItem.name}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-gray-800">{count}</span>
                  <span className="text-[13px] text-gray-400">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm font-medium text-gray-800">企业评价结果</span>
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索企业名称/信用代码"
              prefix={<Search size={14} className="text-gray-400" />}
              className="w-56"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <div className="h-4 w-px bg-gray-200 mx-1"></div>
            <Filter size={14} className="text-gray-400" />
            <div className="flex items-center gap-1.5 px-1 shrink-0">
              <Switch size="small" checked={resultListFilters.vetoOnly} onChange={(checked) => updateResultListFilters({ vetoOnly: checked })} />
              <span className="text-sm text-gray-600 whitespace-nowrap">有否决项</span>
            </div>
            <div className="flex items-center gap-1.5 px-1 shrink-0 mr-2">
              <Switch size="small" checked={resultListFilters.bonusOnly} onChange={(checked) => updateResultListFilters({ bonusOnly: checked })} />
              <span className="text-sm text-gray-600 whitespace-nowrap">有加分项</span>
            </div>
            <Select
              value={resultListFilters.grade}
              onChange={(value) => updateResultListFilters({ grade: value })}
              className="w-[110px]"
              options={[{ value: 'all', label: '评级' }, ...gradeLevels.map((item) => ({ value: item.name, label: `${item.name}级` }))]}
            />
            <Button icon={<Download size={14} />} className="ml-2 text-gray-600">
              导出数据
            </Button>
          </div>
        </div>
        <div className="p-0 overflow-auto">
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            className="border-none"
            rowClassName="hover:bg-blue-50/30 transition-colors"
          />
        </div>
      </div>

      <Modal
        title={selectedEnterprise?.name}
        open={!!selectedEnterprise}
        onCancel={() => {
          setSelectedEnterprise(null);
          setExpandedRowKeys([]);
        }}
        footer={null}
        width={860}
      >
        <div className="py-4">
          <div className="mb-4 text-xs text-gray-500">统一社会信用代码：{selectedEnterprise?.creditCode}</div>
          <div className="flex gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
              <div className="text-gray-500 text-sm mb-1">综合得分</div>
              <div className="text-3xl font-bold text-blue-600">{selectedEnterprise?.score}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
              <div className="text-gray-500 text-sm mb-1">信用评级</div>
              <div className={`text-2xl font-bold ${gradeToneMap[selectedEnterprise?.grade || '']?.includes('green') ? 'text-green-600' : gradeToneMap[selectedEnterprise?.grade || '']?.includes('blue') ? 'text-blue-600' : gradeToneMap[selectedEnterprise?.grade || '']?.includes('orange') ? 'text-orange-600' : 'text-red-600'}`}>
                {selectedEnterprise?.grade}级
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
              <div className="text-gray-500 text-sm mb-1">加分项</div>
              {selectedEnterprise?.bonus !== '-' ? (
                <Popover content={<div className="text-sm max-w-[240px] text-gray-700">{selectedEnterprise?.bonusBasis}</div>} title="加分依据" trigger="click" placement="bottom">
                  <span className="text-xl font-bold text-green-600 cursor-pointer hover:opacity-80 border-b border-dashed border-green-300 pb-0.5">
                    {selectedEnterprise?.bonus}
                  </span>
                </Popover>
              ) : (
                <div className="text-xl font-bold text-gray-400">-</div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
              <div className="text-gray-500 text-sm mb-1">一票否决</div>
              {selectedEnterprise?.veto !== '-' ? (
                <Popover content={<div className="text-sm max-w-[240px] text-gray-700">{selectedEnterprise?.vetoBasis}</div>} title="否决依据" trigger="click" placement="bottom">
                  <span className="text-xl font-bold text-red-500 cursor-pointer hover:opacity-80 border-b border-dashed border-red-300 pb-0.5">
                    {selectedEnterprise?.veto}
                  </span>
                </Popover>
              ) : (
                <div className="text-xl font-bold text-gray-400">-</div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 pr-4 border-l-4 border-blue-500 pl-2">
            <h4 className="font-semibold text-gray-800 m-0">各级指标得分详情</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">全部展开</span>
              <Switch
                size="small"
                checked={expandedRowKeys.length > 0 && expandedRowKeys.length === allIndicatorKeys.length}
                onChange={(checked) => setExpandedRowKeys(checked ? allIndicatorKeys : [])}
              />
            </div>
          </div>
          <Table
            size="small"
            pagination={false}
            dataSource={selectedEnterprise?.details}
            expandable={{
              expandedRowKeys: expandedRowKeys as React.Key[],
              onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
            }}
            columns={[
              { title: '指标名称', dataIndex: 'name', key: 'name', width: '30%' },
              { title: '权重', dataIndex: 'weight', key: 'weight', render: (value) => `${value}%`, width: '10%' },
              { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: '10%' },
              {
                title: '实得分',
                dataIndex: 'score',
                key: 'score',
                width: '12%',
                render: (value) => <span className="font-semibold text-blue-600">{typeof value === 'number' ? value.toFixed(1) : '0.0'}</span>,
              },
              { title: '得分依据', dataIndex: 'basis', key: 'basis', render: (value) => <span className="text-gray-500 text-xs">{value}</span> },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};
