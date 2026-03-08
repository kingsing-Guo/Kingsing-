import React, { useState } from 'react';
import { useAgentStore } from '../../../store';
import { Upload, Button } from 'antd';
import type { UploadFile } from 'antd';
import { FileText, Upload as UploadIcon, Paperclip, X } from 'lucide-react';

const { Dragger } = Upload;

export const TemplateSelectionTab: React.FC = () => {
  const requirement = useAgentStore((state) => state.requirement);
  const setDocumentStep = useAgentStore((state) => state.setDocumentStep);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  return (
    <div className="flex flex-col h-full items-center justify-center p-8 bg-white overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">辅助生成《评价模型管理办法》</h2>
          <p className="text-gray-500">为了使最终生成的文档更符合贵单位的行文规范，您可以选择一份参考模板</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
          {/* 左侧：引用历史文件 */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" size={18} />
              直接使用已有需求文件
            </h3>
            <div className="flex-1 flex flex-col gap-3">
              {requirement.files.length > 0 ? (
                requirement.files.map(f => (
                  <div key={f.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 bg-blue-50 flex items-center justify-center rounded text-blue-600">
                      📄
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate">{f.name}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm py-8">
                  无历史配置的参考文件
                </div>
              )}
            </div>
          </div>

          {/* 右侧：新上传 */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UploadIcon className="text-indigo-500" size={18} />
              上传新管理办法模版
            </h3>
            <div className="flex-1 flex flex-col gap-3">
              <Dragger 
                className="h-full bg-white border-dashed border-gray-300 hover:border-indigo-400 transition-colors rounded-lg"
                fileList={fileList}
                showUploadList={false}
                beforeUpload={() => false}
                onChange={(info) => {
                  setFileList(info.fileList);
                }}
                onDrop={(e) => {
                  console.log('Dropped files', e.dataTransfer.files);
                }}
              >
                <p className="ant-upload-drag-icon text-indigo-400 mb-2">
                  <UploadIcon className="mx-auto" size={32} />
                </p>
                <p className="ant-upload-text text-gray-600 font-medium">点击或将文件拖拽到此区域</p>
                <p className="ant-upload-hint text-gray-400 text-xs mt-2 px-4">
                  支持 .docx / .pdf / .txt 格式，作为文案风格和章节模板参考
                </p>
              </Dragger>
              <div className="min-h-[72px] rounded-lg border border-gray-200 bg-white px-3 py-2">
                {fileList.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-28 overflow-y-auto pr-1">
                    {fileList.map((file) => (
                      <div
                        key={file.uid}
                        className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5"
                      >
                        <Paperclip size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
                          }}
                          className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                          title="移除文件"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full min-h-[52px] flex items-center text-xs text-gray-400">
                    暂未添加模板文件
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            type="primary" 
            size="large" 
            className="w-48 bg-blue-600 hover:bg-blue-500 h-12 shadow-md font-medium text-[15px]"
            onClick={() => setDocumentStep('generating')}
          >
            启动智能撰写
          </Button>
        </div>
      </div>
    </div>
  );
};
