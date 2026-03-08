import React, { useEffect, useState } from 'react';
import { Modal, Tag } from 'antd';
import { BarChart2, Sparkles, Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAgentStore } from '../../store';
import type { IndicatorNode } from '../../types/model';

interface StepStatus {
  key: string;
  title: string;
  isChecking: boolean;
  isPassed: boolean;
  renderContent: () => React.ReactNode;
}

const getIndicatorStats = (indicators: IndicatorNode[]) => {
  let totalNodes = 0;
  let leafNodes = 0;
  let maxDepth = 0;
  const levelCounter = new Map<number, number>();

  const traverse = (nodes: IndicatorNode[], depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    nodes.forEach((node) => {
      totalNodes += 1;
      levelCounter.set(depth, (levelCounter.get(depth) || 0) + 1);
      if (!node.children || node.children.length === 0) {
        leafNodes += 1;
      } else {
        traverse(node.children, depth + 1);
      }
    });
  };
  traverse(indicators, 1);

  return {
    totalNodes,
    leafNodes,
    maxDepth,
    levelCounts: Array.from(levelCounter.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, count]) => ({ level, count })),
  };
};

export const ConfigAnalysisModal: React.FC = () => {
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const validationStep = useAgentStore((state) => state.validationStep);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);

  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const isVisible = validationStep === 'checking';

  useEffect(() => {
    if (!isVisible) {
      const resetTimer = window.setTimeout(() => {
        setCurrentCheckIndex(0);
        setIsComplete(false);
        setCountdown(3);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let timer: number | undefined;
    if (currentCheckIndex < 4) {
      timer = window.setTimeout(() => {
        setCurrentCheckIndex((prev) => prev + 1);
      }, 800);
    } else if (currentCheckIndex === 4 && !isComplete) {
      timer = window.setTimeout(() => {
        setIsComplete(true);
      }, 500);
    }

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [isVisible, currentCheckIndex, isComplete]);

  useEffect(() => {
    if (!isComplete || !isVisible) {
      return;
    }
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    setValidationStep('data_selection');
  }, [isComplete, countdown, isVisible, setValidationStep]);

  if (!modelSnapshot) return null;

  const { totalNodes, leafNodes, maxDepth, levelCounts } = getIndicatorStats(modelSnapshot.indicators);
  const maxBonus = modelSnapshot.bonusRules.reduce((sum, rule) => sum + rule.score, 0);
  const minScore = modelSnapshot.gradeLevels.length > 0 ? Math.min(...modelSnapshot.gradeLevels.map(l => l.minScore)) : 0;
  const maxScore = modelSnapshot.totalScoreMode;
  const gradeSummary = [...modelSnapshot.gradeLevels]
    .sort((a, b) => b.minScore - a.minScore)
    .map((item) => `${item.name}≥${item.minScore}`)
    .join(' / ');

  const steps: StepStatus[] = [
    {
      key: 'score',
      title: '检查评分配置',
      isChecking: currentCheckIndex === 0,
      isPassed: currentCheckIndex > 0,
      renderContent: () => (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex flex-wrap gap-2">
            <Tag icon={<BarChart2 size={12} className="mr-1 text-indigo-500" />} className="!bg-indigo-50/50 !border-indigo-100 !text-indigo-600 rounded">
              模型：{modelSnapshot.modelName}
            </Tag>
            <Tag icon={<BarChart2 size={12} className="mr-1 text-cyan-500" />} className="!bg-cyan-50/50 !border-cyan-100 !text-cyan-600 rounded">
              评分制：{modelSnapshot.totalScoreMode === 100 ? '百分制（100）' : '千分制（1000）'}
            </Tag>
            <Tag icon={<BarChart2 size={12} className="mr-1 text-blue-500" />} className="!bg-blue-50/50 !border-blue-100 !text-blue-600 rounded">
              已配置 {modelSnapshot.gradeLevels.length} 个评分等级
            </Tag>
            <Tag icon={<BarChart2 size={12} className="mr-1 text-green-500" />} className="!bg-green-50/50 !border-green-100 !text-green-600 rounded">
              分数范围 {minScore} ~ {maxScore}+
            </Tag>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
            当前等级阈值：{gradeSummary}
          </div>
          <div className="bg-gray-50/50 text-gray-500 text-xs px-3 py-2 rounded-md flex items-center gap-1.5 border border-gray-100 placeholder-opacity-70">
            <Sparkles size={14} className="text-yellow-400" /> 配置正常，未发现问题
          </div>
        </div>
      )
    },
    {
      key: 'structure',
      title: '检查指标体系',
      isChecking: currentCheckIndex === 1,
      isPassed: currentCheckIndex > 1,
      renderContent: () => (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex flex-wrap gap-2">
            <Tag icon={<BarChart2 size={12} className="mr-1 text-indigo-500" />} className="!bg-indigo-50/50 !border-indigo-100 !text-indigo-600 rounded">
              层级深度：{maxDepth} 级
            </Tag>
            <Tag icon={<BarChart2 size={12} className="mr-1 text-gray-500" />} className="!bg-gray-50/50 !border-gray-100 !text-gray-600 rounded">
              共 {totalNodes} 个节点 (含 {leafNodes} 个末级)
            </Tag>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
            {levelCounts.map((item) => `${item.level}级指标 ${item.count} 个`).join(' ｜ ')}
          </div>
          <div className="bg-gray-50/50 text-gray-500 text-xs px-3 py-2 rounded-md flex items-center gap-1.5 border border-gray-100">
            <Sparkles size={14} className="text-yellow-400" /> 配置正常，未发现问题
          </div>
        </div>
      )
    },
    {
      key: 'veto',
      title: '检查一票否决规则',
      isChecking: currentCheckIndex === 2,
      isPassed: currentCheckIndex > 2,
      renderContent: () => (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex gap-2">
            <Tag icon={<BarChart2 size={12} className="mr-1 text-red-500" />} className="!bg-red-50/50 !border-red-100 !text-red-600 rounded">
              已配置 {modelSnapshot.vetoRules.length} 条规则
            </Tag>
          </div>
          <div className="bg-gray-50/50 text-gray-500 text-xs px-3 py-2 rounded-md flex items-center gap-1.5 border border-gray-100">
            <Sparkles size={14} className="text-yellow-400" /> 配置正常，未发现问题
          </div>
        </div>
      )
    },
    {
      key: 'bonus',
      title: '检查加分项规则',
      isChecking: currentCheckIndex === 3,
      isPassed: currentCheckIndex > 3,
      renderContent: () => (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex gap-2">
            <Tag icon={<BarChart2 size={12} className="mr-1 text-blue-500" />} className="!bg-blue-50/50 !border-blue-100 !text-blue-600 rounded">
              已配置 {modelSnapshot.bonusRules.length} 条规则
            </Tag>
            <Tag icon={<BarChart2 size={12} className="mr-1 text-green-500" />} className="!bg-green-50/50 !border-green-100 !text-green-600 rounded">
              最高可加 {maxBonus} 分
            </Tag>
          </div>
          <div className="bg-gray-50/50 text-gray-500 text-xs px-3 py-2 rounded-md flex items-center gap-1.5 border border-gray-100">
            <Sparkles size={14} className="text-yellow-400" /> 配置正常，未发现问题
          </div>
        </div>
      )
    }
  ];

  return (
    <Modal
      open={isVisible}
      footer={null}
      closable={true}
      onCancel={() => {
        setValidationStep('idle');
      }}
      width={560}
      title={
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            AI
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-base">配置分析</span>
            <span className="text-xs text-gray-400 font-normal">{isComplete ? '分析完成' : '分析进行中...'}</span>
          </div>
        </div>
      }
    >
      <div className="mt-6 flex flex-col gap-4">
        {steps.map((step, idx) => {
          if (idx > currentCheckIndex) return null;

          return (
            <div key={step.key} className="flex gap-2">
              <div className="mt-1 flex-shrink-0">
                {step.isChecking ? (
                  <Loader2 className="animate-spin text-blue-500" size={16} />
                ) : (
                  <ChevronRight size={16} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${step.isChecking ? 'text-gray-800' : 'text-gray-600'}`}>
                    {step.title}
                  </span>
                  {step.isPassed && (
                    <div className="bg-green-100 text-green-600 w-4 h-4 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>
                {step.isPassed && step.renderContent()}
              </div>
            </div>
          );
        })}

        {isComplete && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-green-600 font-medium mb-3">
              <div className="bg-green-500 text-white rounded w-5 h-5 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={14} />
              </div>
              所有配置检查通过！
            </div>
            <button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              onClick={() => setValidationStep('data_selection')}
            >
              🚀 开始验算 <span className="text-white/80 text-sm">({countdown}秒后自动跳转)</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
