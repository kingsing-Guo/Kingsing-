import React from 'react';
import ChatPanel from '../../components/ChatPanel';
import ResultPanel from '../../components/ResultPanel';
import { useAgentStore } from '../../store';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Steps } from 'antd';
import type { AppPhase } from '../../types/model';

const AgentWorkspace: React.FC = () => {
  const isSidebarCollapsed = useAgentStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useAgentStore((state) => state.toggleSidebar);
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const validationStep = useAgentStore((state) => state.validationStep);

  const maxUnlockedPhase = useAgentStore((state) => state.maxUnlockedPhase);

  const phaseToStepOptions = [
    { title: '需求收集', phase: 'REQUIREMENT' as AppPhase },
    { title: '模型构建', phase: 'BUILDING' as AppPhase },
    { title: '模型微调', phase: 'ADJUSTING' as AppPhase },
    { title: '模型验算', phase: 'VALIDATING' as AppPhase },
    { title: '结果分析', phase: 'RESULT' as AppPhase },
    { title: '上线发布', phase: 'PUBLISH' as AppPhase },
    { title: '生成管理办法', phase: 'DOCUMENT' as AppPhase }
  ];

  const maxUnlockedStep = phaseToStepOptions.findIndex(o => o.phase === maxUnlockedPhase);
  let currentStep = phaseToStepOptions.findIndex(o => o.phase === currentPhase);
  if (currentPhase === 'VALIDATING' && validationStep === 'result') {
    currentStep = phaseToStepOptions.findIndex(o => o.phase === 'RESULT');
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 shadow-sm z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
            信
          </div>
          <h1 className="text-lg font-semibold text-gray-800 tracking-tight">公共信用评价模型构建智能体</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-medium">交通局</span>
          <div className="h-8 w-8 rounded-full bg-gray-200 border border-gray-300" />
        </div>
      </header>
      
      {/* Global Progress Stepper */}
      <div className="bg-white border-b border-gray-100 py-3 px-10 shadow-sm z-10 hidden sm:block">
        <Steps
          size="small"
          current={currentStep >= 0 ? currentStep : 0}
          onChange={(c) => {
            if (c > maxUnlockedStep) return; // 阻止未达到的节点跳跃
            const state = useAgentStore.getState();
            const targetPhase = phaseToStepOptions[c].phase;
            state.setPhase(targetPhase);
            if (targetPhase === 'VALIDATING') {
              state.setValidationStep('data_selection');
            } else if (targetPhase === 'RESULT') {
              state.setValidationStep('result');
            }
          }}
          items={phaseToStepOptions.map((t, idx) => ({ 
            title: t.title,
            disabled: idx > maxUnlockedStep
          }))}
          className="max-w-[1000px] mx-auto"
        />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left: Chat Panel */}
        <section 
          className={`flex flex-col border-r border-gray-200 bg-white shadow-[1px_0_5px_rgba(0,0,0,0.02)] z-10 transition-all duration-300 ease-in-out relative
            ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden border-r-0' : 'w-[40%] min-w-[350px] max-w-[500px] opacity-100'}
          `}
        >
          {/* 这里为了防止折叠时子元素被强行挤压变形，可以在父容器设置 min-w 也能在一定程度上保持，由于采用隐藏手段，我们让它隐藏时不占位 */}
          <div className={`w-full h-full min-w-[350px] transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <ChatPanel />
          </div>
        </section>

        {/* 悬浮的折叠/展开把手钮 */}
        <button 
          onClick={toggleSidebar}
          className={`absolute top-4 z-20 flex h-8 w-8 items-center justify-center rounded-r-lg bg-white border border-l-0 border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300
            ${isSidebarCollapsed ? 'left-0' : 'left-[40%] max-left-[500px] -ml-4 rounded-lg bg-white/80 backdrop-blur-sm border-l hover:shadow-md'}
          `}
          style={!isSidebarCollapsed ? { left: 'min(40%, 500px)' } : {}}
          title={isSidebarCollapsed ? "打开对话栏" : "收起对话栏"}
        >
           {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Right: Result Panel */}
        <section className="flex flex-1 flex-col bg-[#f8fafc] overflow-y-auto relative transition-all duration-300 ease-in-out">
          <ResultPanel />
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-gray-200 px-4 text-xs text-gray-500 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          智能体引擎就绪
        </div>
        <div className="flex items-center gap-4">
          <span>当前阶段: 需求收集</span>
          <span>版本: v0.1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default AgentWorkspace;
