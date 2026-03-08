import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useAgentStore } from '../../store';
import { generateMockAiResponse } from '../../mock/ai-mock-hooks';
import type { ReferenceCase } from '../../types/model';
import { buildMockModelWithAiRecommendation } from '../../mock/model-builder';
import { executeChatCommand, shouldConfirmDeleteCommand } from '../../utils/chat-command';
import { mergeRequirementInsightFromInput, shouldExtractRequirementInsight } from '../../utils/requirement-insight';
import { BEIJING_HEATING_REFERENCE_CASES } from '../../mock/beijing-heating-data';

export const useInputArea = () => {
  const [text, setText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingDeleteQuery, setPendingDeleteQuery] = useState<string | null>(null);
  
  const addMessage = useAgentStore((state) => state.addMessage);
  const addReferenceCase = useAgentStore((state) => state.addReferenceCase);
  const updateRequirement = useAgentStore((state) => state.updateRequirement);
  const setModelSnapshot = useAgentStore((state) => state.setModelSnapshot);
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);
  const currentPhase = useAgentStore((state) => state.currentPhase);
  const setPhase = useAgentStore((state) => state.setPhase);
  const validationStep = useAgentStore((state) => state.validationStep);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);
  const updateValidationSettings = useAgentStore((state) => state.updateValidationSettings);
  const setResultActiveTab = useAgentStore((state) => state.setResultActiveTab);
  const updateResultListFilters = useAgentStore((state) => state.updateResultListFilters);
  const resetResultListFilters = useAgentStore((state) => state.resetResultListFilters);
  const updatePublishSettings = useAgentStore((state) => state.updatePublishSettings);
  const setDocumentStep = useAgentStore((state) => state.setDocumentStep);
  const requestPublishConfirm = useAgentStore((state) => state.requestPublishConfirm);
  const renameActiveProject = useAgentStore((state) => state.renameActiveProject);
  const activeProjectName = useAgentStore((state) => {
    const currentProject = state.projects.find((project) => project.id === state.activeProjectId);
    return currentProject?.name || '';
  });

  const runSendFlow = (query: string) => {
      const userQuery = query.trim();
      // User message
      addMessage({
        role: 'user',
        content: userQuery
      });

      setText('');

      const commandResult = executeChatCommand({
        input: userQuery,
        modelSnapshot,
        setModelSnapshot,
        currentPhase,
        setPhase,
        validationStep,
        setValidationStep,
        updateValidationSettings,
        setResultActiveTab,
        updateResultListFilters,
        resetResultListFilters,
        updatePublishSettings,
        setDocumentStep,
        requestPublishConfirm,
        renameActiveProject,
      });

      if (commandResult.handled) {
        addMessage({
          role: 'ai',
          content: commandResult.reply || '指令已执行。',
        });
        return;
      }

      if (shouldExtractRequirementInsight(userQuery, currentPhase)) {
        const currentRequirement = useAgentStore.getState().requirement;
        const requirementPatch = mergeRequirementInsightFromInput(currentRequirement, userQuery);
        if (requirementPatch) {
          updateRequirement(requirementPatch);
        }
      }

      // Placeholder for AI reply
      addMessage({
        role: 'ai',
        content: '...'
      });

      setIsTyping(true);

      generateMockAiResponse(
        userQuery,
        (partialText) => {
          useAgentStore.setState((state) => {
            const newHistory = [...state.chatHistory];
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              content: partialText
            };
            return { chatHistory: newHistory };
          });
        },
        () => {
          setIsTyping(false);
          // Phase routing mock
          if (userQuery.includes('构建') || userQuery.includes('开始') || userQuery.includes('生成')) {
            useAgentStore.setState({ currentPhase: 'BUILDING' });

            // 模拟大模型正在后台构建，3秒后完成并出结果页面
            setTimeout(() => {
              const builtModel = buildMockModelWithAiRecommendation({
                modelName: activeProjectName,
              });
              setModelSnapshot(builtModel);
              useAgentStore.setState({ currentPhase: 'ADJUSTING' });
            }, 3000);

          } else if (userQuery.includes('验算') || userQuery.includes('试算')) {
            useAgentStore.setState({ currentPhase: 'VALIDATING', validationStep: 'checking' });
          } else if (userQuery.includes('搜') || userQuery.includes('案例') || userQuery.includes('参考')) {
            const currentCases = useAgentStore.getState().requirement.referenceCases;
            const currentIds = new Set(currentCases.map((item) => item.id));
            const mockCases: ReferenceCase[] = BEIJING_HEATING_REFERENCE_CASES.filter(
              (item) => !currentIds.has(item.id),
            );
            mockCases.forEach((item) => addReferenceCase(item));
          }

        }
      );
  };

  const handleSend = () => {
    if (!text.trim() || isTyping) return;
    const userQuery = text.trim();
    if (shouldConfirmDeleteCommand(userQuery)) {
      setPendingDeleteQuery(userQuery);
      return;
    }
    runSendFlow(userQuery);
  };

  const handleConfirmDeleteCommand = () => {
    if (!pendingDeleteQuery) {
      return;
    }
    const query = pendingDeleteQuery;
    setPendingDeleteQuery(null);
    runSendFlow(query);
  };

  const handleCancelDeleteCommand = () => {
    setPendingDeleteQuery(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    text,
    setText,
    isComposing,
    setIsComposing,
    isTyping,
    pendingDeleteQuery,
    handleConfirmDeleteCommand,
    handleCancelDeleteCommand,
    handleSend,
    handleKeyDown
  };
};
