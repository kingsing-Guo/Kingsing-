import React, { useMemo, useState } from 'react';
import ChatPanel from '../../components/ChatPanel';
import ResultPanel from '../../components/ResultPanel';
import { useAgentStore } from '../../store';
import { PanelLeftClose, PanelLeftOpen, FolderOpen, Plus, History, Trash2 } from 'lucide-react';
import { Steps, Drawer, Input, Empty, Popconfirm } from 'antd';
import type { AppPhase } from '../../types/model';

const AgentWorkspace: React.FC = () => {
  const isSidebarCollapsed = useAgentStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useAgentStore((state) => state.toggleSidebar);
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const validationStep = useAgentStore((state) => state.validationStep);
  const maxUnlockedPhase = useAgentStore((state) => state.maxUnlockedPhase);
  const projects = useAgentStore((state) => state.projects);
  const activeProjectId = useAgentStore((state) => state.activeProjectId);
  const createProject = useAgentStore((state) => state.createProject);
  const switchProject = useAgentStore((state) => state.switchProject);
  const renameActiveProject = useAgentStore((state) => state.renameActiveProject);
  const deleteProject = useAgentStore((state) => state.deleteProject);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingName, setEditingName] = useState('');

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId],
  );
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects],
  );

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

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCreateProject = () => {
    createProject(newProjectName || undefined);
    setNewProjectName('');
    setProjectDrawerOpen(false);
  };

  const handleRenameProject = () => {
    if (!editingName.trim()) {
      return;
    }
    renameActiveProject(editingName);
  };

  const getPhaseLabel = (phase: AppPhase, step?: string) => {
    if (phase === 'VALIDATING' && step === 'result') {
      return '结果分析';
    }
    const matched = phaseToStepOptions.find((item) => item.phase === phase);
    return matched?.title || phase;
  };

  const currentModelName =
    activeProject?.snapshot.modelSnapshot?.modelName ||
    activeProject?.name ||
    '未命名模型';

  const getProjectProgressLabel = (project: (typeof projects)[number]) => {
    const displayPhase = project.snapshot.maxUnlockedPhase || project.snapshot.currentPhase;
    const displayStep = displayPhase === 'VALIDATING' ? project.snapshot.validationStep : undefined;
    return getPhaseLabel(displayPhase, displayStep);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 shadow-sm z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
            信
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-gray-800 tracking-tight shrink-0">公共信用评价模型构建智能体</h1>
            <span className="inline-flex max-w-[380px] truncate rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              当前模型：{currentModelName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold text-gray-700">北京市城管委供热办</div>
            <div className="text-xs text-gray-500">小宁</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-sm font-semibold">
            宁
          </div>
        </div>
      </header>
      
      {/* Global Progress Stepper */}
      <div className="bg-white border-b border-gray-100 py-2 px-4 shadow-sm z-10">
        <div className="w-full flex items-center">
          <div className="w-[200px] shrink-0">
            <button
              onClick={() => {
                setEditingName(activeProject?.name || '');
                setProjectDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100 transition-colors"
            >
              <FolderOpen size={14} />
              <span className="truncate">项目管理</span>
            </button>
          </div>

          <div className="flex-1 min-w-0 hidden sm:block px-3">
            <div className="mx-auto max-w-[980px]">
              <Steps
                size="small"
                current={currentStep >= 0 ? currentStep : 0}
                onChange={(c) => {
                  if (c > maxUnlockedStep) return;
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
              />
            </div>
          </div>
          <div className="hidden sm:block w-[200px] shrink-0" />
        </div>
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

      <Drawer
        title="项目管理"
        placement="left"
        width={420}
        open={projectDrawerOpen}
        onClose={() => setProjectDrawerOpen(false)}
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs text-gray-500 mb-2">当前项目</div>
            <div className="flex gap-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="请输入项目名称"
                maxLength={32}
              />
              <button
                onClick={handleRenameProject}
                className="inline-flex shrink-0 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                保存
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-800 mb-2">创建新项目</div>
            <div className="flex gap-2">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="例如：北京市供热企业信用评价模型"
                maxLength={32}
              />
              <button
                onClick={handleCreateProject}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                新建
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800">
              <History size={15} />
              历史项目
            </div>
            {sortedProjects.length > 0 ? (
              <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                {sortedProjects.map((project) => {
                  const isActive = project.id === activeProjectId;
                  return (
                    <div
                      key={project.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isActive ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{project.name}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {project.snapshot.modelSnapshot ? '已生成模型' : '未生成模型'} · {project.snapshot.chatHistory.length} 条消息
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            当前阶段：{getProjectProgressLabel(project)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">更新于 {formatTime(project.updatedAt)}</div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              switchProject(project.id);
                              setProjectDrawerOpen(false);
                            }}
                            disabled={isActive}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >
                            {isActive ? '当前' : '打开'}
                          </button>
                          <Popconfirm
                            title="删除项目"
                            description={`确认删除「${project.name}」吗？`}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            placement="leftTop"
                            onConfirm={() => deleteProject(project.id)}
                          >
                            <button
                              className="inline-flex items-center justify-center rounded-md border border-red-100 px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span className="ml-1">删除</span>
                            </button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史项目" />
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default AgentWorkspace;
