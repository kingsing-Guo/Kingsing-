import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useAgentStore } from '../../store';
import { generateMockAiResponse } from '../../mock/ai-mock-hooks';
import type { ReferenceCase } from '../../types/model';
import { buildMockModelWithAiRecommendation } from '../../mock/model-builder';
import { executeChatCommand, shouldConfirmDeleteCommand } from '../../utils/chat-command';

export const useInputArea = () => {
  const [text, setText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingDeleteQuery, setPendingDeleteQuery] = useState<string | null>(null);
  
  const addMessage = useAgentStore((state) => state.addMessage);
  const addReferenceCase = useAgentStore((state) => state.addReferenceCase);
  const setModelSnapshot = useAgentStore((state) => state.setModelSnapshot);
  const modelSnapshot = useAgentStore((state) => state.modelSnapshot);

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
      });

      if (commandResult.handled) {
        addMessage({
          role: 'ai',
          content: commandResult.reply || '指令已执行。',
        });
        return;
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
              const builtModel = buildMockModelWithAiRecommendation();
              setModelSnapshot(builtModel);
              useAgentStore.setState({ currentPhase: 'ADJUSTING' });
            }, 3000);

          } else if (userQuery.includes('验算') || userQuery.includes('试算')) {
            useAgentStore.setState({ currentPhase: 'VALIDATING', validationStep: 'checking' });
          } else if (userQuery.includes('搜') || userQuery.includes('案例') || userQuery.includes('参考')) {
            // 模拟搜集到了参考案例并写入 Store
            const mockCases: ReferenceCase[] = [
              {
                id: "ref-1",
                title: "《北京市环保企业信用评价管理办法（试行）》",
                source: "互联网检索",
                summary: "该办法采用了千分制体系，特色在于设立了“红名单”激励机制，并且环保处罚（如按日计罚）的扣分权重高达 30%。",
                originalText: "第一章 总则\n第一条 为推进本市生态环境保护领域信用体系建设，构建以信用为基础的新型监管机制，规范环保企业信用评价工作，依据《北京市优化营商环境条例》等有关规定，制定本办法。\n\n第二章 评价指标体系\n第四条 评价指标实施千分制。基础信用记分占40%权重，环保合规记分占60%权重。\n红名单激励机制：对连续3个评价周期未发生违法失信行为的企业，在各类环保审批中享受“绿色通道”并减少日常双随机抽查频次。"
              },
              {
                id: "ref-2",
                title: "《浙江省企业环保信用评价办法》",
                source: "互联网检索",
                summary: "办法分为 5 个信用等级，特别强调了企业的自我承诺以及公众监督渠道的加分项（约占总分 15%）。",
                originalText: "第一条 本办法旨在完善浙江省企业环保信用评价及结果应用（“绿码”制度）。\n第二条 信用分为5个等级：A/B/C/D/E 级，直接关联金融授信及差异化电价。\n第三条 公众监督加分项：企业主动公开本单位的碳排放、固废处理去向等社会监督事项的，可获得最高15%的总分附加奖励。"
              }
            ];
            mockCases.forEach(c => addReferenceCase(c));
          }

          // 全局关键字兜底捕获并写入用户偏好设置：重点、倾向、要求、偏好
          if (/(偏好|重点|倾向|结合|要求|希望)/.test(userQuery)) {
            const currentPref = useAgentStore.getState().requirement.preferences;
            const newPref = currentPref ? `${currentPref}\n- ${userQuery}` : `- ${userQuery}`;
            useAgentStore.getState().updatePreferences(newPref);
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
