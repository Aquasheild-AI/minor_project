import { api } from './api';
import { authGet } from './authFetch';
import type { Village, HealthRecord, WaterQualityRecord, Alert, Notification, User, TrendPoint } from '@/types';

/**
 * Health Worker API service layer.
 * Backed by live Django REST endpoints with automatic RBAC scoping.
 */
export const workerApi = {
  getDashboardStats: () => api.getDashboardStats(),
  getVillages: (): Promise<Village[]> => api.getVillages(),
  getVillage: (id: string): Promise<Village | undefined> => api.getVillage(id),

  getHealthRecords: (): Promise<HealthRecord[]> => api.getHealthRecords(),
  createHealthRecord: (record: any): Promise<HealthRecord> => api.createHealthRecord(record),

  getWaterQuality: (): Promise<WaterQualityRecord[]> => api.getWaterQuality(),
  createWaterQuality: (record: any): Promise<WaterQualityRecord> => api.createWaterQuality(record),

  predictRisk: (villageId: string, date: string) => api.predictRisk(villageId, date),

  getAlerts: (): Promise<Alert[]> => api.getAlerts(),
  updateAlertStatus: (id: string, status: Alert['status']): Promise<Alert> =>
    api.updateAlertStatus(id, status),

  getNotifications: (): Promise<Notification[]> => api.getNotifications(),

  getTrends: (villageId: string, days: number): Promise<TrendPoint[]> =>
    api.getTrends(villageId, days),

  getProfile: async (): Promise<User> => {
    try {
      const u = await authGet<any>('/api/auth/me/');
      return {
        id: String(u.id),
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
        email: u.email || `${u.username}@system.local`,
        role: 'Health Worker',
        status: u.is_active ? 'active' : 'disabled',
        lastLogin: new Date().toISOString(),
      };
    } catch {
      return {
        id: '1',
        name: 'Health Worker',
        email: 'worker@system.local',
        role: 'Health Worker',
        status: 'active',
        lastLogin: new Date().toISOString(),
      };
    }
  },
};
