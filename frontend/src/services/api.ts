import { authGet } from './authFetch';
import {
  villages,
  healthRecords,
  waterQualityRecords,
  alerts,
  users,
  notifications,
  dashboardStats,
  getRiskPrediction,
  getTrendData,
} from '@/data/mockData';
import type {
  Village,
  HealthRecord,
  WaterQualityRecord,
  Alert,
  User,
  Notification,
  RiskPrediction,
  TrendPoint,
} from '@/types';

/**
 * API service abstraction layer.
 *
 * Each method simulates a network call with a small delay.
 * To connect a real Flask backend later, replace the mock
 * implementations with `fetch` calls to the corresponding
 * endpoints — the function signatures stay the same so UI
 * components need no changes.
 */

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));

export const api = {
  // GET /api/dashboard
  getDashboardStats: () => delay(dashboardStats),

  // GET /api/villages
  getVillages: (): Promise<Village[]> => delay(villages),
  getVillage: (id: string): Promise<Village | undefined> =>
    delay(villages.find((v) => v.id === id)),

  // GET /api/health-records
  getHealthRecords: (): Promise<HealthRecord[]> => delay(healthRecords),
  // POST /api/health-records
  createHealthRecord: (record: Omit<HealthRecord, 'id'>): Promise<HealthRecord> =>
    delay({ ...record, id: `hr${Date.now()}` }),

  // GET /api/water-quality
  getWaterQuality: (): Promise<WaterQualityRecord[]> => delay(waterQualityRecords),

  getDatasetWaterQuality: async (params: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, String(value));
    });
    return authGet(`/api/water-quality-dataset/?${searchParams.toString()}`);
  },
  // POST /api/water-quality
  createWaterQuality: (record: Omit<WaterQualityRecord, 'id'>): Promise<WaterQualityRecord> =>
    delay({ ...record, id: `wq${Date.now()}` }),

  // POST /api/predict-risk
  predictRisk: (villageId: string, date: string): Promise<RiskPrediction> =>
    delay(getRiskPrediction(villageId, date), 800),

  // GET /api/risk-map
  getRiskMap: (): Promise<Village[]> => delay(villages),

  // GET /api/alerts
  getAlerts: (): Promise<Alert[]> => delay(alerts),
  updateAlertStatus: (id: string, status: Alert['status']): Promise<Alert> =>
    delay({ ...alerts.find((a) => a.id === id)!, status }),

  // GET /api/notifications
  getNotifications: (): Promise<Notification[]> => delay(notifications),

  // GET /api/trends
  getTrends: (villageId: string, days: number): Promise<TrendPoint[]> =>
    delay(getTrendData(villageId, days)),

  // GET /api/users
  getUsers: (): Promise<User[]> => delay(users),
};
