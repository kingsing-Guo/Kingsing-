import type { CreditEvalModel } from '../types/model';
import { MOCK_GENERATED_MODEL } from './model-data';
import { applyAutoRecommendationToModel } from '../utils/rule-recommendation';

interface BuildMockOptions {
  modelName?: string;
}

export const buildMockModelWithAiRecommendation = (options?: BuildMockOptions): CreditEvalModel => {
  const baseModel: CreditEvalModel = JSON.parse(JSON.stringify(MOCK_GENERATED_MODEL));
  const nextModelName = options?.modelName?.trim();
  const isGenericProjectName = !!nextModelName && /^评价模型项目\d+$/.test(nextModelName);
  if (nextModelName && !isGenericProjectName) {
    baseModel.modelName = nextModelName;
  }
  return applyAutoRecommendationToModel(baseModel);
};
