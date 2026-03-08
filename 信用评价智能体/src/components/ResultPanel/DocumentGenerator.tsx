import React from 'react';
import { useAgentStore } from '../../store';
import { TemplateSelectionTab } from './doc-tabs/TemplateSelectionTab';
import { DocumentGeneratingOverlay } from './doc-tabs/DocumentGeneratingOverlay';
import { DocumentPreviewTab } from './doc-tabs/DocumentPreviewTab';

export const DocumentGenerator: React.FC = () => {
  const documentStep = useAgentStore((state) => state.documentStep);

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {documentStep === 'template_selection' && <TemplateSelectionTab />}
      {documentStep === 'generating' && <DocumentGeneratingOverlay />}
      {documentStep === 'preview' && <DocumentPreviewTab />}
    </div>
  );
};
