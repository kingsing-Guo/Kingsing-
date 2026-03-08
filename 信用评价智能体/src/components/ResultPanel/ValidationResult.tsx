import React, { useState } from 'react';
import { useAgentStore } from '../../store';
import { Button, Table, Drawer, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Wrench, CheckCircle, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { ValidationResultKSTab } from './ValidationResultKSTab';
import { ValidationResultDistTab } from './ValidationResultDistTab';
import { ValidationResultListTab } from './ValidationResultListTab';
import type { IndicatorNode } from '../../types/model';

export const ValidationResult: React.FC = () => {
  const [modelPreviewVisible, setModelPreviewVisible] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const validationSettings = useAgentStore((state) => state.validationSettings);
  const activeTab = useAgentStore((state) => state.resultViewSettings.activeTab);
  const setResultActiveTab = useAgentStore((state) => state.setResultActiveTab);
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);
  const setPhase = useAgentStore((state) => state.setPhase);

  const readonlyColumns: ColumnsType<IndicatorNode> = [
    {
      title: '指标项',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: IndicatorNode) => {
        const paddingLeft = record.level ? (record.level - 1) * 24 : 0;
        const hasChildren = !!(record.children && record.children.length > 0);
        const isExpanded = expandedKeys.includes(record.id);
        const toggleExpand = (e: React.MouseEvent) => {
          e.stopPropagation();
          setExpandedKeys(prev => isExpanded ? prev.filter(k => k !== record.id) : [...prev, record.id]);
        };
        return (
          <div className="flex items-center gap-2" style={{ paddingLeft }}>
            {hasChildren ? (
              <button
                onClick={toggleExpand}
                className="w-5 h-5 flex flex-shrink-0 items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : <span className="w-5 h-5 inline-block shrink-0" />}
            <span className={record.level === 1 ? 'font-semibold text-gray-800' : 'text-gray-700'}>
              {text} <span className="text-gray-400 text-xs font-normal">({record.weight}%)</span>
            </span>
          </div>
        );
      }
    },
    {
      title: '计分规则',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 140,
      render: (val: IndicatorNode['ruleType'], record: IndicatorNode) => {
         if (record.children && record.children.length > 0) return '-';
         let label = '未配置';
         if (val === 'interval') label = '区间评分';
         else if (val === 'threshold') label = '阈值评分';
         else if (val === 'linear') label = '线性评分';
         else if (val === 'ratio') label = '比例评分';
         else if (val === 'cumulative') label = '累计计分';
         return <Tag color="blue">{label}</Tag>;
      }
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Top Navigation and Model Info Combined */}
      <div className="bg-white px-8 pt-3 border-b border-gray-200 flex items-end justify-between w-full z-10 shrink-0">
         {/* Left: Navigation Tabs */}
         <div className="flex gap-8 relative">
           {(['ks', 'dist', 'list'] as const).map(tabKey => (
             <button
               key={tabKey}
               className={`pb-3 px-2 text-[15px] font-medium transition-colors relative ${activeTab === tabKey ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
               onClick={() => setResultActiveTab(tabKey)}
             >
               {tabKey === 'ks' && 'K-S 区分度分析'}
               {tabKey === 'dist' && '分数分布特征'}
               {tabKey === 'list' && (
                 <div className="flex items-center gap-2">
                   企业列表 <span className="bg-gray-100 text-gray-500 text-xs py-0.5 px-2 rounded-md font-mono">{validationSettings.sampleCount}</span>
                 </div>
               )}
               {activeTab === tabKey && (
                 <div className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-500 rounded-t-sm shadow-[0_-2px_6px_rgba(59,130,246,0.3)]" />
               )}
             </button>
           ))}
         </div>

         {/* Right: Model Info */}
         <div className="flex items-center gap-4 mb-3">
           <div className="flex items-center gap-2 text-[13px]">
             <span className="text-gray-500">当前模型:</span>
             <span className="font-semibold text-gray-800">{modelSnapshot?.modelName || '未知模型'}</span>
             <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0 rounded border border-blue-100 font-normal">
               V1.0
             </span>
           </div>
           <Button 
             size="small"
             icon={<Eye size={13} />} 
             onClick={() => {
               if (modelSnapshot) {
                 setExpandedKeys(modelSnapshot.indicators.map(i => i.id));
               }
               setModelPreviewVisible(true);
             }}
             className="text-blue-600 border-blue-200 hover:bg-blue-50 text-[13px]"
           >
             查看配置
           </Button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
         <div className="max-w-[1200px] w-full flex gap-6 min-h-0">
               {/* Left Column (Main Charts/Tables) */}
            <div className={`flex flex-col min-w-0 ${activeTab === 'list' ? 'w-full' : 'flex-1'}`}>
               {activeTab === 'ks' && <ValidationResultKSTab />}
               {activeTab === 'dist' && <ValidationResultDistTab />}
               {activeTab === 'list' && <ValidationResultListTab />}
            </div>

            {/* Right Column (AI Insights & Actions) */}
            {activeTab !== 'list' && (
              <div className="w-[320px] flex flex-col gap-4 shrink-0">
                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm bg-gradient-to-b from-blue-50/50 to-white">
                   <h3 className="text-[15px] font-semibold text-gray-800 flex items-center gap-2 mb-3">
                     <span className="text-blue-500 font-bold">~</span> 图表解读
                   </h3>
                   <p className="text-sm text-blue-800/80 leading-relaxed">
                     {activeTab === 'ks' ? (
                       <>红色曲线代表违约样本累积占比，绿色代表正常样本。两条曲线拉开的距离越大，说明模型区分好坏企业的能力越强。
                       <br/><br/>
                       当前 KS 值为 0.90，模型区分能力强。</>
                     ) : (
                       <>直方图展示分数分布频率，紫色曲线为理想正态分布。
                       <br/><br/>
                       分数分布左偏，平均分 70.5，标准差 15.3。偏度接近0表示分布对称，标准差反映分数离散程度。</>
                     )}
                   </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm bg-gradient-to-b from-orange-50/30 to-white flex-1">
                   <h3 className="text-[15px] font-semibold text-gray-800 flex items-center gap-2 mb-4">
                     <span className="text-orange-500 font-bold">⚡️</span> AI 智能诊断
                   </h3>
                   <div className="flex flex-col gap-4 mb-6">
                     {activeTab === 'ks' ? (
                       <>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">优秀</span>
                           <span className="text-sm text-gray-700">KS 值达到 0.90，模型区分能力强，可有效识别高低风险企业。</span>
                         </div>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">优秀</span>
                           <span className="text-sm text-gray-700">AUC 达到 0.94，预测准确性优秀。</span>
                         </div>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">优秀</span>
                           <span className="text-sm text-gray-700">低分段企业捕获率 60%，风险识别效果良好。</span>
                         </div>
                       </>
                     ) : (
                       <>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-orange-600 border border-orange-200 bg-orange-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">建议</span>
                           <span className="text-sm text-gray-700">分数分布左偏（偏度 -1.81），高分企业占比过高，建议提高高分段门槛或增加区分性指标。</span>
                         </div>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">优秀</span>
                           <span className="text-sm text-gray-700">标准差适中（15.3），分数分布合理。</span>
                         </div>
                         <div className="flex items-start gap-3">
                           <span className="text-[10px] text-orange-600 border border-orange-200 bg-orange-50 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">建议</span>
                           <span className="text-sm text-gray-700">峰度值 7.41 偏离正态分布，分布存在厚尾或扁平特征。</span>
                         </div>
                       </>
                     )}
                   </div>

                   <div className="flex flex-col gap-3 mt-auto">
                     <Button 
                       block 
                       size="large" 
                       onClick={() => {
                         setPhase('ADJUSTING');
                         setValidationStep('idle');
                       }}
                       icon={<Wrench size={16} />}
                       className="text-gray-600 font-medium"
                     >
                        返回模型微调
                     </Button>
                     <Button 
                       type="primary" 
                       block 
                       size="large"
                       icon={<CheckCircle size={16} />}
                       className="bg-blue-600 font-medium shadow-sm hover:bg-blue-500"
                       onClick={() => setPhase('PUBLISH')}
                     >
                        确认并发布模型
                     </Button>
                   </div>
                </div>
              </div>
             )}
             
            </div>
         </div>

      {/* Model Viewer Drawer */}
      <Drawer
        title="当前评估模型结构快照"
        width={580}
        open={modelPreviewVisible}
        onClose={() => setModelPreviewVisible(false)}
        bodyStyle={{ backgroundColor: '#f9fafb', padding: '16px' }}
      >
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-800">
            多级指标分值树
          </div>
          <Table 
            columns={readonlyColumns} 
            dataSource={modelSnapshot?.indicators || []} 
            rowKey="id" 
            pagination={false} 
            size="small"
            className="[&_.ant-table-cell]:!border-b-gray-100 placeholder-text-xs"
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys as React.Key[]),
              expandIconColumnIndex: -1
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="font-semibold text-red-700 mb-2 text-sm">一票否决项 ({modelSnapshot?.vetoRules?.length || 0})</div>
            {modelSnapshot?.vetoRules?.length ? (
              <ul className="list-disc pl-5 text-sm text-gray-600 pb-1">
                {modelSnapshot.vetoRules.map(r => <li key={r.id} className="mb-1.5 leading-snug">{r.name}</li>)}
              </ul>
            ) : <div className="text-xs text-gray-400">无否决项配置</div>}
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-4">
             <div className="font-semibold text-green-700 mb-2 text-sm">加分项 ({modelSnapshot?.bonusRules?.length || 0})</div>
             {modelSnapshot?.bonusRules?.length ? (
               <ul className="list-disc pl-5 text-sm text-gray-600 pb-1">
                 {modelSnapshot.bonusRules.map(r => (
                   <li key={r.id} className="mb-1.5 leading-snug">
                     {r.name} <span className="text-green-600 font-medium ml-1">+{r.score}</span>
                   </li>
                 ))}
               </ul>
             ) : <div className="text-xs text-gray-400">无加分项配置</div>}
          </div>
        </div>
      </Drawer>
    </div>
  );
};
