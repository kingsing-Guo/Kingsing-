import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { useAgentStore } from '../../store';

const mockDistData = [
  { range: '0-20', count: 0, normalCount: 0.5 },
  { range: '20-40', count: 2, normalCount: 2 },
  { range: '40-60', count: 5, normalCount: 15 },
  { range: '60-80', count: 32, normalCount: 30 },
  { range: '80-100', count: 34, normalCount: 35 },
  { range: '100+', count: 9, normalCount: 10 },
  { range: '加分溢出', count: 8, normalCount: 3 } // Simulate the skewed tail on the right
];

export const ValidationResultDistTab: React.FC = () => {
  const sampleCount = useAgentStore((state) => state.validationSettings?.sampleCount) || 100;
  
  return (
    <div className="flex flex-col gap-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">平均分 (Mean)</div>
          <div className="text-2xl font-bold text-blue-600 mb-1">70.5</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">标准差 (Std Dev)</div>
          <div className="text-2xl font-bold text-teal-600 mb-1">15.3</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">偏度 (Skewness)</div>
          <div className="text-2xl font-bold text-orange-500 mb-1">-1.81</div>
          <div className="text-xs text-gray-400">左偏</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm mb-1">峰度 (Kurtosis)</div>
          <div className="text-2xl font-bold text-purple-600 mb-1">7.41</div>
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart2 size={16} className="text-purple-500" />
          分数频数分布直方图 <span className="text-gray-400 font-normal text-xs ml-2">(共 {sampleCount} 条数据)</span>
        </h3>
        
        <div className="flex-1 w-full relative">
           <ResponsiveContainer width="100%" height="100%">
             <ComposedChart
               data={mockDistData}
               margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
             >
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
               <XAxis 
                 dataKey="range" 
                 axisLine={false}
                 tickLine={false}
                 tick={{fill: '#9ca3af', fontSize: 12}} 
                 dy={10}
               />
               <YAxis 
                 domain={[0, 40]} 
                 tickCount={9}
                 axisLine={false}
                 tickLine={false}
                 tick={{fill: '#9ca3af', fontSize: 12}} 
                 label={{ value: '企业数量', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 12 }}
               />
               
               <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                 formatter={(value, name) => [value, name === 'count' ? '实际分布 (频数)' : '理想正态分布趋向']}
                 cursor={{fill: '#f3f4f6'}}
               />

               <Bar 
                 dataKey="count" 
                 fill="#6366f1" 
                 radius={[4, 4, 0, 0]} 
                 barSize={48}
                 name="count"
               />
               <Line 
                 type="monotone" 
                 dataKey="normalCount" 
                 stroke="#a855f7" 
                 strokeWidth={2} 
                 dot={false}
                 activeDot={{ r: 6, fill: '#a855f7', stroke: 'white', strokeWidth: 2 }}
                 name="normalCount"
               />
             </ComposedChart>
           </ResponsiveContainer>
           
           {/* Chart Legend directly integrated */}
           <div className="absolute top-0 left-0 flex items-center gap-4">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
               <span className="text-[11px] text-gray-500 font-medium">count</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-0.5 bg-purple-500"></div>
               <span className="text-[11px] text-gray-500 font-medium">normalCount</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
