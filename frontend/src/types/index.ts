export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DiseaseCategory =
  | 'Cholera'
  | 'Typhoid'
  | 'Dysentery'
  | 'Hepatitis'
  | 'Diarrheal Disease'
  | 'Other';

export type AgeGroup =
  | '0-5'
  | '6-12'
  | '13-18'
  | '19-40'
  | '41-60'
  | '60+'
  | 'Under 5'
  | '5-14'
  | '15-30'
  | '31-50'
  | '51-65'
  | '65+';

export type Symptom =
  | 'Fever'
  | 'Diarrhea'
  | 'Vomiting'
  | 'Abdominal Pain'
  | 'Dehydration'
  | 'Headache'
  | 'Other';

export type AlertStatus = 'active' | 'under_review' | 'resolved';

export type UserRole = 'Admin' | 'Health Worker' | 'Authority';

export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  population: number;
  lat: number;
  lng: number;
  riskLevel: RiskLevel;
  riskScore: number;
  suspectedCases: number;
  waterStatus: 'safe' | 'moderate' | 'unsafe';
  lastUpdated: string;
}

export interface HealthRecord {
  id: string;
  villageId: string;
  villageName: string;
  reportingDate: string;
  diseaseCategory: DiseaseCategory;
  suspectedCases: number;
  symptoms: Symptom[];
  ageGroup: AgeGroup;
  riskLevel: RiskLevel;
  reportedBy: string;
}

export interface WaterQualityRecord {
  id: string;
  villageId: string;
  villageName: string;
  date: string;
  ph: number;
  turbidity: number;
  temperature: number;
  tds: number;
  status: 'safe' | 'moderate' | 'unsafe';
}

export interface RiskPrediction {
  villageId: string;
  villageName: string;
  date: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  factors: RiskFactor[];
  recommendation: string;
}

export interface RiskFactor {
  label: string;
  impact: 'low' | 'medium' | 'high';
  detail: string;
}

export interface Alert {
  id: string;
  severity: RiskLevel;
  villageId: string;
  villageName: string;
  riskScore: number;
  message: string;
  factors: string[];
  detectedAt: string;
  status: AlertStatus;
  read: boolean;
}

export interface Notification {
  id: string;
  type: 'alert' | 'water' | 'health' | 'system';
  severity: RiskLevel | 'info';
  message: string;
  detail?: string;
  villageName?: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'disabled';
  lastLogin: string;
  avatar?: string;
}

export interface TrendPoint {
  date: string;
  cases: number;
  riskScore: number;
  ph: number;
  turbidity: number;
  tds: number;
  temperature: number;
}

// ─── ML risk predictions (backend /api/risk/*) ─────────────────────
// Field names mirror the Django serializers (snake_case).

export type ApiRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WaterRiskFactor {
  feature: string;
  label: string;
  value: number | null;
  unit: string;
  /** Change in risk score (points) versus a typical reading; positive raises risk. */
  impact: number;
  description: string;
}

export interface WaterEvaluationInput {
  ph: number;
  temperature?: number;
  tds?: number;
  dissolved_oxygen?: number;
  dissolvedOxygen?: number;
  nitrate?: number;
  source_type?: string;
  waterSource?: string;
  fecal_coliform?: number;
  fecalColiform?: number;
  e_coli_detected?: boolean;
  source_name?: string;
  district?: string;
}

export interface WaterRiskEvaluation {
  risk_score: number;
  risk_level: ApiRiskLevel;
  probability_fc_over_100: number;
  probabilities: Record<ApiRiskLevel, number>;
  water_body_used: string;
  source_type_approximated: boolean;
  factors: WaterRiskFactor[];
  plain_language_explanation: string;
  recommended_actions: string[];
  lab_confirmed_contamination: boolean;
  model_name: string;
  trained_at?: string;
}

export interface WaterRiskPrediction {
  id: number;
  village: number;
  village_name: string;
  village_district: string;
  prediction_date: string;
  risk_score: number;
  risk_level: ApiRiskLevel;
  contributing_factors: {
    water_test_id: number;
    water_source: string;
    water_source_type: string;
    sample_date: string;
    probabilities: Record<ApiRiskLevel, number>;
    probability_fc_over_100: number;
    lab_confirmed_e_coli: boolean;
    source_type_approximated: boolean;
    factors: WaterRiskFactor[];
    sources_scored: { water_source: string; risk_score: number; risk_level: ApiRiskLevel }[];
  };
  plain_language_explanation: string;
  recommended_actions: string[];
  model_name: string;
  is_latest: boolean;
  created_at: string;
}

export interface DiseaseRiskPrediction {
  id: number;
  district: string;
  prediction_date: string;
  risk_score: number;
  risk_level: ApiRiskLevel;
  outbreak_probability: number;
  predicted_disease: string;
  contributing_factors: {
    base_rate: number;
    climate_week_ending: string;
    matched_location: { district: string; state: string; lat: number; lon: number; distance_km: number };
    features: Record<string, number | null>;
    /** Change in risk percentile if recent weather had been normal for the season. */
    factors: Partial<Record<'recent_rainfall' | 'recent_temperature', number>>;
  };
  plain_language_explanation: string;
  recommended_actions: string[];
  model_name: string;
  is_latest: boolean;
  created_at: string;
}

export interface ModelInfoEntry {
  status: 'OK' | 'MODEL_UNAVAILABLE';
  model_name?: string;
  trained_at?: string;
  metrics?: Record<string, Record<string, number> | unknown>;
}

export interface ModelInfo {
  water: ModelInfoEntry;
  outbreak: ModelInfoEntry;
}

export interface ApiVillage {
  id: number;
  name: string;
  code: string;
  district: string;
  state: string;
  latitude: string;
  longitude: string;
  risk_level: ApiRiskLevel;
  risk_score: number;
}
