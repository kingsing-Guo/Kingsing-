import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { useAgentStore } from '../../store';
import { generateMockAiResponse } from '../../mock/ai-mock-hooks';
import type { UploadedFile } from '../../types/model';

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addUploadedFile = useAgentStore((state) => state.addUploadedFile);
  const addMessage = useAgentStore((state) => state.addMessage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate file upload and parsing
    const mockUploadedFile: UploadedFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file), // mock url
      summary: `这是对 ${file.name} 的 AI 智能摘要：该文件重点强调了在行业监管中应加大对安全生产、环保合规等指标的考察比重。建议在评分算法中采用阈值扣分制处理严重违规行为。`,
      originalText: `【模拟提取文档原文：${file.name}】\n\n一、考核目标：建立健全相关单位的信用跟踪机制，从源头抓起。\n二、指标分类说明：\n1. 安全生产 (30%)：一年内有重大安全生产事故则直接降级。\n2. 环保合规 (40%)：排污许可证制度的落实执行情况。\n3. 日常规范 (30%)：按时上报监管材料报表的完成度。\n\n*本文档包含 12,040 字，此处摘录段落代表解析通过的人类可读原文。`
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
