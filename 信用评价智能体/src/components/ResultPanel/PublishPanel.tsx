import React, { useCallback, useEffect, useState } from 'react';
import { useAgentStore } from '../../store';
import { Button, Form, Input, DatePicker, Select, Popover, Drawer, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Send, FileText, CheckCircle, BarChart3, Database, FileSpreadsheet, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import type { IndicatorNode } from '../../types/model';
import { toPreferenceTags } from '../../utils/preference-tags';

export const PublishPanel: React.FC = () => {
  const requirement = useAgentStore((state) => state.requirement);
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const validationSettings = useAgentStore((state) => state.validationSettings);
  const publishSettings = useAgentStore((state) => state.publishSettings);
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const chatPublishSignal = useAgentStore((state) => state.chatPublishSignal);
  const consumedChatPublishSignal = useAgentStore((state) => state.consumedChatPublishSignal);
  const consumePublishConfirm = useAgentStore((state) => state.consumePublishConfirm);
  const updatePublishSettings = useAgentStore((state) => state.updatePublishSettings);
  const setPhase = useAgentStore((state) => state.setPhase);

  const [form] = Form.useForm();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [modelPreviewVisible, setModelPreviewVisible] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const initialValues = {
    modelName: modelSnapshot?.modelName || '企业公共信用综合评价模型',
    version: publishSettings.version,
    effectiveDate: publishSettings.effectiveDate ? dayjs(publishSettings.effectiveDate) : null,
    validityPeriod: publishSettings.validityPeriod,
  };

  const preferenceTags = toPreferenceTags(requirement.preferenceSummary, requirement.preferences);
  const visiblePreferenceTags = preferenceTags.slice(0, 5);
  const hiddenPreferenceCount = Math.max(0, preferenceTags.length - visiblePreferenceTags.length);
  const preferenceOverview =
    requirement.preferenceSummary.length > 0
      ? requirement.preferenceSummary.join('；')
      : requirement.preferences || '未指定特定偏好';

  const leafIndicatorsCount = modelSnapshot?.indicators.reduce((acc, curr) => 
    acc + (curr.children ? curr.children.length : 1), 0) || 0;

  const getTreeDepth = (nodes: IndicatorNode[]): number => {
    if (!nodes || nodes.length === 0) return 0;
    return 1 + Math.max(...nodes.map(n => getTreeDepth(n.children || [])));
  };
  const treeDepth = modelSnapshot ? getTreeDepth(modelSnapshot.indicators) : 0;

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

  const handlePublish = useCallback(async () => {
    try {
      const valuesBeforeValidate = form.getFieldsValue();
      if (!valuesBeforeValidate.modelName) {
        form.setFieldValue('modelName', modelSnapshot?.modelName || '企业公共信用综合评价模型');
      }
      if (!valuesBeforeValidate.version) {
        form.setFieldValue('version', publishSettings.version || 'V1.0');
      }
      if (!valuesBeforeValidate.effectiveDate) {
        form.setFieldValue(
          'effectiveDate',
          publishSettings.effectiveDate ? dayjs(publishSettings.effectiveDate) : dayjs().add(1, 'day'),
        );
      }
      if (!valuesBeforeValidate.validityPeriod) {
        form.setFieldValue('validityPeriod', publishSettings.validityPeriod || '1');
      }

      const values = await form.validateFields();
      setIsPublishing(true);
      
      // Simulate API call
      setTimeout(() => {
        updatePublishSettings({
          version: values.version,
          effectiveDate: values.effectiveDate ? values.effectiveDate.valueOf() : null,
          validityPeriod: values.validityPeriod,
        });
        setIsPublishing(false);
        setIsPublished(true);
      }, 1500);
    } catch (error) {
      const firstError = (error as { errorFields?: Array<{ errors?: string[] }> })?.errorFields?.[0]?.errors?.[0];
      message.warning(firstError || '发布前请先完善发布设置。');
    }
  }, [form, modelSnapshot, publishSettings, updatePublishSettings]);

  useEffect(() => {
    form.setFieldsValue({
      modelName: modelSnapshot?.modelName || '企业公共信用综合评价模型',
      version: publishSettings.version,
      effectiveDate: publishSettings.effectiveDate ? dayjs(publishSettings.effectiveDate) : null,
      validityPeriod: publishSettings.validityPeriod,
    });
  }, [form, modelSnapshot?.modelName, publishSettings]);

  useEffect(() => {
    const isNewChatConfirmSignal = chatPublishSignal > consumedChatPublishSignal;
    if (currentPhase === 'PUBLISH' && isNewChatConfirmSignal && !isPublished && !isPublishing) {
      consumePublishConfirm(chatPublishSignal);
      window.setTimeout(() => {
        void handlePublish();
      }, 0);
    }
    return undefined;
  }, [
    chatPublishSignal,
    consumedChatPublishSignal,
    consumePublishConfirm,
    currentPhase,
    isPublished,
    isPublishing,
    handlePublish,
  ]);

  if (isPublished) {
    return (
      <div className="flex h-full flex-col bg-white rounded-xl shadow-sm border border-gray-100 p-12 items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="text-green-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">模型发布成功</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          您的模型 <strong>{form.getFieldValue('modelName')} ({publishSettings.version})</strong> 已经成功上线，将于 {dayjs(publishSettings.effectiveDate).format('YYYY年MM月DD日')} 正式生效。
        </p>
        <div className="flex gap-4">
          <Button 
            type="primary" 
            size="large" 
            className="bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
            icon={<FileText size={18} />}
            onClick={() => setPhase('DOCUMENT')}
          >
            生成评价模型管理办法
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden rounded-xl border border-gray-100 shadow-sm relative">
      <div className="bg-white border-b border-gray-200 shrink-0 flex justify-center py-3 px-6">
        <div className="max-w-[1000px] w-full flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500" size={20} />
            起源与需求设定
          </h2>
          <div className="grid grid-cols-12 gap-3 text-[14px] items-center">
            <div className="col-span-12 lg:col-span-10 flex items-center gap-2 min-w-0">
              <span className="text-gray-500 shrink-0">偏好重点:</span>
              <Popover
                title={<span className="text-sm font-semibold">偏好重点（完整）</span>}
                content={<div className="max-w-[520px] text-sm text-gray-700 leading-relaxed">{preferenceOverview}</div>}
                trigger="hover"
                placement="bottomLeft"
              >
                <div className="bg-gray-50 px-2.5 py-1 rounded-md flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                  {preferenceTags.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                      {visiblePreferenceTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex h-6 items-center rounded-md border border-blue-100 bg-white px-2 text-xs font-medium text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {hiddenPreferenceCount > 0 && (
                        <span className="inline-flex h-6 items-center rounded-md border border-blue-100 bg-white px-2 text-xs text-blue-600">
                          +{hiddenPreferenceCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 truncate">暂无偏好</span>
                  )}
                </div>
              </Popover>
            </div>
            <div className="col-span-12 lg:col-span-2 flex items-center lg:justify-end gap-2">
              <span className="text-gray-500 shrink-0 whitespace-nowrap">参考文件:</span>
              <div>
                {requirement.files.length > 0 ? (
                  <Popover 
                    title={<span className="text-sm font-semibold">已引用文件清单</span>}
                    content={
                      <div className="flex flex-col gap-2 max-w-[280px]">
                        {requirement.files.map(f => (
                          <div key={f.id} className="text-sm text-gray-700 truncate hover:text-blue-600 transition-colors bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            📄 {f.name}
                          </div>
                        ))}
                      </div>
                    }
                    trigger="hover"
                    placement="bottomLeft"
                  >
                    <span className="h-7 text-blue-600 text-sm font-medium cursor-pointer inline-flex items-center gap-1 bg-blue-50/70 px-2.5 rounded-md border border-blue-100 hover:bg-blue-100/70 transition-colors">
                      {requirement.files.length} 份
                      <ChevronDown size={12} className="text-blue-400" />
                    </span>
                  </Popover>
                ) : (
                  <span className="h-7 text-gray-400 text-sm bg-gray-50 px-2.5 rounded-md border border-gray-100 inline-flex items-center">0 份</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center custom-scrollbar">
        <div className="max-w-[1000px] w-full flex gap-6">
          {/* Left Column: Full Panoramic Summary */}
          <div className="flex-[3] flex flex-col gap-5">
            {/* Section 2: Model Structural Snapshot */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Database className="text-indigo-500" size={18} />
                  模型概览与打分结构
                </h3>
                <Button 
                  size="small" 
                  icon={<Eye size={14} />} 
                  onClick={() => {
                    if (modelSnapshot) setExpandedKeys(modelSnapshot.indicators.map(i => i.id));
                    setModelPreviewVisible(true);
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  查看模型详情
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 relative overflow-hidden">
                  <span className="text-xs text-indigo-600/70 block mb-1">指标体系层级</span>
                  <div className="text-xl font-bold text-indigo-800">{treeDepth} <span className="text-[13px] font-medium text-indigo-600/80">级评价体系</span></div>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 relative overflow-hidden">
                  <span className="text-xs text-indigo-600/70 block mb-1">末级评分项数目</span>
                  <div className="text-xl font-bold text-indigo-800">{leafIndicatorsCount} <span className="text-[13px] font-medium text-indigo-600/80">项打分节点</span></div>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 relative overflow-hidden">
                  <span className="text-xs text-indigo-600/70 block mb-1">系统总分制规划</span>
                  <div className="text-xl font-bold text-indigo-800">{modelSnapshot?.totalScoreMode || 100} <span className="text-[13px] font-medium text-indigo-600/80">分制定价</span></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-xs text-gray-500 block mb-1">最终预设评分等级</span>
                  <div className="text-[15px] font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                    {modelSnapshot?.gradeLevels.map(g => (
                      <span key={g.id} className="bg-white border border-gray-200 shadow-sm px-1.5 py-0.5 rounded text-xs">{g.name}</span>
                    )) || <span>A/B/C/D</span>}
                  </div>
                </div>
                <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                  <span className="text-xs text-orange-600/70 block mb-1">特殊一票否决项</span>
                  <div className="text-[15px] font-bold text-orange-700">{modelSnapshot?.vetoRules.length || 0} 项</div>
                </div>
                <div className="bg-green-50/50 border border-green-100 rounded-lg p-3">
                  <span className="text-xs text-green-600/70 block mb-1">特殊弹性加分规则</span>
                  <div className="text-[15px] font-bold text-green-700">{modelSnapshot?.bonusRules.length || 0} 项</div>
                </div>
              </div>
            </div>

            {/* Section 3: Validation Performance Data */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <BarChart3 className="text-emerald-500" size={18} />
                模型验算表现
              </h3>
              <div className="flex gap-6 items-start">
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100">
                   <dl className="grid grid-cols-2 gap-y-4 gap-x-6">
                     <div>
                       <dt className="text-xs text-gray-500 mb-0.5">测试数据源</dt>
                       <dd className="text-sm font-semibold text-gray-800">
                         {validationSettings.mode === 'database' ? '湖仓随机抽样' : '本地文件导入'}
                       </dd>
                     </div>
                     <div>
                       <dt className="text-xs text-gray-500 mb-0.5">测试用样本量</dt>
                       <dd className="text-sm font-semibold text-gray-800">{validationSettings.sampleCount} 家</dd>
                     </div>
                     <div className="col-span-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-x-6">
                       <div>
                         <dt className="text-xs text-gray-500 mb-0.5">分布标准差 (σ)</dt>
                         <dd className="text-sm font-semibold text-gray-800">15.3</dd>
                       </div>
                       <div>
                         <dt className="text-xs text-gray-500 mb-0.5">分布偏度</dt>
                         <dd className="text-sm font-semibold text-gray-800">-0.8</dd>
                       </div>
                     </div>
                     <div className="col-span-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-x-6">
                       <div>
                         <dt className="text-xs text-gray-500 mb-0.5">核心 KS 值</dt>
                         <dd className="text-sm font-semibold text-emerald-600">0.90 (卓越)</dd>
                       </div>
                       <div>
                         <dt className="text-xs text-gray-500 mb-0.5">预测 AUC 积分面积</dt>
                         <dd className="text-sm font-semibold text-gray-800">0.94</dd>
                       </div>
                     </div>
                   </dl>
                </div>
                <div className="flex-1 text-sm text-gray-600 leading-relaxed bg-blue-50/30 p-4 rounded-lg border border-blue-100">
                  <span className="font-semibold text-blue-700 mb-1 block">AI 综合诊断结论：</span>
                  该模型对高风险违约样本和优质样本展现出了极强的区分隔离能力。KS达到0.9以上，各项评分分布趋势合理。该版本模型表现优异，已完全具备在生产环境中投入使用的条件，建议批准发布。
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Publish Form Actions */}
          <div className="flex-[2] flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 flex flex-col relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-70"></div>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-6">发布设置</h3>

              <Form 
                form={form} 
                layout="vertical" 
                initialValues={initialValues}
                className="flex-1"
                requiredMark={false}
              >
                <Form.Item 
                  label={<span className="font-medium text-gray-700">模型正式名称</span>} 
                  name="modelName"
                  rules={[{ required: true, message: '请输入模型名称' }]}
                >
                  <Input placeholder="输入模型名称" size="large" />
                </Form.Item>

                <Form.Item 
                  label={<span className="font-medium text-gray-700">发布版本号</span>} 
                  name="version"
                  rules={[{ required: true, message: '请输入版本号' }]}
                >
                  <Input placeholder="如 V1.0" size="large" />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item 
                    label={<span className="font-medium text-gray-700">计划启用时间</span>} 
                    name="effectiveDate"
                    rules={[{ required: true, message: '请选择启用时间' }]}
                  >
                    <DatePicker className="w-full" size="large" format="YYYY-MM-DD" />
                  </Form.Item>

                  <Form.Item 
                    label={<span className="font-medium text-gray-700">有效期设定</span>} 
                    name="validityPeriod"
                    rules={[{ required: true, message: '请选择有效期' }]}
                  >
                    <Select size="large">
                      <Select.Option value="1">一年</Select.Option>
                      <Select.Option value="2">二年</Select.Option>
                      <Select.Option value="3">三年</Select.Option>
                    </Select>
                  </Form.Item>
                </div>
              </Form>

              <div className="mt-auto pt-6">
                <Button 
                  type="primary" 
                  size="large" 
                  className="w-full bg-blue-600 hover:bg-blue-500 shadow-md font-medium text-[15px] h-12 flex items-center justify-center gap-2"
                  icon={<Send size={18} />}
                  onClick={handlePublish}
                  loading={isPublishing}
                >
                  确认正式发布
                </Button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  点击分布后，模型算法将同步至评价引擎并在计划启用时间正式生效。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Viewer Drawer */}
      <Drawer
        title={<span className="font-semibold text-gray-800">模型配置详情快照</span>}
        width={620}
        open={modelPreviewVisible}
        onClose={() => setModelPreviewVisible(false)}
        bodyStyle={{ backgroundColor: '#f9fafb', padding: '16px' }}
      >
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4 shadow-sm">
          <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Database size={16} className="text-indigo-500"/> 多级指标分值树
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
          <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
            <div className="font-semibold text-red-700 mb-2 text-sm flex items-center gap-2">一票否决项 ({modelSnapshot?.vetoRules?.length || 0})</div>
            {modelSnapshot?.vetoRules?.length ? (
              <ul className="list-disc pl-5 text-sm text-gray-600 pb-1">
                {modelSnapshot.vetoRules.map(r => <li key={r.id} className="mb-1.5 leading-snug">{r.name}</li>)}
              </ul>
            ) : <div className="text-xs text-gray-400">无否决项配置</div>}
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
             <div className="font-semibold text-green-700 mb-2 text-sm flex items-center gap-2">加分项 ({modelSnapshot?.bonusRules?.length || 0})</div>
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
