import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Activity } from 'lucide-react';
import { useAgentStore } from '../../store';

const mockKSData = Array.from({ length: 11 }).map((_, i) => {
  const percentile = i * 10;
  // Make a curve where bad catches up quickly, good catches up slowly
  const badCumulative = Math.min(100, percentile * 2.5 + (percentile > 0 ? 10 : 0));
  const goodCumulative = percentile;
  return {
    percentile,
    bad: badCumulative,
    good: goodCumulative,
  };
});

export const ValidationResultKSTab: React.FC = () => {
  const sampleCount = useAgentStore((state) => state.validationSettings?.sampleCount) || 100;
  // Dynamic breakdown for mock display (approx 12.6% bad rate for 0.90 KS)
  const badCount = Math.round(sampleCount * 0.126); 
  const goodCount = sampleCount - badCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">KS 值 (最大区分度)</div>
          <div className="text-3xl font-bold text-blue-600 mb-1">0.90</div>
          <div className="text-xs text-gray-400">模型区分能力强</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">AUC (曲线下面积)</div>
          <div className="text-3xl font-bold text-purple-600 mb-1">0.94</div>
          <div className="text-xs text-gray-400">预测准确性良好</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">Bad Rate (低分段坏企业率)</div>
          <div className="text-3xl font-bold text-emerald-600 mb-1">60 <span className="text-lg font-normal text-gray-400">%</span></div>
          <div className="text-xs text-gray-400">前20%低分段覆盖</div>
        </div>
      </div>

      {/* KS Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          累积分布曲线 (K-S Plot)
        </h3>
        
        <div className="flex-1 w-full relative">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart
               data={mockKSData}
               margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
             >
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
               <XAxis 
                 dataKey="percentile" 
                 type="number"
                 domain={[0, 100]}
                 tickCount={6}
                 tick={{fill: '#9ca3af', fontSize: 12}} 
                 axisLine={{stroke: '#e5e7eb'}}
                 tickLine={false}
                 dy={10}
               />
               <YAxis 
                 domain={[0, 100]} 
                 tickCount={5}
                 tickFormatter={(val) => `${val}%`}
                 tick={{fill: '#9ca3af', fontSize: 12}} 
                 axisLine={false}
                 tickLine={false}
                 dx={-10}
               />
               
               <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                 formatter={(value, name) => [`${value}%`, name === 'bad' ? '违约样本' : '正常样本']}
                 labelFormatter={(val) => `评分百分位: ${val}%`}
               />

               {/* Background shading for the area below the curves to mimic the design */}
               <ReferenceArea x1={0} x2={100} y1={0} y2={100} fill="#fef2f2" fillOpacity={0.5} yAxisId={0} ifOverflow="hidden" />
               <ReferenceArea x1={0} x2={100} y1={0} y2={100} fill="#f0fdf4" fillOpacity={0.3} yAxisId={0} ifOverflow="hidden" />

               <ReferenceLine x={20} stroke="#3b82f6" strokeDasharray="4 4" />
               <ReferenceLine x={20} y={100} stroke="transparent" label={{ position: 'right', value: 'KS = 0.90', fill: '#3b82f6', fontSize: 13, fontWeight: 'bold' }} />

               <Line 
                 type="monotone" 
                 dataKey="bad" 
                 stroke="#ef4444" 
                 strokeWidth={3} 
                 dot={false}
                 activeDot={{ r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
                 name="bad"
               />
               <Line 
                 type="monotone" 
                 dataKey="good" 
                 stroke="#22c55e" 
                 strokeWidth={3} 
                 dot={false}
                 activeDot={{ r: 6, fill: '#22c55e', stroke: 'white', strokeWidth: 2 }}
                 name="good"
               />
             </LineChart>
           </ResponsiveContainer>
           
           {/* Chart Legend directly integrated */}
           <div className="absolute -bottom-2 left-0 w-full flex justify-center items-center gap-8">
             <div className="flex items-center gap-2">
               <div className="w-6 h-0.5 bg-red-500"></div>
               <span className="text-xs text-gray-600 font-medium">违约样本 (Bad: {badCount})</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-0.5 bg-green-500"></div>
               <span className="text-xs text-gray-600 font-medium">正常样本 (Good: {goodCount})</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-0.5 border-b-2 border-dashed border-blue-500"></div>
               <span className="text-xs text-gray-600 font-medium">KS 最大值点</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
