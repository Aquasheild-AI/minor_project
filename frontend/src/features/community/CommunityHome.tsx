import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Droplets,
  Map as MapIcon,
  Bell,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { communityApi, type CommunityAlert } from '@/services/communityApi';
import { useAuth } from '@/hooks/useAuth';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village } from '@/types';
import { useTranslation } from 'react-i18next';

export function CommunityHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [village, setVillage] = useState<Village | null>(null);
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([communityApi.getUserVillage(), communityApi.getAlerts()])
      .then(([v, al]) => {
        setVillage(v);
        setAlerts(al);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message={t('common.states.loading')} />;
  if (!village) return null;

  const cfg = riskConfig[village.riskLevel];
  const showBanner = village.riskLevel === 'high' || village.riskLevel === 'critical';
  const villageAlert = alerts.find((a) => a.villageId === village.id && a.status === 'active') || alerts.find((a) => a.status === 'active') || alerts[0];
  const localizedRiskLevel = t(`common.riskLevels.${village.riskLevel}`, { defaultValue: cfg.label });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('community.greeting', { name: (user?.name || user?.username || 'Neighbor').split(' ')[0] })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('community.homeSubtitle')}</p>
      </div>

      {/* Village selector */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{village.name} {t('common.village')}</p>
          <p className="text-xs text-slate-500">{t('common.district')}: {village.district}</p>
        </div>
        <button onClick={() => navigate('/community/profile')} className="btn-secondary text-xs">
          {t('community.changeVillage')}
        </button>
      </div>

      {/* Alert Banner */}
      {showBanner && villageAlert && (
        <div
          className="mb-6 flex items-center justify-between rounded-xl border-l-4 p-4"
          style={{ backgroundColor: cfg.hex + '10', borderLeftColor: cfg.hex }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: cfg.hex + '20' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: cfg.hex }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {village.riskLevel === 'critical' ? t('community.riskStatus.criticalRisk') : t('community.riskStatus.highRisk')}
              </p>
              <p className="text-xs text-slate-600">
                {t(`community.riskExplanations.${village.riskLevel}`)} ({timeAgo(villageAlert.detectedAt)})
              </p>
            </div>
          </div>
          <Link to="/community/alerts" className="btn-primary text-xs">
            {t('common.viewDetails')}
          </Link>
        </div>
      )}

      {/* Current Risk Card */}
      <div className="card mb-6 overflow-hidden" data-tour="dashboard-risk-card">
        <div className="p-6">
          <p className="text-sm font-medium text-slate-500">{t('community.currentVillageRisk')}</p>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={cfg.hex}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(village.riskScore / 100) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{village.riskScore}%</span>
                <span className="text-xs text-slate-500">{t('community.riskScore')}</span>
              </div>
            </div>
            <div>
              <RiskBadge level={village.riskLevel} />
              <p className="mt-2 text-sm text-slate-600">
                {t(`community.riskExplanations.${village.riskLevel}`)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {t('common.updated')} {timeAgo(village.lastUpdated)}
              </p>
            </div>
          </div>

          {/* Risk level bar */}
          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <div className={`flex-1 ${village.riskLevel === 'low' ? 'bg-risk-low' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'medium' ? 'bg-risk-medium' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'high' ? 'bg-risk-high' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'critical' ? 'bg-risk-critical' : 'bg-slate-100'}`} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-400">
              <span>{t('common.riskLevels.low')}</span>
              <span>{t('common.riskLevels.medium')}</span>
              <span>{t('common.riskLevels.high')}</span>
              <span>{t('common.riskLevels.critical')}</span>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {t('community.disclaimer')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6" data-tour="dashboard-quick-actions">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('community.quickActions')}</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/community/report" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <HeartPulse className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{t('community.quickActionsItems.report')}</p>
            <p className="text-xs text-slate-500">{t('community.quickActionsItems.reportDesc')}</p>
          </Link>
          <Link to="/community/water-quality" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Droplets className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{t('community.quickActionsItems.water')}</p>
            <p className="text-xs text-slate-500">{t('community.quickActionsItems.waterDesc')}</p>
          </Link>
          <Link to="/community/risk-map" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <MapIcon className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{t('community.quickActionsItems.map')}</p>
            <p className="text-xs text-slate-500">{t('community.quickActionsItems.mapDesc')}</p>
          </Link>
          <Link to="/community/alerts" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-risk-critical-bg">
              <Bell className="h-6 w-6 text-risk-critical" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{t('community.quickActionsItems.alerts')}</p>
            <p className="text-xs text-slate-500">{t('community.quickActionsItems.alertsDesc')}</p>
          </Link>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">
          {t('community.whyRisk', { level: localizedRiskLevel })}
        </h3>
        <p className="mb-4 text-xs text-slate-500">{t('community.whyRiskDesc')}</p>
        <div className="space-y-3">
          <FactorItem
            icon={TrendingUp}
            label={t('community.factors.healthReports')}
            detail={t('community.factors.healthReportsDesc')}
          />
          <FactorItem
            icon={Droplets}
            label={t('community.factors.turbidity')}
            detail={t('community.factors.turbidityDesc')}
          />
          <FactorItem
            icon={Droplets}
            label={t('community.factors.tds')}
            detail={t('community.factors.tdsDesc')}
          />
        </div>
      </div>

      {/* Recent Alert Preview */}
      {villageAlert && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{t('community.latestAlert')}</h3>
            <Link to="/community/alerts" className="text-xs font-medium text-primary-600 hover:underline">
              {t('common.viewAll')}
            </Link>
          </div>
          <div
            className="flex items-center gap-3 rounded-lg border-l-4 p-3"
            style={{ backgroundColor: riskConfig[villageAlert.severity].hex + '10', borderLeftColor: riskConfig[villageAlert.severity].hex }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: riskConfig[villageAlert.severity].hex + '20' }}>
              <Bell className="h-4 w-4" style={{ color: riskConfig[villageAlert.severity].hex }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RiskBadge level={villageAlert.severity} />
                <span className="text-xs text-slate-400">{timeAgo(villageAlert.detectedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{villageAlert.message}</p>
            </div>
            <Link to="/community/alerts" className="text-xs font-medium text-primary-600 hover:underline">
              {t('common.viewDetails')} <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FactorItem({ icon: Icon, label, detail }: { icon: React.ElementType; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
