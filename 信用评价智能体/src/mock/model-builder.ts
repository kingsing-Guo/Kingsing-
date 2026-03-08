import type { CreditEvalModel } from '../types/model';
import { MOCK_GENERATED_MODEL } from './model-data';
import { applyAutoRecommendationToModel } from '../utils/rule-recommendation';

export const buildMockModelWithAiRecommendation = (): CreditEvalModel => {
  const baseModel: CreditEvalModel = JSON.parse(JSON.stringify(MOCK_GENERATED_MODEL));
  return applyAutoRecommendationToModel(baseModel);
};
