import React, { useRef, useEffect } from 'react';
import { useAgentStore } from '../../store';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check } from 'lucide-react';
import { message } from 'antd';

const MessageList: React.FC = () => {
  const chatHistory = useAgentStore((state) => state.chatHistory);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const copyText = async (msgId: string, text: string) => {
    const content = text.trim();
    if (!content) {
      message.warning('没有可复制的内容');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(msgId);
      message.success('已复制');
      window.setTimeout(() => setCopiedId((prev) => (prev === msgId ? null : prev)), 1200);
    } catch {
      message.error('复制失败，请重试');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {chatHistory.map((msg) => {
        const isAI = msg.role === 'ai';
        return (
          <div key={msg.id} className={`flex gap-3 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
            {/* Avatar */}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAI ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              {isAI ? <Bot size={18} /> : <User size={18} />}
            </div>
            
            {/* Message Bubble */}
            <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 pr-16 text-sm leading-relaxed ${isAI ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none shadow-sm'}`}>
              <button
                type="button"
                className={`group/copy absolute right-2 top-2 z-10 inline-flex items-center rounded-full border px-1.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                  copiedId === msg.id
                    ? 'border-emerald-500 bg-emerald-500 text-white ring-1 ring-emerald-200'
                    : isAI
                      ? 'border-gray-200 bg-white/85 text-gray-500 opacity-60 group-hover:opacity-95 hover:border-blue-300 hover:text-blue-600'
                      : 'border-white/35 bg-white/15 text-white/90 opacity-65 group-hover:opacity-95 hover:bg-white hover:text-blue-600 hover:border-white'
                }`}
                onClick={() => copyText(msg.id, msg.content)}
                title="复制内容"
              >
                {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                    copiedId === msg.id
                      ? 'ml-1 max-w-12 opacity-100'
                      : 'max-w-0 opacity-0 ml-0 group-hover/copy:ml-1 group-hover/copy:max-w-12 group-hover/copy:opacity-100'
                  }`}
                >
                  {copiedId === msg.id ? '已复制' : '复制'}
                </span>
              </button>
              <div className={isAI ? 'prose prose-sm max-w-none' : 'whitespace-pre-wrap'}>
                {isAI ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default MessageList;
