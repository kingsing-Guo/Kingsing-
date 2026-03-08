import React from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';

const ChatPanel: React.FC = () => {
  return (
    <div className="flex h-full flex-col relative w-full">
      {/* 顶部遮罩渐变 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
      
      {/* 消息对话区域 */}
      <MessageList />
      
      {/* 底部输入框区域 */}
      <div className="shrink-0 border-t border-gray-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
        <InputArea />
      </div>
    </div>
  );
};

export default ChatPanel;
