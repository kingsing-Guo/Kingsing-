import React, { useState, useMemo, useEffect } from 'react';
import { Table, Input, Select, Button, Modal, Switch, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Filter, Search, Download } from 'lucide-react';
import { useAgentStore } from '../../store';
import type { IndicatorNode } from '../../types/model';


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
  score: number;
  grade: string;
  bonus: string;
  bonusBasis?: string;
  veto: string;
  vetoBasis?: string;
  details: IndicatorResult[];
}

const COMPANY_NAMES = [
  '北京首华物业管理有限公司',
  '北京融合供暖服务有限责任公司',
  '北京匠心置业有限公司',
  '北京四海安信物业管理有限公司',
  '北京鸿达开拓供热有限公司',
  '北京裕发弘瑞物业管理有限公司',
  '中房城市能源科技有限公司'
];



export const ValidationResultListTab: React.FC = () => {
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const validationSettings = useAgentStore((state) => state.validationSettings);
  const [searchText, setSearchText] = useState('');
  const [vetoFilter, setVetoFilter] = useState<boolean>(false);
  const [bonusFilter, setBonusFilter] = useState<boolean>(false);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseResult | null>(null);

  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly React.Key[]>([]);
  
  const allIndicatorKeys = useMemo(() => {
    if (!selectedEnterprise) return [];
    const keys: string[] = [];
    const traverse = (data: IndicatorResult[]) => {
      data.forEach(item => {
        if (item.children && item.children.length > 0) {
          keys.push(item.key);
          traverse(item.children);
        }
      });
    };
    traverse(selectedEnterprise.details);
    return keys;
  }, [selectedEnterprise]);

  useEffect(() => {
    if (selectedEnterprise) {
      setExpandedRowKeys(allIndicatorKeys);
    }
  }, [selectedEnterprise, allIndicatorKeys]);

  const MOCK_DATA = useMemo(() => {
    const totalMode = modelSnapshot?.totalScoreMode || 100;
    const indicators = modelSnapshot?.indicators || [];
    const sampleCount = validationSettings?.sampleCount || 100;
    const industryName = validationSettings?.industry === 'all' ? '' : validationSettings?.industry;

    const generateScores = (nodes: IndicatorNode[], parentFullScore: number, entId: string): IndicatorResult[] => {
      return nodes.map((node, nodeIdx) => {
        const weight = node.weight || 0;
        const fullScore = (weight / 100) * parentFullScore;
        const hasChildren = node.children && node.children.length > 0;
        
        const performanceMap = [
          { value: 1.0, text: '系统核查: 表现优异，符合全部认定标准' },
          { value: 0.8, text: '系统核查: 表现良好，无明显负面记录' },
          { value: 0.6, text: '系统核查: 表现一般，存在轻微违约或瑕疵' },
          { value: 0.4, text: '系统核查: 表现较差，存在较多违约行为' }
        ];
        const randomPerf = performanceMap[Math.floor(Math.random() * performanceMap.length)];
        const performance = randomPerf.value;
        const score = Number((fullScore * performance).toFixed(1));
        const basisText = hasChildren ? '-' : randomPerf.text;
        
        return {
          key: `${entId}-${node.id}-${nodeIdx}`, // Stable key
          name: node.name,
          weight: weight,
          fullScore: Number(fullScore.toFixed(1)),
          score: score,
          basis: basisText,
          children: hasChildren ? generateScores(node.children!, fullScore, entId) : undefined
        };
      });
    };

    // If no model exists, simulate the 3-4-5 structure the user mentioned
    const effectiveIndicators = indicators.length > 0 ? indicators : [
      { id: 'l1-1', name: '基本信用记录', level: 1, weight: 30, children: [
        { id: 'l2-1', name: '工商登记信息', level: 2, weight: 50, children: [
          { id: 'l3-1', name: '注册资本', level: 3, weight: 100 }
        ]},
        { id: 'l2-2', name: '纳税记录', level: 2, weight: 50, children: [
          { id: 'l3-2', name: '纳税评级', level: 3, weight: 100 }
        ]}
      ]},
      { id: 'l1-2', name: '经营状况与履约', level: 1, weight: 40, children: [
        { id: 'l2-3', name: '合同履行', level: 2, weight: 100, children: [
          { id: 'l3-3', name: '合同违约率', level: 3, weight: 100 }
        ]}
      ]},
      { id: 'l1-3', name: '社会责任', level: 1, weight: 30, children: [
        { id: 'l2-4', name: '公益捐赠', level: 2, weight: 100, children: [
          { id: 'l3-4', name: '捐赠总额', level: 3, weight: 50 },
          { id: 'l3-5', name: '志愿服务', level: 3, weight: 50 }
        ]}
      ]}
    ] as IndicatorNode[];

    const effectiveGradeLevels = (modelSnapshot && modelSnapshot.gradeLevels && modelSnapshot.gradeLevels.length > 0)
      ? modelSnapshot.gradeLevels 
      : [
          { id: '1', name: 'A', minScore: 90 },
          { id: '2', name: 'B', minScore: 75 },
          { id: '3', name: 'C', minScore: 60 },
          { id: '4', name: 'D', minScore: 0 }
        ];

    return Array.from({ length: sampleCount }).map((_, i) => {
      const entId = `ent-${i}`;
      const details = generateScores(effectiveIndicators, totalMode, entId);
      // NOTE: Only sum the top-level indicators to get the base total score
      let totalScore = details.reduce((acc, curr) => acc + curr.score, 0);
      
      const hasBonus = Math.random() > 0.7;
      const bonusVal = hasBonus ? Number((Math.random() * 5).toFixed(2)) : 0;
      const bonusBasis = hasBonus ? `满足加分项: 获得行业协会与市级单位表彰，加 ${bonusVal} 分` : '-';
      totalScore = Math.min(totalMode, totalScore + bonusVal);

      // Random Veto
      const hasVeto = Math.random() > 0.95;
      const vetoBasis = hasVeto ? '触发一票否决项: 发生重大安全责任事故' : '-';

      // Determine grade
      let grade = 'D';
      const sortedGrades = [...effectiveGradeLevels].sort((a, b) => b.minScore - a.minScore);
      const matched = sortedGrades.find(g => totalScore >= g.minScore);
      grade = matched ? matched.name : sortedGrades[sortedGrades.length-1].name;
      
      if (hasVeto) {
        grade = 'D';
        totalScore = 0;
      }

      const baseName = COMPANY_NAMES[i % COMPANY_NAMES.length];
      const name = (industryName ? `${industryName}-` : '') + baseName + (i >= COMPANY_NAMES.length ? ` (${i})` : '');

      return {
        key: entId,
        index: i + 1,
        name,
        score: Number(totalScore.toFixed(1)),
        grade,
        bonus: hasBonus ? `+${bonusVal}` : '-',
        bonusBasis,
        veto: hasVeto ? '有' : '-',
        vetoBasis,
        details
      };
    }).sort((a, b) => b.score - a.score);
  }, [modelSnapshot, validationSettings]);

  const filteredData = useMemo(() => {
    let result = [...MOCK_DATA];
    
    // Text search
    if (searchText) {
      result = result.filter(item => item.name.includes(searchText));
    }
    
    // Top-right Dropdown Filters
    if (vetoFilter) {
      result = result.filter(item => item.veto !== '-');
    }
    if (bonusFilter) {
      result = result.filter(item => item.bonus !== '-');
    }
    if (gradeFilter !== 'all') {
      result = result.filter(item => item.grade === gradeFilter);
    }

    return result;
  }, [searchText, vetoFilter, bonusFilter, gradeFilter, MOCK_DATA]);

  const columns: ColumnsType<EnterpriseResult> = useMemo(() => [
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
        <a 
          className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium"
          onClick={() => setSelectedEnterprise(record)}
        >
          {text}
        </a>
      ),
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
      filters: [
        { text: 'A', value: 'A' },
        { text: 'B', value: 'B' },
        { text: 'C', value: 'C' },
        { text: 'D', value: 'D' },
      ],
      onFilter: (value, record) => record.grade === value,
      render: (grade) => {
        const colors: any = { 'A': 'green', 'B': 'blue', 'C': 'orange', 'D': 'red' };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${colors[grade] || 'blue'}-50 text-${colors[grade] || 'blue'}-600 border border-${colors[grade] || 'blue'}-100`}>{grade}级</span>;
      }
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
  ], []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto min-h-0">
      {/* Top Metrics Cards */}
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
            {MOCK_DATA.length > 0 ? Math.max(...MOCK_DATA.map(d => d.score)).toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">最低分</div>
          <div className="text-2xl font-bold text-orange-500 mb-1">
            {MOCK_DATA.length > 0 ? Math.min(...MOCK_DATA.map(d => d.score)).toFixed(1) : '0.0'}
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center px-6 py-4 min-h-[64px] gap-8">
         <div className="text-[14px] font-medium text-gray-700 shrink-0">评级分布</div>
         <div className="flex items-center gap-10">
            {['A', 'B', 'C', 'D'].map((gradeName) => {
               // Calculate count and percentage for each grade from MOCK_DATA
               const count = MOCK_DATA.filter(item => item.grade === gradeName).length;
               const percentage = MOCK_DATA.length > 0 ? ((count / MOCK_DATA.length) * 100).toFixed(1) : '0.0';
               
               const gradeColors: Record<string, { border: string, bg: string, text: string }> = {
                 'A': { border: '#b7eb8f', bg: '#f6ffed', text: '#52c41a' },
                 'B': { border: '#91caff', bg: '#e6f4ff', text: '#1677ff' },
                 'C': { border: '#ffd591', bg: '#fff7e6', text: '#fa8c16' },
                 'D': { border: '#ffa39e', bg: '#fff1f0', text: '#f5222d' },
               };
               const style = gradeColors[gradeName] || gradeColors['B'];

               return (
                <div key={gradeName} className="flex items-center gap-3">
                   <div 
                    className="w-7 h-7 rounded flex items-center justify-center text-[13px] font-medium border"
                    style={{ borderColor: style.border, backgroundColor: style.bg, color: style.text }}
                   >
                     {gradeName}
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

      {/* Enterprise Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
         <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium text-gray-800">企业评价结果</span>
            <div className="flex items-center gap-3">
              <Input 
                placeholder="搜索企业名称" 
                prefix={<Search size={14} className="text-gray-400" />}
                className="w-48"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
              <div className="h-4 w-px bg-gray-200 mx-1"></div>
              <Filter size={14} className="text-gray-400" />
              <div className="flex items-center gap-1.5 px-1 shrink-0">
                <Switch size="small" checked={vetoFilter} onChange={setVetoFilter} />
                <span className="text-sm text-gray-600 whitespace-nowrap">有否决项</span>
              </div>
              <div className="flex items-center gap-1.5 px-1 shrink-0 mr-2">
                <Switch size="small" checked={bonusFilter} onChange={setBonusFilter} />
                <span className="text-sm text-gray-600 whitespace-nowrap">有加分项</span>
              </div>
              <Select 
                value={gradeFilter} 
                onChange={setGradeFilter}
                className="w-[90px]" 
                options={[
                  {value: 'all', label: '评级'}, 
                  {value: 'A', label: 'A级'}, 
                  {value: 'B', label: 'B级'},
                  {value: 'C', label: 'C级'},
                  {value: 'D', label: 'D级'}
                ]} 
              />
              <Button icon={<Download size={14} />} className="ml-2 text-gray-600">导出数据</Button>
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

      {/* Enterprise Detail Modal */}
      <Modal
        title={selectedEnterprise?.name}
        open={!!selectedEnterprise}
        onCancel={() => setSelectedEnterprise(null)}
        footer={null}
        width={800}
      >
        <div className="py-4">
           <div className="flex gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
                 <div className="text-gray-500 text-sm mb-1">综合得分</div>
                 <div className="text-3xl font-bold text-blue-600">{selectedEnterprise?.score}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
                 <div className="text-gray-500 text-sm mb-1">信用评级</div>
                 <div className={`text-2xl font-bold ${
                   selectedEnterprise?.grade === 'A' ? 'text-green-600' :
                   selectedEnterprise?.grade === 'B' ? 'text-blue-600' :
                   selectedEnterprise?.grade === 'C' ? 'text-orange-600' : 'text-red-600'
                 }`}>{selectedEnterprise?.grade}级</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
                 <div className="text-gray-500 text-sm mb-1">加分项</div>
                 {selectedEnterprise?.bonus !== '-' ? (
                   <Popover content={<div className="text-sm max-w-[220px] text-gray-700">{selectedEnterprise?.bonusBasis}</div>} title="加分依据" trigger="click" placement="bottom">
                     <span className="text-xl font-bold text-green-600 cursor-pointer hover:opacity-80 border-b border-dashed border-green-300 pb-0.5">{selectedEnterprise?.bonus}</span>
                   </Popover>
                 ) : (
                   <div className="text-xl font-bold text-gray-400">-</div>
                 )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100 flex flex-col justify-center items-center">
                 <div className="text-gray-500 text-sm mb-1">一票否决</div>
                 {selectedEnterprise?.veto !== '-' ? (
                   <Popover content={<div className="text-sm max-w-[220px] text-gray-700">{selectedEnterprise?.vetoBasis}</div>} title="否决依据" trigger="click" placement="bottom">
                     <span className="text-xl font-bold text-red-500 cursor-pointer hover:opacity-80 border-b border-dashed border-red-300 pb-0.5">{selectedEnterprise?.veto}</span>
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
               onExpandedRowsChange: (keys) => setExpandedRowKeys(keys)
             }}
             columns={[
               { title: '指标名称', dataIndex: 'name', key: 'name', width: '35%' },
               { title: '权重', dataIndex: 'weight', key: 'weight', render: val => `${val}%`, width: '10%' },
               { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: '10%' },
               { title: '实得分', dataIndex: 'score', key: 'score', width: '15%', render: val => (
                 <span className="font-semibold text-blue-600">
                   {typeof val === 'number' ? val.toFixed(1) : '0.0'}
                 </span>
               )},
               { title: '得分依据', dataIndex: 'basis', key: 'basis', render: val => <span className="text-gray-500 text-xs">{val}</span> },
             ]}
           />
        </div>
      </Modal>
    </div>
  );
};
