import { authFetch, authGet, authPost } from './authFetch';
import type {
  ApiRiskLevel,
  ApiVillage,
  DiseaseRiskPrediction,
  ModelInfo,
  RiskLevel,
  WaterEvaluationInput,
  WaterRiskEvaluation,
  WaterRiskPrediction,
} from '@/types';

/** Backend risk levels are upper case; UI components use lower case. */
export const toRiskLevel = (level: ApiRiskLevel): RiskLevel => level.toLowerCase() as RiskLevel;

export interface RefreshSummary {
  water: { updated: number; skipped: number; errors: string[] };
  disease: { updated: number; errors: string[] };
}

const query = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const riskApi = {
  getVillages: () => authGet<ApiVillage[]>('/api/villages/'),

  // Module A: village water contamination risk
  getWaterRisks: (params: { village_id?: number; district?: string } = {}) =>
    authGet<WaterRiskPrediction[]>(`/api/risk/water/${query(params)}`),
  getWaterRiskHistory: (villageId: number) =>
    authGet<WaterRiskPrediction[]>(`/api/risk/water/${villageId}/history/`),
  refreshVillageWaterRisk: async (villageId: number): Promise<WaterRiskPrediction> => {
    const res = await authFetch(`/api/risk/water/${villageId}/refresh/`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  // Module B: district outbreak risk
  getDiseaseRisks: (district?: string) =>
    authGet<DiseaseRiskPrediction[]>(`/api/risk/disease/${query({ district })}`),

  /** Authority only. Outbreak risk needs the server to reach NASA POWER. */
  refreshAll: () => authPost<RefreshSummary>('/api/risk/refresh/', { water: true, disease: true }),

  getModelInfo: () => authGet<ModelInfo>('/api/risk/models/'),

  // On-demand evaluation for individual samples / dataset records
  evaluateWaterReading: (payload: WaterEvaluationInput) =>
    authPost<WaterRiskEvaluation>('/api/risk/evaluate/', payload),
};
