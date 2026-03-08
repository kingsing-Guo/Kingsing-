import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../../store';
import { BrainCircuit, FileSignature, Layers } from 'lucide-react';

export const DocumentGeneratingOverlay: React.FC = () => {
  const setDocumentStep = useAgentStore(state => state.setDocumentStep);
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);

  const steps = [
    { text: '正在解析模版章节骨架...', icon: <Layers className="animate-pulse text-indigo-500" size={40} /> },
    { text: '正在提取大盘模型总分及计分逻辑...', icon: <BrainCircuit className="animate-bounce text-blue-500" size={40} /> },
    { text: '正在编撰最终模型管理办法条文...', icon: <FileSignature className="animate-pulse text-emerald-500" size={40} /> },
  ];

  useEffect(() => {
    // 进度条平滑增长，6秒到达100% (每100ms增加约1.67%)
    const interval = setInterval(() => {
      setPercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / (6000 / 100));
      });
    }, 100);

    // 动画流转逻辑: 总时长延至6秒，看起来更真实
    const timer1 = setTimeout(() => setStepIndex(1), 2000);
    const timer2 = setTimeout(() => setStepIndex(2), 4000);
    const finishTimer = setTimeout(() => {
      setDocumentStep('preview');
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(finishTimer);
    };
  }, [setDocumentStep]);

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col items-center justify-center min-h-[400px]">
      <div className="relative mb-8 w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="relative flex items-center justify-center w-full h-full">
          {/* We only render the icon of the current step, the spin provides the main motion */}
          {steps[stepIndex].icon}
        </div>
      </div>
      
      <h2 className="text-xl font-medium text-gray-800 mb-3 tracking-wide">
        AI 智能撰写中
      </h2>
      
      <div className="h-6 overflow-hidden relative w-[300px] text-center flex justify-center mb-6">
         <div 
           className="absolute w-full flex flex-col items-center transition-transform duration-500 ease-in-out"
           style={{ transform: `translateY(-${stepIndex * 24}px)` }}
         >
            {steps.map((s, idx) => (
              <span key={idx} className="h-6 flex items-center justify-center leading-6 text-sm text-gray-500 font-medium whitespace-nowrap">
                {s.text}
              </span>
            ))}
         </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-2" style={{ width: '150px' }}>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex items-stretch border border-gray-200 shadow-inner">
          <div 
            className="h-full rounded-full transition-all duration-[100ms] ease-linear"
            style={{ 
              width: `${Math.min(percent, 100)}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)'
            }}
          />
        </div>
        <span className="text-sm font-mono text-gray-500 font-medium tracking-wide mt-1">{Math.floor(percent)}%</span>
      </div>
    </div>
  );
};
