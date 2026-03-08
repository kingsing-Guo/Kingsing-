import React, { useState } from 'react';
import { useAgentStore } from '../../store';
import { FileText, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { Drawer, Popconfirm } from 'antd';
import { buildMockModelWithAiRecommendation } from '../../mock/model-builder';
import { toPreferenceTags } from '../../utils/preference-tags';

const RequirementSummary: React.FC = () => {
  const requirement = useAgentStore((state) => state.requirement);
  const setPhase = useAgentStore((state) => state.setPhase);
  const setModelSnapshot = useAgentStore((state) => state.setModelSnapshot);
  const removeUploadedFile = useAgentStore((state) => state.removeUploadedFile);
  const removeReferenceCase = useAgentStore((state) => state.removeReferenceCase);
  const activeProjectName = useAgentStore((state) => {
    const currentProject = state.projects.find((project) => project.id === state.activeProjectId);
    return currentProject?.name || '';
  });

  const [previewData, setPreviewData] = useState<{
    title: string;
    content: string;
    summary?: string;
    source?: string;
  } | null>(null);
  const preferenceTags = toPreferenceTags(requirement.preferenceSummary, requirement.preferences);

  const hasFiles = requirement.files.length > 0;
  const handleStartBuild = () => {
    setPhase('BUILDING');
    setTimeout(() => {
      const builtModel = buildMockModelWithAiRecommendation({
        modelName: activeProjectName,
      });
      setModelSnapshot(builtModel);
      setPhase('ADJUSTING');
    }, 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">需求与材料汇总</h2>
          <p className="text-sm text-gray-500 mt-1">智能体已收集并解析您的构建需求和参考材料</p>
        </div>
        <button 
          onClick={handleStartBuild}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <CheckCircle2 size={16} />
          <span>确认并开启智能构建</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pb-6">
        {/* 左侧：需求与偏好 */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-medium text-gray-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            需求与偏好归纳
          </h3>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col gap-4 p-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <div className="text-sm font-medium text-blue-800 mb-2">构建需求归纳</div>
              {requirement.requirementSummary.length > 0 ? (
                <ul className="space-y-1 text-sm text-gray-700 leading-relaxed">
                  {requirement.requirementSummary.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-1.5">
                      <span className="text-blue-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  暂未提取到明确需求，请在左侧输入评价对象、评价基础或关键指标方向。
                </p>
              )}
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
              <div className="text-sm font-medium text-amber-800 mb-2">偏好重点归纳</div>
              {preferenceTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferenceTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-md border border-amber-200 bg-white px-2.5 py-1 text-sm text-amber-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  暂未提取到偏好信息，您可以说明“重点关注/优先考虑/希望更严格”的方向。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：文件 + 参考案例 */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-medium text-gray-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              已解析的政策文件与参考办法
            </h3>

            {hasFiles ? (
              <div className="space-y-4">
                {requirement.files.map((file) => (
                  <div key={file.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm group hover:border-blue-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm">{file.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.originalText && (
                          <button
                            onClick={() =>
                              setPreviewData({
                                title: file.name,
                                content: file.originalText || '',
                                summary: file.summary,
                                source: '上传文件',
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                            title="查看原文"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <Popconfirm
                          title="删除文件"
                          description={`确认删除「${file.name}」吗？`}
                          okText="删除"
                          cancelText="取消"
                          placement="topRight"
                          onConfirm={() => removeUploadedFile(file.id)}
                        >
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                            title="删除文件"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                    {file.summary && (
                      <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                        <span className="font-medium text-gray-700">AI 摘要：</span>
                        {file.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 h-40">
                <FileText size={32} className="mb-2 opacity-20" />
                <p className="text-sm text-gray-500">暂未上传政策材料</p>
                <p className="text-xs mt-1">可在左侧对话框点击附件上传图标</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-base font-medium text-gray-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
              检索的相关参考案例
            </h3>
            {requirement.referenceCases.length > 0 ? (
              <div className="space-y-4">
                {requirement.referenceCases.map((refCase) => (
                  <div key={refCase.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-purple-200 transition-colors">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-medium text-gray-800 text-sm">{refCase.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded self-start">
                          {refCase.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {refCase.originalText && (
                          <button
                            onClick={() =>
                              setPreviewData({
                                title: refCase.title,
                                content: refCase.originalText || '',
                                summary: refCase.summary,
                                source: refCase.source,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center"
                            title="查看原文"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <Popconfirm
                          title="删除参考案例"
                          description={`确认删除「${refCase.title}」吗？`}
                          okText="删除"
                          cancelText="取消"
                          placement="topRight"
                          onConfirm={() => removeReferenceCase(refCase.id)}
                        >
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                            title="删除参考案例"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-50 leading-relaxed">
                      {refCase.summary}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400">
                <p className="text-sm">暂未搜寻参考案例，<br />可对智能体下达指令如<br />“帮忙搜一下其他省市的做法”</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        title={<span className="font-medium">{previewData?.title}</span>}
        placement="right"
        width={600}
        onClose={() => setPreviewData(null)}
        open={!!previewData}
        className="text-gray-800"
      >
        <div className="flex flex-col gap-4">
          {(previewData?.source || previewData?.summary) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              {previewData?.source && <div className="text-xs text-gray-500 mb-1">来源：{previewData.source}</div>}
              {previewData?.summary && (
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-700">AI 摘要：</span>
                  {previewData.summary}
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-gray-500">原文内容</div>
          <div className="whitespace-pre-wrap leading-relaxed text-sm">
            {previewData?.content}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default RequirementSummary;
