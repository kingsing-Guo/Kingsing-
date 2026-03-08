import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../store';
import { Cpu } from 'lucide-react';

export const ValidationComputingOverlay: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(['正在初始化计算引擎...']);
  const setValidationStep = useAgentStore((state) => state.setValidationStep);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 2;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => setValidationStep('result'), 1000);
      }
      setProgress(currentProgress);

      setLogs((prev) => {
        if (currentProgress > 10 && prev.length === 1) {
          return [...prev, '正在读取主体基础信用数据...'];
        }
        if (currentProgress > 30 && prev.length === 2) {
          return [...prev, '执行一票否决项规则预校验...'];
        }
        if (currentProgress > 50 && prev.length === 3) {
          return [...prev, '并发执行叶子指标区间规则扫描...'];
        }
        if (currentProgress > 70 && prev.length === 4) {
          return [...prev, '计算加分项，合成主干分数矩阵...'];
        }
        if (currentProgress > 90 && prev.length === 5) {
          return [...prev, '分数映射，生成最终信用评价等级...'];
        }
        if (currentProgress === 100 && prev.length === 6) {
          return [...prev, '✅ 验算完成，正在生成分析报告...'];
        }
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [setValidationStep]);

  return (
    <div className="h-full flex flex-col items-center justify-center pt-6 px-12 pb-12 bg-gray-50/50">
      <div className="w-[520px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col pt-8 pb-6 relative">
        {/* Dynamic header */}
        <div className="flex flex-col items-center gap-4 relative z-10 px-8">
           <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center relative shadow-sm">
              <Cpu size={32} className="text-blue-600 animate-pulse" />
              <div className="absolute -inset-2 border-2 border-blue-500 rounded-full animate-ping opacity-20"></div>
           </div>
           
           <h3 className="text-xl font-semibold text-gray-800 tracking-tight">模型跑批验算中</h3>
           <p className="text-sm text-gray-500 text-center">系统正在提取特征并应用全部评审规则集，请稍候</p>
        </div>

        {/* Progress bar */}
        <div className="px-10 mt-8 mb-4">
           <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              >
                  <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9InRyYW5zcGFyZW50Ii8+PGxpbmUgeDE9IjQiIHkxPSIwIiB4Mj0iMCIgeTI9IjQiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] bg-repeat shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)] opacity-70"></div>
              </div>
           </div>
           <div className="flex justify-between items-center mt-2">
               <span className="text-xs font-semibold text-blue-600">{progress}%</span>
               <span className="text-xs text-gray-400 font-mono">ESTIMATING...</span>
           </div>
        </div>

        {/* Terminal logs */}
        <div className="mt-4 mx-6 bg-[#0d1117] rounded-xl p-4 overflow-hidden h-40 flex flex-col justify-end">
           <div className="flex flex-col gap-2 font-mono text-[11px]">
             {logs.map((log, i) => (
                <div key={i} className={`flex items-start gap-2 ${i === logs.length - 1 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span className="opacity-50 select-none">&gt;</span>
                  <span className="typing-animation truncate">{log}</span>
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
