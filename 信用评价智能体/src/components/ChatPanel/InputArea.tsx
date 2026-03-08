import React from 'react';
import { Send } from 'lucide-react';
import { Modal } from 'antd';
import FileUpload from './FileUpload';
import { useInputArea } from './hooks';
import { useAgentStore } from '../../store';

const getPhaseCommands = (phase: string, validationStep: string): string[] => {
  if (phase === 'REQUIREMENT' || phase === 'BUILDING') {
    return [
      '开始构建指标体系',
      '帮我搜一下其他省市的做法',
      '按北京市供热企业场景构建模型',
      '模型偏向安全合规和供热服务质量',
      '把模型名字改为北京市供热企业信用评价模型',
    ];
  }
  if (phase === 'ADJUSTING') {
    return [
      '改为千分制',
      '增加加分项 获得国家级奖项 +8分',
      '增加否决项 发生重大安全事故',
      '把公共信用综合评价占比改为20%',
      '把A等级分值改为85',
      '开始验算',
    ];
  }
  if (phase === 'VALIDATING' && validationStep !== 'result') {
    return [
      '验算样本量改为300',
      '验算行业改为环境保护',
      '切换验算数据源为本地上传导入',
      '使用北京市95家供热企业样本',
      '开始验算跑批',
    ];
  }
  if (phase === 'RESULT' || (phase === 'VALIDATING' && validationStep === 'result')) {
    return [
      '切到企业列表',
      '只看有否决项企业',
      '只看有加分项企业',
      '取消否决项筛选',
      '取消加分项筛选',
      '进入上线发布',
    ];
  }
  if (phase === 'PUBLISH') {
    return [
      '版本号改为V1.2',
      '生效日期改为2026-04-01',
      '有效期改为2年',
      '确认发布',
      '帮我把模型转为Excel表格输出',
    ];
  }
  if (phase === 'DOCUMENT') {
    return [
      '选择模板',
      '开始生成管理办法',
      '预览文档',
      '导出Word文档',
    ];
  }
  return ['开始构建指标体系'];
};

const InputArea: React.FC = () => {
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const validationStep = useAgentStore((state) => state.validationStep);
  const {
    text,
    setText,
    setIsComposing,
    isTyping,
    pendingDeleteQuery,
    handleConfirmDeleteCommand,
    handleCancelDeleteCommand,
    handleSend,
    handleKeyDown
  } = useInputArea();
  const quickCommands = getPhaseCommands(currentPhase, validationStep);

  return (
    <div className="flex flex-col gap-2 relative bg-white pb-4 px-4">
      <Modal
        title="确认执行删除操作？"
        open={!!pendingDeleteQuery}
        centered
        onOk={handleConfirmDeleteCommand}
        onCancel={handleCancelDeleteCommand}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        maskClosable={false}
      >
        <div className="text-sm text-gray-600 leading-6">
          {pendingDeleteQuery ? `将执行指令：${pendingDeleteQuery}` : '该操作可能无法恢复，请确认是否继续。'}
        </div>
      </Modal>

      <div className="flex flex-wrap items-center gap-2 py-2">
        {quickCommands.map((cmd) => (
          <button 
            key={cmd}
            className="text-xs bg-blue-50/80 border border-blue-100 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            onClick={() => setText(cmd)}
          >
            {cmd}
          </button>
        ))}
      </div>
      
      <div className="relative flex items-end shadow-sm rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-all duration-200">
        <div className="p-2 shrink-0">
          <FileUpload />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="输入需求指令或描述，Shift+Enter换行..."
          className="w-full resize-none bg-transparent py-3 -ml-2 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          rows={Math.max(2, Math.min(text.split('\n').length, 5))}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isTyping}
          className="m-2 p-[10px] shrink-0 rounded-lg bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Send size={18} className={isTyping ? 'animate-pulse' : ''} />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
