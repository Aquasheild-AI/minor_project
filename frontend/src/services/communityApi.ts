import {
  communityVillages,
  communityAlerts,
  communityNotifications,
  communityReports,
  communityWaterQuality,
  communityRiskFactors,
  communityUser,
  getCommunityTrendData,
  type CommunityReport,
} from '@/data/communityData';
import type { Village, Alert, Notification, TrendPoint } from '@/types';

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));

export const communityApi = {
  getVillages: (): Promise<Village[]> => delay(communityVillages),
  getVillage: (id: string): Promise<Village | undefined> =>
    delay(communityVillages.find((v) => v.id === id)),
  getUserVillage: (): Promise<Village> =>
    delay(communityVillages.find((v) => v.id === communityUser.villageId)!),

  getAlerts: (): Promise<typeof communityAlerts> => delay(communityAlerts),
  getAlert: (id: string) =>
    delay(communityAlerts.find((a) => a.id === id)),

  getNotifications: (): Promise<Notification[]> => delay(communityNotifications),

  getWaterQuality: () => delay(communityWaterQuality),
  getRiskFactors: () => delay(communityRiskFactors),

  getReports: (): Promise<CommunityReport[]> => delay(communityReports),
  createReport: (report: Omit<CommunityReport, 'id' | 'status'>): Promise<CommunityReport> =>
    delay({ ...report, id: `cr${Date.now()}`, status: 'submitted' as const }, 600),

  getTrends: (days: number): Promise<TrendPoint[]> => delay(getCommunityTrendData(days)),

  getUser: () => delay(communityUser),
};
