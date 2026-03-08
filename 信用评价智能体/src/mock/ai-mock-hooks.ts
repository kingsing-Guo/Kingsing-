export const MOCK_AI_RESPONSES: Record<string, string> = {
  default: "好的，我已经记录了您的需求。请问还有其他需要补充的政策文件或者具体考量点吗？",
  build: "了解到您的诉求。我正在基于您提供的材料和需求，为您智能构建**公共信用评价模型**... \n\n模型已经初步生成，请在右侧工作区查看具体的【指标体系】、【权重分配】和【计算规则】。您可以直接在右侧进行相应调整。",
  upload: "收到您上传的文件。我已经快速解析了该文档，提取了关键的信用评价指标和评估要求，并在右侧需求清单中更新了相关摘要信息。",
  validation: "好的，即将开启模型验算过程。系统正在抽取历史样本企业运行该评价模型... \n\n验算完成，右侧已生成【验算分析报告】及评分分布图。从 K-S 检验指标来看，模型具备较好的区分度。",
  search: "好的，我立刻为您在全网检索相关的行业信用评价管理办法和模型案例。\n\n我已经为您检索并提炼了2个高度相关的参考案例，并提取了其中的关键考核指标，现已更新展示在右侧的需求与材料汇总面板中，供您参考。"
};

export const generateMockAiResponse = (userText: string, onProgress: (text: string) => void, onComplete: () => void) => {
  let responseText = MOCK_AI_RESPONSES.default;
  
  if (userText.includes('构建') || userText.includes('开始') || userText.includes('生成')) {
    responseText = MOCK_AI_RESPONSES.build;
  } else if (userText.includes('验算') || userText.includes('试算') || userText.includes('验证')) {
    responseText = MOCK_AI_RESPONSES.validation;
  } else if (userText.includes('搜') || userText.includes('案例') || userText.includes('参考')) {
    responseText = MOCK_AI_RESPONSES.search;
  } else if (userText === 'UPLOAD_MOCK') {
    responseText = MOCK_AI_RESPONSES.upload;
  }

  let index = 0;
  // 模拟打字机效果
  const interval = setInterval(() => {
    index += 2;
    if (index >= responseText.length) {
      onProgress(responseText);
      onComplete();
      clearInterval(interval);
    } else {
      onProgress(responseText.slice(0, index));
    }
  }, 30);
};
