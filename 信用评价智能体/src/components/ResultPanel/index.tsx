import { useAgentStore } from '../../store';
import RequirementSummary from './RequirementSummary';
import ModelAdjustPanel from './ModelAdjustPanel';
import { ConfigAnalysisModal } from './ConfigAnalysisModal';
import { ValidationDataSelection } from './ValidationDataSelection';
import { ValidationComputingOverlay } from './ValidationComputingOverlay';
import { ValidationResult } from './ValidationResult';
import { PublishPanel } from './PublishPanel';
import { DocumentGenerator } from './DocumentGenerator';
import { Loader2 } from 'lucide-react';

const ResultPanel: React.FC = () => {
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const validationStep = useAgentStore((state) => state.validationStep);

  return (
    <div className="flex h-full flex-col p-6">
      {/* Dynamic Content based on Phase */}
      {currentPhase === 'REQUIREMENT' && (
        <RequirementSummary />
      )}
      
      {currentPhase === 'BUILDING' && (
        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <h2 className="text-xl font-medium text-gray-800 mb-2">模型智能化构建中...</h2>
          <p className="text-gray-500 max-w-md">基于您提供的政策文件和需求摘要，智能体正在推导多维评价指标、推荐初始权重并配置数据来源与评分规则。</p>
        </div>
      )}

      {currentPhase === 'ADJUSTING' && (
        <ModelAdjustPanel />
      )}

      {(currentPhase === 'VALIDATING' || currentPhase === 'RESULT') && (
        <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
          <ConfigAnalysisModal />
          
          {validationStep === 'data_selection' && (
            <ValidationDataSelection />
          )}

          {validationStep === 'computing' && (
            <ValidationComputingOverlay />
          )}

          {(validationStep === 'result' || currentPhase === 'RESULT') && (
            <ValidationResult />
          )}
        </div>
      )}

      {currentPhase === 'PUBLISH' && (
        <PublishPanel />
      )}

      {currentPhase === 'DOCUMENT' && (
        <DocumentGenerator />
      )}

      {!['REQUIREMENT', 'BUILDING', 'ADJUSTING', 'VALIDATING', 'RESULT', 'PUBLISH', 'DOCUMENT'].includes(currentPhase) && (
        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col justify-center text-center">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Phase: {currentPhase}</h2>
          <p className="text-gray-500">该阶段页面规划在后续阶段开发集成。</p>
        </div>
      )}
    </div>
  );
};

export default ResultPanel;
