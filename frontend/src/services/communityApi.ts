import { api } from './api';
import { authGet, authPost } from './authFetch';
import type { Village, Alert, Notification, TrendPoint, Symptom } from '@/types';

export interface CommunityReport {
  id: string;
  date: string;
  villageName: string;
  symptoms: Symptom[];
  peopleAffected: string;
  ageGroup?: string;
  notes?: string;
  status: 'submitted' | 'under_review' | 'reviewed';
}

export interface CommunityAlert extends Alert {
  type: string;
  guidance: string[];
}

export interface CommunityWaterQualitySummary {
  ph: number;
  turbidity: number;
  tds: number;
  temperature: number;
  status: 'safe' | 'moderate' | 'unsafe' | 'unavailable';
  date: string;
  lastUpdated: string;
  villageName?: string;
}

export function mapAgeGroupToBackend(raw?: string): string {
  if (!raw) return 'ALL_AGES';
  const clean = raw.trim().toLowerCase();
  if (['under 5', 'under_5', '0-5', '5-14', 'child', 'children'].includes(clean)) return 'CHILD';
  if (['15-30', 'teen', 'teenager', 'teenagers', '12-18'].includes(clean)) return 'TEEN';
  if (['31-50', 'adult', 'adults', '18-60'].includes(clean)) return 'ADULT';
  if (['51-65', '65+', '60+', 'elderly', 'senior', 'seniors', 'senior citizen', 'senior citizens'].includes(clean)) return 'ELDERLY';
  if (['all ages', 'all_ages', 'all', 'multiple'].includes(clean)) return 'ALL_AGES';
  if (['CHILD', 'TEEN', 'ADULT', 'ELDERLY', 'ALL_AGES'].includes(raw.toUpperCase())) return raw.toUpperCase();
  return 'ALL_AGES';
}

export function mapPeopleCountToBackend(raw?: string): number {
  if (!raw) return 1;
  if (raw === '2-5') return 3;
  if (raw === '6-10') return 8;
  if (raw === '10+') return 10;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function normalizeCommunityReport(r: any): CommunityReport {
  const statusMap: Record<string, 'submitted' | 'under_review' | 'reviewed'> = {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    VERIFIED: 'reviewed',
    ACTION_TAKEN: 'reviewed',
    RESOLVED: 'reviewed',
    DISMISSED: 'reviewed',
    submitted: 'submitted',
    under_review: 'under_review',
    reviewed: 'reviewed',
  };

  const ageLabels: Record<string, string> = {
    CHILD: 'Children (< 12 yrs)',
    TEEN: 'Teenagers (12-18 yrs)',
    ADULT: 'Adults (18-60 yrs)',
    ELDERLY: 'Senior Citizens (60+ yrs)',
    ALL_AGES: 'All Age Groups',
  };

  return {
    id: String(r.id),
    date: (r.created_at || new Date().toISOString()).split('T')[0],
    villageName: r.village_name || `Village #${r.village || ''}`,
    symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
    peopleAffected: String(r.people_affected ?? '1'),
    ageGroup: r.age_group_display || ageLabels[r.age_group] || r.age_group || 'All Ages',
    notes: r.description || r.notes || '',
    status: statusMap[r.status] || 'submitted',
  };
}

export const communityApi = {
  getVillages: (): Promise<Village[]> => api.getVillages(),
  getVillage: (id: string): Promise<Village | undefined> => api.getVillage(id),

  getUserVillage: async (): Promise<Village> => {
    try {
      const me = await authGet<any>('/api/auth/me/');
      if (me.village) {
        const v = await api.getVillage(String(me.village));
        if (v) return v;
      }
    } catch (e) {
      console.warn('Could not load user village from auth/me', e);
    }
    const all = await api.getVillages();
    return all[0] || {
      id: '1',
      name: 'Local Village',
      district: 'Patna',
      state: 'Bihar',
      population: 4000,
      lat: 25.6,
      lng: 85.1,
      riskLevel: 'low',
      riskScore: 25,
      suspectedCases: 0,
      waterStatus: 'safe',
      lastUpdated: new Date().toISOString(),
    };
  },

  getAlerts: async (): Promise<CommunityAlert[]> => {
    const alerts = await api.getAlerts();
    return alerts.map((a) => ({
      ...a,
      type: a.severity,
      guidance: [
        'Follow official local health advisories.',
        'Boil drinking water for at least 10 minutes.',
        'Report suspected symptoms immediately to local health workers.',
      ],
    }));
  },

  getAlert: async (id: string): Promise<CommunityAlert | undefined> => {
    const list = await communityApi.getAlerts();
    return list.find((a) => a.id === id);
  },

  getNotifications: (): Promise<Notification[]> => api.getNotifications(),

  getWaterQuality: async (): Promise<CommunityWaterQualitySummary | null> => {
    try {
      const me = await authGet<any>('/api/auth/me/');
      const villageId = me.village ? String(me.village) : undefined;
      const list = await api.getWaterQuality(villageId ? { village_id: villageId } : undefined);
      if (list && list.length > 0) {
        const item = list[0];
        return {
          ...item,
          lastUpdated: item.date,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  getRiskFactors: async () => [
    { label: 'Water Source Quality', impact: 'high' as const, detail: 'Regular testing conducted' },
    { label: 'Community Reporting Rate', impact: 'medium' as const, detail: 'Active surveillance in place' },
    { label: 'Weather & Precipitation', impact: 'low' as const, detail: 'Seasonal baseline conditions' },
  ],

  getReports: async (): Promise<CommunityReport[]> => {
    try {
      const list = await authGet<any[]>('/api/community-reports/');
      return list.map(normalizeCommunityReport);
    } catch {
      return [];
    }
  },

  createReport: async (report: Omit<CommunityReport, 'id' | 'status'> & { villageId?: string }): Promise<CommunityReport> => {
    const me = await authGet<any>('/api/auth/me/').catch(() => ({}));
    const payload = {
      village: Number(report.villageId || me.village || 1),
      reporter_name: [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'Citizen',
      reporter_phone: me.phone || '',
      symptoms: report.symptoms || [],
      people_affected: mapPeopleCountToBackend(report.peopleAffected),
      age_group: mapAgeGroupToBackend(report.ageGroup),
      description: report.notes || '',
      water_issue_observed: 'OTHER',
    };
    const created = await authPost<any>('/api/community-reports/', payload);
    return normalizeCommunityReport(created);
  },

  getTrends: async (days: number): Promise<TrendPoint[]> => {
    try {
      const v = await communityApi.getUserVillage();
      return api.getTrends(v.id, days);
    } catch {
      return api.getTrends('1', days);
    }
  },

  getUser: async () => {
    try {
      const me = await authGet<any>('/api/auth/me/');
      return {
        id: String(me.id),
        name: [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username,
        email: me.email || `${me.username}@system.local`,
        villageId: String(me.village || '1'),
        villageName: me.village_name || 'Assigned Village',
        district: 'Patna',
        accountType: 'Community User',
        language: me.preferred_language === 'hi' ? 'Hindi' : 'English',
      };
    } catch {
      return {
        id: '1',
        name: 'Community Citizen',
        email: 'citizen@system.local',
        villageId: '1',
        villageName: 'Rampur',
        district: 'Patna',
        accountType: 'Community User',
        language: 'English',
      };
    }
  },
};
