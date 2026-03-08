import { create } from 'zustand';
import type { AppPhase, ModelRequirement, UploadedFile, ReferenceCase, CreditEvalModel, ValidationStep, DocumentStep, ValidationSettings, PublishSettings } from '../types/model';
import type { ChatMessage } from '../types/chat';

interface AgentState {
  currentPhase: AppPhase;
  chatHistory: ChatMessage[];
  requirement: ModelRequirement;
  modelSnapshot: CreditEvalModel | null; // Phase 2: 构建出的模型实体
  isSidebarCollapsed: boolean; // 是否折叠了左侧聊天侧栏
  validationStep: ValidationStep;
  validationSettings: ValidationSettings;
  publishSettings: PublishSettings;
  documentStep: DocumentStep;
  maxUnlockedPhase: AppPhase; // 记录用户实际上达到的最高主流程阶段 
  
  // Actions
  setPhase: (phase: AppPhase) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addUploadedFile: (file: UploadedFile) => void;
  addReferenceCase: (refCase: ReferenceCase) => void;
  updatePreferences: (preferences: string) => void;
  setModelSnapshot: (model: CreditEvalModel | null) => void;
  toggleSidebar: () => void;
  setValidationStep: (step: ValidationStep) => void;
  updateValidationSettings: (settings: Partial<ValidationSettings>) => void;
  updatePublishSettings: (settings: Partial<PublishSettings>) => void;
  setDocumentStep: (step: DocumentStep) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  currentPhase: 'REQUIREMENT',
  chatHistory: [
    {
      id: 'welcome_1',
      role: 'ai',
      content: '您好！我是公共信用评价模型构建智能体。为了给您提供最合适的模型建议，请先上传相关的政策文件（如管理办法），或者直接告诉我您的评价重点和管理需求。',
      timestamp: Date.now(),
    }
  ],
  requirement: {
    files: [],
    referenceCases: [],
    preferences: ''
  },
  modelSnapshot: null,
  isSidebarCollapsed: false,
  validationStep: 'idle',
  validationSettings: {
    mode: 'database',
    industry: 'all',
    selectedAttributeCombo: null,
    selectedAttributeValues: [],
    sampleCount: 100,
  },
  publishSettings: {
    version: 'V1.0',
    effectiveDate: Date.now() + 86400000, // Default to tomorrow
    validityPeriod: '1',
  },
  documentStep: 'template_selection',
  maxUnlockedPhase: 'REQUIREMENT',
  
  setPhase: (phase) => set((state) => {
    // 阶段等级映射，用于判断是否解锁了新的最高阶段
    const phaseOrder = ['REQUIREMENT', 'BUILDING', 'ADJUSTING', 'VALIDATING', 'RESULT', 'PUBLISH', 'DOCUMENT'];
    const currentMaxIndex = phaseOrder.indexOf(state.maxUnlockedPhase);
    const newIndex = phaseOrder.indexOf(phase);
    
    return {
      currentPhase: phase,
      maxUnlockedPhase: newIndex > currentMaxIndex ? phase : state.maxUnlockedPhase
    };
  }),
  
  addMessage: (msg) => set((state) => ({
    chatHistory: [
      ...state.chatHistory,
      {
        ...msg,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now()
      }
    ]
  })),

  addUploadedFile: (file) => set((state) => ({
    requirement: {
      ...state.requirement,
      files: [...state.requirement.files, file]
    }
  })),

  addReferenceCase: (refCase) => set((state) => ({
    requirement: {
      ...state.requirement,
      referenceCases: [...state.requirement.referenceCases, refCase]
    }
  })),

  updatePreferences: (preferences) => set((state) => ({
    requirement: {
      ...state.requirement,
      preferences
    }
  })),

  setModelSnapshot: (model) => set({ modelSnapshot: model }),

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setValidationStep: (step) => set({ validationStep: step }),

  updateValidationSettings: (settings) => set((state) => ({
    validationSettings: { ...state.validationSettings, ...settings }
  })),

  updatePublishSettings: (settings) => set((state) => ({
    publishSettings: { ...state.publishSettings, ...settings }
  })),

  setDocumentStep: (step) => set({ documentStep: step }),
}));
