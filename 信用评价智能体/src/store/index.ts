import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentProject,
  AppPhase,
  CreditEvalModel,
  DocumentStep,
  ModelRequirement,
  ProjectSnapshot,
  PublishSettings,
  ReferenceCase,
  ResultActiveTab,
  ResultListFilters,
  ResultViewSettings,
  UploadedFile,
  ValidationSettings,
  ValidationStep,
} from '../types/model';
import type { ChatMessage } from '../types/chat';

interface AgentState {
  projects: AgentProject[];
  activeProjectId: string;
  currentPhase: AppPhase;
  chatHistory: ChatMessage[];
  requirement: ModelRequirement;
  modelSnapshot: CreditEvalModel | null;
  isSidebarCollapsed: boolean;
  validationStep: ValidationStep;
  validationSettings: ValidationSettings;
  resultViewSettings: ResultViewSettings;
  publishSettings: PublishSettings;
  documentStep: DocumentStep;
  chatPublishSignal: number;
  consumedChatPublishSignal: number;
  maxUnlockedPhase: AppPhase;
  setPhase: (phase: AppPhase) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addUploadedFile: (file: UploadedFile) => void;
  removeUploadedFile: (fileId: string) => void;
  addReferenceCase: (refCase: ReferenceCase) => void;
  removeReferenceCase: (caseId: string) => void;
  updatePreferences: (preferences: string) => void;
  updateRequirement: (patch: Partial<ModelRequirement>) => void;
  setModelSnapshot: (model: CreditEvalModel | null) => void;
  toggleSidebar: () => void;
  setValidationStep: (step: ValidationStep) => void;
  updateValidationSettings: (settings: Partial<ValidationSettings>) => void;
  setResultActiveTab: (tab: ResultActiveTab) => void;
  updateResultListFilters: (filters: Partial<ResultListFilters>) => void;
  resetResultListFilters: () => void;
  updatePublishSettings: (settings: Partial<PublishSettings>) => void;
  setDocumentStep: (step: DocumentStep) => void;
  requestPublishConfirm: () => void;
  consumePublishConfirm: (signal: number) => void;
  createProject: (name?: string) => void;
  switchProject: (projectId: string) => void;
  renameActiveProject: (name: string) => void;
  deleteProject: (projectId: string) => void;
}

const deepCopy = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const phaseOrder: AppPhase[] = [
  'REQUIREMENT',
  'BUILDING',
  'ADJUSTING',
  'VALIDATING',
  'RESULT',
  'PUBLISH',
  'DOCUMENT',
];

const createWelcomeMessage = (): ChatMessage[] => [
  {
    id: 'welcome_1',
    role: 'ai',
    content:
      '您好！我是公共信用评价模型构建智能体。为了给您提供最合适的模型建议，请先上传相关的政策文件（如管理办法），或者直接告诉我您的评价重点和管理需求。',
    timestamp: Date.now(),
  },
];

const createDefaultRequirement = (): ModelRequirement => ({
  files: [],
  referenceCases: [],
  preferences: '',
  requirementSummary: [],
  preferenceSummary: [],
});

const createDefaultValidationSettings = (): ValidationSettings => ({
  mode: 'database',
  industry: 'all',
  selectedAttributeCombo: null,
  selectedAttributeValues: [],
  sampleCount: 100,
  importedDatasetId: null,
  importedFileName: '',
  importedRecordCount: 0,
});

const createDefaultResultViewSettings = (): ResultViewSettings => ({
  activeTab: 'ks',
  listFilters: {
    grade: 'all',
    vetoOnly: false,
    bonusOnly: false,
  },
});

const createDefaultPublishSettings = (): PublishSettings => ({
  version: 'V1.0',
  effectiveDate: Date.now() + 86400000,
  validityPeriod: '1',
});

const createDefaultProjectSnapshot = (): ProjectSnapshot => ({
  currentPhase: 'REQUIREMENT',
  chatHistory: createWelcomeMessage(),
  requirement: createDefaultRequirement(),
  modelSnapshot: null,
  validationStep: 'idle',
  validationSettings: createDefaultValidationSettings(),
  resultViewSettings: createDefaultResultViewSettings(),
  publishSettings: createDefaultPublishSettings(),
  documentStep: 'template_selection',
  maxUnlockedPhase: 'REQUIREMENT',
});

const buildProjectName = (index: number) => `评价模型项目${index}`;

const createProjectRecord = (name?: string): AgentProject => {
  const now = Date.now();
  return {
    id: `project_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: name?.trim() || buildProjectName(1),
    createdAt: now,
    updatedAt: now,
    snapshot: createDefaultProjectSnapshot(),
  };
};

const snapshotFromState = (state: AgentState): ProjectSnapshot => ({
  currentPhase: state.currentPhase,
  chatHistory: deepCopy(state.chatHistory),
  requirement: deepCopy(state.requirement),
  modelSnapshot: deepCopy(state.modelSnapshot),
  validationStep: state.validationStep,
  validationSettings: deepCopy(state.validationSettings),
  resultViewSettings: deepCopy(state.resultViewSettings),
  publishSettings: deepCopy(state.publishSettings),
  documentStep: state.documentStep,
  maxUnlockedPhase: state.maxUnlockedPhase,
});

const applySnapshot = (snapshot: ProjectSnapshot) => ({
  currentPhase: snapshot.currentPhase,
  chatHistory: deepCopy(snapshot.chatHistory),
  requirement: deepCopy(snapshot.requirement),
  modelSnapshot: deepCopy(snapshot.modelSnapshot),
  validationStep: snapshot.validationStep,
  validationSettings: deepCopy(snapshot.validationSettings),
  resultViewSettings: deepCopy(snapshot.resultViewSettings),
  publishSettings: deepCopy(snapshot.publishSettings),
  documentStep: snapshot.documentStep,
  maxUnlockedPhase: snapshot.maxUnlockedPhase,
});

const syncActiveProjectPatch = (state: AgentState, patch: Partial<AgentState>): Partial<AgentState> => {
  if (!state.activeProjectId || state.projects.length === 0) {
    return patch;
  }
  const nextState = { ...state, ...patch } as AgentState;
  const now = Date.now();
  const nextProjects = nextState.projects.map((project) =>
    project.id === nextState.activeProjectId
      ? {
          ...project,
          updatedAt: now,
          snapshot: snapshotFromState(nextState),
        }
      : project,
  );
  return { ...patch, projects: nextProjects };
};

const initialProject = createProjectRecord(buildProjectName(1));
const initialSnapshot = initialProject.snapshot;

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
  projects: [initialProject],
  activeProjectId: initialProject.id,
  currentPhase: initialSnapshot.currentPhase,
  chatHistory: initialSnapshot.chatHistory,
  requirement: initialSnapshot.requirement,
  modelSnapshot: initialSnapshot.modelSnapshot,
  isSidebarCollapsed: false,
  validationStep: initialSnapshot.validationStep,
  validationSettings: initialSnapshot.validationSettings,
  resultViewSettings: initialSnapshot.resultViewSettings,
  publishSettings: initialSnapshot.publishSettings,
  documentStep: initialSnapshot.documentStep,
  chatPublishSignal: 0,
  consumedChatPublishSignal: 0,
  maxUnlockedPhase: initialSnapshot.maxUnlockedPhase,

  setPhase: (phase) =>
    set((state) => {
      const currentMaxIndex = phaseOrder.indexOf(state.maxUnlockedPhase);
      const newIndex = phaseOrder.indexOf(phase);
      const patch: Partial<AgentState> = {
        currentPhase: phase,
        maxUnlockedPhase: newIndex > currentMaxIndex ? phase : state.maxUnlockedPhase,
      };
      return syncActiveProjectPatch(state, patch);
    }),

  addMessage: (msg) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        chatHistory: [
          ...state.chatHistory,
          {
            ...msg,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
          },
        ],
      };
      return syncActiveProjectPatch(state, patch);
    }),

  addUploadedFile: (file) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        requirement: {
          ...state.requirement,
          files: [...state.requirement.files, file],
        },
      };
      return syncActiveProjectPatch(state, patch);
    }),

  removeUploadedFile: (fileId) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        requirement: {
          ...state.requirement,
          files: state.requirement.files.filter((file) => file.id !== fileId),
        },
      };
      return syncActiveProjectPatch(state, patch);
    }),

  addReferenceCase: (refCase) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        requirement: {
          ...state.requirement,
          referenceCases: [...state.requirement.referenceCases, refCase],
        },
      };
      return syncActiveProjectPatch(state, patch);
    }),

  removeReferenceCase: (caseId) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        requirement: {
          ...state.requirement,
          referenceCases: state.requirement.referenceCases.filter((item) => item.id !== caseId),
        },
      };
      return syncActiveProjectPatch(state, patch);
    }),

  updatePreferences: (preferences) =>
    set((state) => {
      const patch: Partial<AgentState> = {
        requirement: {
          ...state.requirement,
          preferences,
        },
      };
      return syncActiveProjectPatch(state, patch);
    }),

  updateRequirement: (patch) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        requirement: {
          ...state.requirement,
          ...patch,
        },
      }),
    ),

  setModelSnapshot: (model) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        modelSnapshot: model,
      }),
    ),

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setValidationStep: (step) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        validationStep: step,
      }),
    ),

  updateValidationSettings: (settings) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        validationSettings: { ...state.validationSettings, ...settings },
      }),
    ),

  setResultActiveTab: (tab) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        resultViewSettings: {
          ...state.resultViewSettings,
          activeTab: tab,
        },
      }),
    ),

  updateResultListFilters: (filters) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        resultViewSettings: {
          ...state.resultViewSettings,
          listFilters: {
            ...state.resultViewSettings.listFilters,
            ...filters,
          },
        },
      }),
    ),

  resetResultListFilters: () =>
    set((state) =>
      syncActiveProjectPatch(state, {
        resultViewSettings: {
          ...state.resultViewSettings,
          listFilters: {
            grade: 'all',
            vetoOnly: false,
            bonusOnly: false,
          },
        },
      }),
    ),

  updatePublishSettings: (settings) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        publishSettings: { ...state.publishSettings, ...settings },
      }),
    ),

  setDocumentStep: (step) =>
    set((state) =>
      syncActiveProjectPatch(state, {
        documentStep: step,
      }),
    ),

  requestPublishConfirm: () =>
    set((state) =>
      syncActiveProjectPatch(state, {
        chatPublishSignal: state.chatPublishSignal + 1,
      }),
    ),

  consumePublishConfirm: (signal) =>
    set((state) => ({
      consumedChatPublishSignal: Math.max(state.consumedChatPublishSignal, signal),
    })),

  createProject: (name) =>
    set((state) => {
      const now = Date.now();
      const currentSnapshot = snapshotFromState(state);
      const savedCurrentProjects = state.projects.map((project) =>
        project.id === state.activeProjectId
          ? {
              ...project,
              updatedAt: now,
              snapshot: currentSnapshot,
            }
          : project,
      );
      const nextName = name?.trim() || buildProjectName(savedCurrentProjects.length + 1);
      const newProject = createProjectRecord(nextName);
      return {
        projects: [newProject, ...savedCurrentProjects],
        activeProjectId: newProject.id,
        ...applySnapshot(newProject.snapshot),
        chatPublishSignal: 0,
        consumedChatPublishSignal: 0,
      };
    }),

  switchProject: (projectId) =>
    set((state) => {
      const targetProject = state.projects.find((project) => project.id === projectId);
      if (!targetProject || targetProject.id === state.activeProjectId) {
        return {};
      }
      const now = Date.now();
      const currentSnapshot = snapshotFromState(state);
      const nextProjects = state.projects.map((project) => {
        if (project.id === state.activeProjectId) {
          return {
            ...project,
            updatedAt: now,
            snapshot: currentSnapshot,
          };
        }
        if (project.id === targetProject.id) {
          return {
            ...project,
            updatedAt: now,
          };
        }
        return project;
      });
      const nextTarget = nextProjects.find((project) => project.id === targetProject.id);
      if (!nextTarget) {
        return {};
      }
      return {
        projects: nextProjects,
        activeProjectId: nextTarget.id,
        ...applySnapshot(nextTarget.snapshot),
        chatPublishSignal: 0,
        consumedChatPublishSignal: 0,
      };
    }),

  renameActiveProject: (name) =>
    set((state) => {
      const nextName = name.trim();
      if (!nextName) {
        return {};
      }
      const now = Date.now();
      return {
        projects: state.projects.map((project) =>
          project.id === state.activeProjectId
            ? {
                ...project,
                name: nextName,
                updatedAt: now,
              }
            : project,
        ),
      };
    }),

  deleteProject: (projectId) =>
    set((state) => {
      const targetProject = state.projects.find((project) => project.id === projectId);
      if (!targetProject) {
        return {};
      }

      const now = Date.now();
      const currentSnapshot = snapshotFromState(state);
      const syncedProjects = state.projects.map((project) =>
        project.id === state.activeProjectId
          ? {
              ...project,
              updatedAt: now,
              snapshot: currentSnapshot,
            }
          : project,
      );
      const remainingProjects = syncedProjects.filter((project) => project.id !== projectId);

      if (remainingProjects.length === 0) {
        const fallbackProject = createProjectRecord(buildProjectName(1));
        return {
          projects: [fallbackProject],
          activeProjectId: fallbackProject.id,
          ...applySnapshot(fallbackProject.snapshot),
          chatPublishSignal: 0,
          consumedChatPublishSignal: 0,
        };
      }

      if (projectId !== state.activeProjectId) {
        return {
          projects: remainingProjects,
        };
      }

      const nextActiveProject =
        [...remainingProjects].sort((a, b) => b.updatedAt - a.updatedAt)[0] || remainingProjects[0];

      return {
        projects: remainingProjects,
        activeProjectId: nextActiveProject.id,
        ...applySnapshot(nextActiveProject.snapshot),
        chatPublishSignal: 0,
        consumedChatPublishSignal: 0,
      };
    }),
    }),
    {
      name: 'credit-eval-agent-workspace-v1',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        currentPhase: state.currentPhase,
        chatHistory: state.chatHistory,
        requirement: state.requirement,
        modelSnapshot: state.modelSnapshot,
        isSidebarCollapsed: state.isSidebarCollapsed,
        validationStep: state.validationStep,
        validationSettings: state.validationSettings,
        resultViewSettings: state.resultViewSettings,
        publishSettings: state.publishSettings,
        documentStep: state.documentStep,
        maxUnlockedPhase: state.maxUnlockedPhase,
      }),
    },
  ),
);
