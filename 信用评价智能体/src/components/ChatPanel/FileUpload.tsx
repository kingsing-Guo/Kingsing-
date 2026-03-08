import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { useAgentStore } from '../../store';
import { generateMockAiResponse } from '../../mock/ai-mock-hooks';
import type { UploadedFile } from '../../types/model';
import { BEIJING_HEATING_POLICY_FILE_LIBRARY } from '../../mock/beijing-heating-data';

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addUploadedFile = useAgentStore((state) => state.addUploadedFile);
  const addMessage = useAgentStore((state) => state.addMessage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const matchedPolicy = BEIJING_HEATING_POLICY_FILE_LIBRARY.find((item) => item.match.test(file.name));

    // Simulate file upload and parsing
    const mockUploadedFile: UploadedFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file), // mock url
      summary:
        matchedPolicy?.summary ||
        `这是对 ${file.name} 的 AI 智能摘要：文件重点强调供热行业监管中的安全生产、服务质量、公众投诉和失信惩戒机制，可用于构建年度信用评价模型。`,
      originalText:
        matchedPolicy?.originalText ||
        `【模拟提取文档原文：${file.name}】\n\n一、考核目标：建立供热企业信用跟踪和分级监管机制。\n二、指标分类说明：\n1. 安全与合规：重大事故、失信执行人等触发否决。\n2. 供热质量：室温达标率、投诉率和稳定供热能力。\n3. 经营与绿色：能效、排放合规与管理执行。\n\n*本文档包含较长条文内容，此处为结构化节选。`,
    };

    addUploadedFile(mockUploadedFile);
    
    // User message
    addMessage({
      role: 'user',
      content: `[上传文件] ${file.name}`
    });

    // Mock AI response
    addMessage({ role: 'ai', content: '' }); // placeholder
    
    generateMockAiResponse(
      'UPLOAD_MOCK',
      (text) => {
        useAgentStore.setState((state) => {
          const newHistory = [...state.chatHistory];
          newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], content: text };
          return { chatHistory: newHistory };
        });
      },
      () => {
        // done
      }
    );
    // clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pdf,.doc,.docx,.xls,.xlsx"
      />
      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="上传政策文件或管理办法"
      >
        <Paperclip size={20} />
      </button>
    </div>
  );
};

export default FileUpload;
