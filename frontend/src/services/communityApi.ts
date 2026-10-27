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

  return {
    id: String(r.id),
    date: (r.created_at || new Date().toISOString()).split('T')[0],
    villageName: r.village_name || `Village #${r.village || ''}`,
    symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
    peopleAffected: String(r.people_affected ?? '1'),
    ageGroup: r.age_group || 'All Ages',
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

  getAlerts: async () => {
    const alerts = await api.getAlerts({ is_active: 'true' });
    return alerts.map((a) => ({
      ...a,
      type: a.severity,
      guidance: [
        'Follow official local health advisories.',
        'Boil drinking water for at least 10 minutes.',
        'Report suspected symptoms immediately.',
      ],
    }));
  },

  getAlert: async (id: string) => {
    const list = await communityApi.getAlerts();
    return list.find((a) => a.id === id);
  },

  getNotifications: (): Promise<Notification[]> => api.getNotifications(),

  getWaterQuality: async () => {
    try {
      const me = await authGet<any>('/api/auth/me/');
      const villageId = me.village ? String(me.village) : undefined;
      const list = await api.getWaterQuality(villageId ? { village_id: villageId } : undefined);
      if (list.length > 0) return list[0];
    } catch {}
    return {
      ph: 7.2,
      turbidity: 3.4,
      tds: 380,
      temperature: 26.5,
      status: 'safe',
      date: new Date().toISOString().split('T')[0],
      villageName: 'Local Village',
    };
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

  createReport: async (report: Omit<CommunityReport, 'id' | 'status'>): Promise<CommunityReport> => {
    const me = await authGet<any>('/api/auth/me/').catch(() => ({}));
    const payload = {
      village: Number(me.village || 1),
      reporter_name: [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'Citizen',
      reporter_phone: me.phone || '',
      symptoms: report.symptoms || [],
      people_affected: parseInt(report.peopleAffected) || 1,
      age_group: (report.ageGroup || 'ALL_AGES').toUpperCase().replace(' ', '_'),
      description: report.notes || '',
      water_issue_observed: 'OTHER',
    };
    const created = await authPost<any>('/api/community-reports/', payload);
    return normalizeCommunityReport(created);
  },

  getTrends: (days: number): Promise<TrendPoint[]> => api.getTrends('1', days),

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
