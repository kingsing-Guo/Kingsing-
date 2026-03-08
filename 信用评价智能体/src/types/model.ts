import type { ChatMessage } from './chat';

export type AppPhase =
  | 'REQUIREMENT'
  | 'BUILDING'
  | 'ADJUSTING'
  | 'VALIDATING'
  | 'RESULT'
  | 'PUBLISH'
  | 'DOCUMENT';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  originalText?: string;
  summary?: string;
}

export interface ReferenceCase {
  id: string;
  title: string;
  source: string;
  summary: string;
  url?: string;
  originalText?: string;
}

export interface ModelRequirement {
  files: UploadedFile[];
  referenceCases: ReferenceCase[];
  preferences: string; // 偏好（兼容旧字段，用于发布页展示）
  requirementSummary: string[]; // 需求归纳要点
  preferenceSummary: string[]; // 偏好归纳要点
}

// ============================================
// Phase 2: Credit Evaluation Model Structure
// ============================================

// 分级规则定义 (如 A/B/C/D 分数线)
export interface GradeLevel {
  id: string;
  name: string;      // A, B, C, D
  minScore: number;  // >= 80, >= 60 etc.
  color: string;     // 状态色
}

// 一票否决规则
export interface VetoRule {
  id: string;
  name: string;
  description: string;
}

// 加分规则
export interface BonusRule {
  id: string;
  name: string;
  score: number;
}

export interface IntervalRangeRule {
  id: string;
  min: number;
  max: number;
  scoreRatio: number;
}

export interface ThresholdRuleConfig {
  operator: '>=' | '>' | '<=' | '<' | '==';
  threshold: number;
  passScoreRatio: number;
  failScoreRatio: number;
}

export interface LinearRuleConfig {
  min: number;
  max: number;
  minScoreRatio: number;
  maxScoreRatio: number;
}

export interface RatioRuleConfig {
  targetValue: number;
  floorScoreRatio: number;
  capScoreRatio: number;
}

export interface CumulativeRuleConfig {
  unitCount: number;
  scorePerUnit: number;
  baseScoreRatio: number;
  maxScoreRatio: number;
}

export interface IndicatorRuleConfig {
  intervalRanges?: IntervalRangeRule[];
  thresholdRule?: ThresholdRuleConfig;
  linearRule?: LinearRuleConfig;
  ratioRule?: RatioRuleConfig;
  cumulativeRule?: CumulativeRuleConfig;
}

export type IndicatorRuleType =
  | 'interval'
  | 'threshold'
  | 'linear'
  | 'ratio'
  | 'cumulative'
  | 'boolean'
  | 'formula';

export interface IndicatorNode {
  id: string;
  name: string;      // 指标名称
  level: 1 | 2 | 3;  // 分类层级
  weight: number;    // 该节点在父级下的权重百分比
  direction?: 'positive' | 'negative'; // 指标方向
  score?: number;    // 当前节点占用的绝对分值
  description?: string; // 考量描述
  ruleType?: IndicatorRuleType; // 计分算法（末级指标所需）
  dataSource?: string; // 数据来源
  ruleConfig?: IndicatorRuleConfig; // 评分规则配置
  children?: IndicatorNode[]; 
}

export interface CreditEvalModel {
  modelName: string; // 评价模型名称
  totalScoreMode: 100 | 1000; // 百分制或千分制
  gradeLevels: GradeLevel[]; // 自定义评分等级
  publicCreditWeight: number; // 综合信用评价基准权重（国标要求 >= 10%）
  vetoRules: VetoRule[]; // 一票否决项
  bonusRules: BonusRule[]; // 加分项
  indicators: IndicatorNode[]; // 动态生成的业务指标体系树
}

export type ValidationStep = 'idle' | 'checking' | 'data_selection' | 'computing' | 'result';
export type DocumentStep = 'template_selection' | 'generating' | 'preview';
export type ResultActiveTab = 'ks' | 'dist' | 'list';

export interface ValidationSettings {
  mode: 'database' | 'import';
  industry: string;
  selectedAttributeCombo: 'scale' | 'nature' | null;
  selectedAttributeValues: string[];
  sampleCount: number;
  importedDatasetId: string | null;
  importedFileName: string;
  importedRecordCount: number;
}

export interface PublishSettings {
  version: string;
  effectiveDate: number | null; // Timestamp
  validityPeriod: '1' | '2' | '3'; // Years
}

export interface ResultListFilters {
  grade: 'all' | string;
  vetoOnly: boolean;
  bonusOnly: boolean;
}

export interface ResultViewSettings {
  activeTab: ResultActiveTab;
  listFilters: ResultListFilters;
}

export interface ProjectSnapshot {
  currentPhase: AppPhase;
  chatHistory: ChatMessage[];
  requirement: ModelRequirement;
  modelSnapshot: CreditEvalModel | null;
  validationStep: ValidationStep;
  validationSettings: ValidationSettings;
  resultViewSettings: ResultViewSettings;
  publishSettings: PublishSettings;
  documentStep: DocumentStep;
  maxUnlockedPhase: AppPhase;
}

export interface AgentProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: ProjectSnapshot;
}
