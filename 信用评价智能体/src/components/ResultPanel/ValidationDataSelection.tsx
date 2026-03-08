import React, { useMemo, useState } from 'react';
import { useAgentStore } from '../../store';
import { Button, Checkbox, InputNumber, Radio, Select } from 'antd';
import { Database, UploadCloud, Download, Calculator, Building, Filter, CheckCircle2 } from 'lucide-react';

const INDUSTRIES = ['交通运输', '环境保护', '养老服务', '家政服务', '医疗健康', '教育培训'];
const ENTERPRISE_SCALES = [
  { label: '超大', value: '超大', weight: 5 },
  { label: '大型', value: '大型', weight: 15 },
  { label: '中型', value: '中型', weight: 30 },
  { label: '小型', value: '小型', weight: 40 },
  { label: '微型', value: '微型', weight: 10 }
];
const ENTERPRISE_NATURES = [
  { label: '国企', value: '国企', weight: 15 },
  { label: '民企', value: '民企', weight: 60 },
  { label: '混合', value: '混合', weight: 10 },
  { label: '中外合资', value: '中外合资', weight: 10 },
  { label: '外资', value: '外资', weight: 5 }
];

// Helper to calculate active options based on selection
const getActiveOptions = (combo: 'scale' | 'nature' | null) => {
  if (combo === 'scale') return ENTERPRISE_SCALES;
  if (combo === 'nature') return ENTERPRISE_NATURES;
  return [];
};

export const ValidationDataSelection: React.FC = () => {
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const settings = useAgentStore((state) => state.validationSettings);
  const updateSettings = useAgentStore((state) => state.updateValidationSettings);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);

  const [hasImported, setHasImported] = useState(false);

  const activeOptions = getActiveOptions(settings.selectedAttributeCombo);
  
  const isAllSelected = activeOptions.length > 0 && settings.selectedAttributeValues.length === activeOptions.length;
  const isIndeterminate = settings.selectedAttributeValues.length > 0 && settings.selectedAttributeValues.length < activeOptions.length;

  const onSelectAllChange = (e: any) => {
    updateSettings({
      selectedAttributeValues: e.target.checked ? activeOptions.map(opt => opt.value) : [],
    });
  };

  const sampleDistribution = useMemo(() => {
    if (settings.selectedAttributeValues.length === 0 || settings.sampleCount <= 0 || !settings.selectedAttributeCombo) return [];
    
    // Calculate total weight of currently selected active options
    const selectedDefs = activeOptions.filter(s => settings.selectedAttributeValues.includes(s.value));
    const totalWeight = selectedDefs.reduce((sum, s) => sum + s.weight, 0);
    
    if (totalWeight === 0) return [];
    
    // Distribute proportionally
    let remaining = settings.sampleCount;
    return selectedDefs.map((def, idx) => {
      if (idx === selectedDefs.length - 1) {
        return { label: def.label, count: remaining };
      }
      const count = Math.round((def.weight / totalWeight) * settings.sampleCount);
      remaining -= count;
      return { label: def.label, count };
    });
  }, [settings.selectedAttributeCombo, settings.selectedAttributeValues, settings.sampleCount, activeOptions]);

  if (!modelSnapshot) return null;

  return (
    <div className="h-full flex flex-col pt-6 px-12 pb-12 overflow-y-auto bg-gray-50/50">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calculator className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">模型验算准备</h2>
              <p className="text-sm text-gray-500 mt-1">选择或上传验算企业数据，对「{modelSnapshot.modelName}」进行跑批测试</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 flex flex-col gap-6">
          <div className="flex w-full max-w-sm">
            <div className="w-full flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => updateSettings({ mode: 'database' })}
                className={`flex-1 flex justify-center items-center py-2 px-3 text-sm gap-2 rounded-lg transition-all duration-200 ${settings.mode === 'database' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
              >
                <Database size={16} /> 湖仓随机抽样
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ mode: 'import' })}
                className={`flex-1 flex justify-center items-center py-2 px-3 text-sm gap-2 rounded-lg transition-all duration-200 ${settings.mode === 'import' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
              >
                <UploadCloud size={16} /> 本地上传导入
              </button>
            </div>
          </div>

          {settings.mode === 'database' ? (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 目标行业
                </label>
                <Select 
                  className="w-[320px]" 
                  value={settings.industry} 
                  onChange={v => updateSettings({ industry: v })}
                  options={[
                    { value: 'all', label: '所有行业' },
                    ...INDUSTRIES.map(i => ({ value: i, label: i }))
                  ]}
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 抽样基础条件 (支持单选主体属性，单选后可进行多标签组合抽样)
                </label>
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col gap-4">
                  
                  {/* Category Selection */}
                  <div className="flex items-center gap-4">
                     <span className="text-sm text-gray-600 font-medium">主体分类属性：</span>
                     <Radio.Group 
                       value={settings.selectedAttributeCombo} 
                       onChange={(e) => updateSettings({ selectedAttributeCombo: e.target.value, selectedAttributeValues: [] })}
                     >
                        <Radio value="scale">企业规模</Radio>
                        <Radio value="nature">企业性质</Radio>
                     </Radio.Group>
                  </div>

                  {settings.selectedAttributeCombo && (
                    <div className="pt-2 border-t border-gray-200 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                         <span className="text-xs text-gray-500 font-medium tracking-wider">
                           {settings.selectedAttributeCombo === 'scale' ? '企业规模' : '企业性质'}标签可选范围
                         </span>
                      </div>
                      <div className="flex items-start bg-white p-3 rounded-lg border border-gray-100 gap-6">
                         <div className="flex items-center min-w-[80px] pt-0.5">
                            <Checkbox 
                              indeterminate={isIndeterminate} 
                              onChange={onSelectAllChange} 
                              checked={isAllSelected}
                            >
                              全选
                            </Checkbox>
                         </div>
                         <Checkbox.Group 
                           options={activeOptions.map(opt => ({ label: opt.label, value: opt.value }))}
                           value={settings.selectedAttributeValues} 
                           onChange={vals => updateSettings({ selectedAttributeValues: vals as string[] })}
                           className="flex gap-x-6 gap-y-2 flex-wrap flex-1"
                         />
                      </div>
                    </div>
                  )}
                  
                  {!settings.selectedAttributeCombo && (
                    <div className="text-sm text-gray-400 italic py-2">
                      请先选择上方的主体分类属性，随后可勾选该属性下包含的标签用于比例分配。
                    </div>
                  )}

                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 随机抽签总数
                </label>
                <div className="flex items-center gap-3">
                  <InputNumber 
                    min={1} 
                    max={100000} 
                    value={settings.sampleCount} 
                    onChange={v => updateSettings({ sampleCount: v || 100 })}
                    className="w-40"
                    addonAfter="家"
                  />
                  {sampleDistribution.length > 0 && (
                    <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2 text-sm text-emerald-700 px-4">
                      <Filter size={14} className="opacity-70" />
                      按规模比例自动分配：
                      <div className="flex gap-3 ml-1">
                        {sampleDistribution.map(sd => (
                          <span key={sd.label} className="font-medium bg-white px-2 py-0.5 rounded text-emerald-800 border border-emerald-200 shadow-sm">
                            {sd.label} <span className="opacity-70 text-xs ml-1">{sd.count}家</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
               <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-16 transition-colors hover:bg-gray-100 hover:border-blue-400 cursor-pointer text-center px-6">
                 <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                   <UploadCloud className="text-blue-500" size={28} />
                 </div>
                 <h3 className="font-medium text-gray-800 text-base mb-1">点击或拖拽上传验算企业名单</h3>
                 <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
                   支持 .xlsx, .csv 格式。包含了企业统一信用代码、名称及各类基础经营数据字段。
                 </p>
                 <div className="flex items-center gap-3">
                   <Button onClick={() => setHasImported(true)} type="primary" className="bg-blue-600 shadow-sm">
                     模拟选择文件
                   </Button>
                   <Button icon={<Download size={14}/>} variant="outlined" className="text-gray-600">
                     下载模板
                   </Button>
                 </div>
               </div>

               {hasImported && (
                 <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                   <CheckCircle2 className="text-green-500 mt-0.5" size={18} />
                   <div className="flex flex-col">
                     <span className="font-medium text-green-800 text-sm">已成功读取数据文件 (data_eval_samples_2025.xlsx)</span>
                     <span className="text-green-700 text-xs mt-1 opacity-80">共识别出有效企业数据主体：5,321 条</span>
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
           <div className="text-sm text-gray-500 flex items-center gap-2">
             <Building size={14} /> 
             {settings.mode === 'database' ? (
               `当前条件在总库中预计匹配 ${(settings.sampleCount * 3.5).toFixed(0)} 家潜在企业，将随机抽取 ${settings.sampleCount} 家。`
             ) : (
               hasImported ? '将使用本地上传名单执行验算。' : '请先上传数据文件。'
             )}
           </div>
           <Button 
             type="primary" 
             size="large"
             className="bg-blue-600 font-medium px-8 h-10 shadow-sm"
             disabled={settings.mode === 'import' && !hasImported}
             onClick={() => setValidationStep('computing')}
           >
             开始验算
           </Button>
        </div>
      </div>
    </div>
  );
};
