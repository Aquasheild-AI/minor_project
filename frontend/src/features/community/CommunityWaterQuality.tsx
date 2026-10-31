import { useState, useEffect } from 'react';
import { Beaker, Droplets, Thermometer, Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi, type CommunityWaterQualitySummary } from '@/services/communityApi';
import { timeAgo } from '@/utils/risk';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TrendPoint } from '@/types';
import { useTranslation } from 'react-i18next';

export function CommunityWaterQuality() {
  const [wq, setWq] = useState<CommunityWaterQualitySummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('ph');
  const [expanded, setExpanded] = useState<string | null>(null);
  const { t } = useTranslation();

  const tabs = [
    { key: 'ph', label: t('community.waterQuality.ph') },
    { key: 'turbidity', label: t('community.waterQuality.turbidity') },
    { key: 'tds', label: t('community.waterQuality.tds') },
    { key: 'temperature', label: t('community.waterQuality.temperature') },
  ];

  useEffect(() => {
    Promise.all([communityApi.getWaterQuality(), communityApi.getTrends(period)]).then(([w, t]) => {
      setWq(w);
      setTrend(t);
      setLoading(false);
    });
  }, [period]);

  const explanations = [
    { param: t('community.waterQuality.ph'), icon: Beaker, explanation: t('community.waterQuality.phDesc') },
    { param: t('community.waterQuality.turbidity'), icon: Droplets, explanation: t('community.waterQuality.turbidityDesc') },
    { param: t('community.waterQuality.tds'), icon: Activity, explanation: t('community.waterQuality.tdsDesc') },
    { param: t('community.waterQuality.temperature'), icon: Thermometer, explanation: t('community.waterQuality.temperatureDesc') },
  ];

  if (loading) return <LoadingState message={t('common.states.loading')} />;

  if (!wq || wq.status === 'unavailable') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('community.waterQuality.title')}</h1>
          <p className="text-sm text-slate-500">{t('community.waterQuality.subtitle')}</p>
        </div>

        {/* Data Unavailable Hero Card */}
        <div className="card p-8 text-center border border-slate-200">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Droplets className="h-8 w-8 text-slate-400" />
          </div>
          <Badge variant="neutral" className="mb-3">
            {t('common.states.unavailable', { defaultValue: 'Data Unavailable' })}
          </Badge>
          <h2 className="text-lg font-bold text-slate-800">
            {t('community.riskStatus.dataUnavailable', { defaultValue: 'No Water Quality Tests Recorded' })}
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {t('community.riskStatus.noTests', {
              defaultValue: 'No water quality field tests have been recorded yet for this village. Health workers will monitor and record samples shortly.',
            })}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-xs text-blue-700 font-medium">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Precaution: Always boil drinking water for at least 10 minutes before consumption.</span>
          </div>
        </div>

        {/* Parameter Explanations */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">{t('community.waterQuality.aboutParams')}</h3>
          <div className="space-y-3">
            {explanations.map((exp) => (
              <div key={exp.param} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                <exp.icon className="mt-0.5 h-4 w-4 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{exp.param}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{exp.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const phStatus = wq.ph < 6.5 || wq.ph > 8.5
    ? { label: t('common.riskLevels.attention'), variant: 'medium' as const }
    : { label: t('common.riskLevels.normal'), variant: 'low' as const };
  const turbStatus = wq.turbidity > 5
    ? { label: t('common.riskLevels.elevated'), variant: 'critical' as const }
    : wq.turbidity > 3
    ? { label: t('common.riskLevels.moderate'), variant: 'medium' as const }
    : { label: t('common.riskLevels.normal'), variant: 'low' as const };
  const tdsStatus = wq.tds > 500
    ? { label: t('common.riskLevels.elevated'), variant: 'medium' as const }
    : { label: t('common.riskLevels.normal'), variant: 'low' as const };
  const tempStatus = { label: t('common.riskLevels.normal'), variant: 'low' as const };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('community.waterQuality.title')}</h1>
      <p className="mb-6 text-sm text-slate-500">{t('community.waterQuality.subtitle')}</p>

      {/* Water Quality Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="water-quality-cards">
        <WQCard icon={Beaker} label={t('community.waterQuality.ph')} value={String(wq!.ph)} status={phStatus.label} variant={phStatus.variant} />
        <WQCard icon={Droplets} label={t('community.waterQuality.turbidity')} value={`${wq!.turbidity} NTU`} status={turbStatus.label} variant={turbStatus.variant} />
        <WQCard icon={Activity} label={t('community.waterQuality.tds')} value={`${wq!.tds} ppm`} status={tdsStatus.label} variant={tdsStatus.variant} />
        <WQCard icon={Thermometer} label={t('community.waterQuality.temperature')} value={`${wq!.temperature}°C`} status={tempStatus.label} variant={tempStatus.variant} />
      </div>

      <p className="mt-3 text-xs text-slate-400">{t('common.lastUpdated')} {timeAgo(wq!.lastUpdated || wq!.date)}</p>

      {/* Water Quality Trends */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('community.waterQuality.trendsTitle')}</h3>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value={7}>{t('community.waterQuality.sevenDays')}</option>
            <option value={30}>{t('community.waterQuality.thirtyDays')}</option>
            <option value={90}>{t('community.waterQuality.threeMonths')}</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {trend.length === 0 ? (
          <EmptyState icon={Droplets} title={t('common.states.empty')} message={t('common.states.noResults')} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey={activeTab} stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* What do these values mean? */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{t('community.waterQuality.aboutParams')}</h3>
        <div className="space-y-2">
          {explanations.map((item) => {
            const Icon = item.icon;
            const isOpen = expanded === item.param;
            return (
              <div key={item.param} className="rounded-lg border border-slate-100">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.param)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">{item.param}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-slate-500">{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="card mt-6 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
          <p className="text-xs text-slate-500">
            {t('community.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

function WQCard({ icon: Icon, label, value, status, variant }: { icon: React.ElementType; label: string; value: string; status: string; variant: 'low' | 'medium' | 'critical' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-1.5"><Badge variant={variant}>{status}</Badge></div>
    </div>
  );
}
