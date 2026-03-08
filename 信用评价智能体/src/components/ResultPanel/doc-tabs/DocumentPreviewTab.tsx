import React, { useState } from 'react';
import { useAgentStore } from '../../../store';
import { Button, message } from 'antd';
import { Download, Save } from 'lucide-react';
import dayjs from 'dayjs';
import { BEIJING_HEATING_DOC_TITLE } from '../../../mock/beijing-heating-data';

export const DocumentPreviewTab: React.FC = () => {
  const modelSnapshot = useAgentStore(state => state.modelSnapshot);
  const publishSettings = useAgentStore(state => state.publishSettings);
  const defaultDocTitle = modelSnapshot?.modelName
    ? `${modelSnapshot.modelName.replace(/模型$/, '').replace(/\s+/g, '')}管理办法`
    : BEIJING_HEATING_DOC_TITLE;
  
  const defaultDocContent = `
# ${defaultDocTitle} (草案)

## 第一章 总则
**第一条** 为规范北京市供热企业信用评价管理，依据相关政策法规与行业监管要求，制定本办法。
**第二条** 本办法适用于纳入监管范围的供热企业，评价周期按年度执行，模型结果有效期为 ${publishSettings.validityPeriod} 年。

## 第二章 评价指标体系结构
**第三条** 本评价模型共设置 ${modelSnapshot?.indicators.length || 0} 个一级指标门类，采用 ${modelSnapshot?.totalScoreMode || 100} 分制进行评估。

## 第三章 特殊计分准则
**第四条 一票否决规则**：
触发以下任意情形将被认定为信用不及格：
${modelSnapshot?.vetoRules.map((r, i) => `${i + 1}. ${r.name}`).join('\n') || '（无一票否决项）'}

**第五条 弹性加分规则**：
触发以下情形可获附带激励加分：
${modelSnapshot?.bonusRules.map((r, i) => `${i + 1}. ${r.name} (加 ${r.score} 分)`).join('\n') || '（无加分项）'}

## 第四章 附则
**第六条** 本办法自 ${publishSettings.effectiveDate ? dayjs(publishSettings.effectiveDate).format('YYYY年MM月DD日') : '发布之日'}起实施。
  `.trim();

  const [content, setContent] = useState(defaultDocContent);

  const handleSave = () => {
    localStorage.setItem('eval_agent_doc_draft', content);
    message.success('管理办法已成功保存至本地草稿');
  };

  const handleExport = () => {
    // 简易前端流式导出方案：将内容转为带有 msword mimetype 的 HTML
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
      "xmlns:w='urn:schemas-microsoft-com:office:word' "+
      "xmlns='http://www.w3.org/TR/REC-html40'>"+
      "<head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
    
    // Markdown转简易HTML保持段落 (换行和粗体)
    const formattedContent = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/# (.*?)$/gm, '<h1>$1</h1>');

    const sourceHTML = header + `<p>${formattedContent}</p>` + "</body></html>";
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${modelSnapshot?.modelName || '评价模型'}_管理办法.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    
    message.success('已开始下载 Word 文档');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 h-14 z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">生成结果阅读器</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">自动流排版</span>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<Save size={16} />} onClick={handleSave}>
            保存当前版本
          </Button>
          <Button type="primary" icon={<Download size={16} />} className="bg-blue-600" onClick={handleExport}>
            导出 Word
          </Button>
        </div>
      </div>

      {/* Editor 区块 */}
      <div className="flex-1 p-6 md:p-8 bg-[#f3f4f6] flex flex-col items-center overflow-hidden">
        <div className="bg-white w-full max-w-[900px] flex-1 flex flex-col shadow-md border border-gray-300 p-10 md:p-16 rounded-sm">
           <textarea 
             className="flex-1 w-full resize-none outline-none border-none text-[15px] md:text-base leading-relaxed text-gray-800 font-serif bg-transparent custom-scrollbar"
             value={content}
             onChange={(e) => setContent(e.target.value)}
             spellCheck={false}
           />
        </div>
      </div>
    </div>
  );
};
