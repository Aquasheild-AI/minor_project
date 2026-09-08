export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DiseaseCategory =
  | 'Cholera'
  | 'Typhoid'
  | 'Dysentery'
  | 'Hepatitis'
  | 'Diarrheal Disease'
  | 'Other';

export type AgeGroup = '0-5' | '6-12' | '13-18' | '19-40' | '41-60' | '60+';

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
  villageName?: string;
  time: string;
  read: boolean;
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
