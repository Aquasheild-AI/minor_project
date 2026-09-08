import {
  assignedVillages,
  workerHealthRecords,
  workerWaterQuality,
  workerAlerts,
  workerNotifications,
  workerDashboardStats,
  getWorkerRiskPrediction,
  getWorkerTrendData,
  healthWorker,
} from '@/data/workerData';
import type { Village, HealthRecord, WaterQualityRecord, Alert, Notification, User, TrendPoint } from '@/types';

/**
 * Health Worker API service layer.
 * Replace mock implementations with fetch calls to Flask API later.
 */
const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));

export const workerApi = {
  getDashboardStats: () => delay(workerDashboardStats),
  getVillages: (): Promise<Village[]> => delay(assignedVillages),
  getVillage: (id: string): Promise<Village | undefined> =>
    delay(assignedVillages.find((v) => v.id === id)),

  getHealthRecords: (): Promise<HealthRecord[]> => delay(workerHealthRecords),
  createHealthRecord: (record: Omit<HealthRecord, 'id'>): Promise<HealthRecord> =>
    delay({ ...record, id: `whr${Date.now()}` }, 600),

  getWaterQuality: (): Promise<WaterQualityRecord[]> => delay(workerWaterQuality),
  createWaterQuality: (record: Omit<WaterQualityRecord, 'id'>): Promise<WaterQualityRecord> =>
    delay({ ...record, id: `wwq${Date.now()}` }, 600),

  predictRisk: (villageId: string, date: string) =>
    delay(getWorkerRiskPrediction(villageId, date), 800),

  getAlerts: (): Promise<Alert[]> => delay(workerAlerts),
  updateAlertStatus: (id: string, status: Alert['status']): Promise<Alert> =>
    delay({ ...workerAlerts.find((a) => a.id === id)!, status }),

  getNotifications: (): Promise<Notification[]> => delay(workerNotifications),

  getTrends: (villageId: string, days: number): Promise<TrendPoint[]> =>
    delay(getWorkerTrendData(villageId, days)),

  getProfile: (): Promise<User> => delay(healthWorker),
};
