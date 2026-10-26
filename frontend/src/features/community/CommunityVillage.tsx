import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, Activity, Calendar, TrendingUp, Droplets } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village, TrendPoint } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export function CommunityVillage() {
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

  useEffect(() => {
    Promise.all([communityApi.getUserVillage(), communityApi.getTrends(30)]).then(([v, t]) => {
      setVillage(v);
      setTrend(t);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message={t('common.states.loading')} />;
  if (!village) return null;

  const cfg = riskConfig[village.riskLevel];
  const localizedRiskLabel = t(`common.riskLevels.${village.riskLevel}`, { defaultValue: cfg.label });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{village.name} {t('common.village')}</h1>
          <p className="text-sm text-slate-500">{village.district}, {village.state}</p>
        </div>
        <RiskBadge level={village.riskLevel} />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OverviewCard icon={Activity} label={t('common.riskLevel')} value={localizedRiskLabel} valueColor={cfg.hex} />
        <OverviewCard icon={TrendingUp} label={t('common.riskScore')} value={`${village.riskScore}%`} valueColor={cfg.hex} />
        <OverviewCard icon={Users} label={isHi ? 'हाल की रिपोर्टें' : 'Recent Reports'} value={String(village.suspectedCases)} />
        <OverviewCard icon={Calendar} label={t('common.lastUpdated')} value={timeAgo(village.lastUpdated)} />
      </div>

      {/* Health Overview */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{isHi ? 'स्वास्थ्य अवलोकन' : 'Health Overview'}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'इस सप्ताह दर्ज मामले' : 'Reported cases this week'}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{village.suspectedCases}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'पिछला सप्ताह' : 'Previous week'}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Math.floor(village.suspectedCases * 0.7)}</p>
            <p className="text-xs text-risk-critical">+{village.suspectedCases - Math.floor(village.suspectedCases * 0.7)} {isHi ? 'वृद्धि' : 'increase'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'प्रमुख लक्षण' : 'Most reported'}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{isHi ? 'दस्त संबंधी बीमारी' : 'Diarrheal Disease'}</p>
          </div>
        </div>
      </div>

      {/* Risk Trend */}
      <ChartCard title={isHi ? 'जोखिम रुझान' : 'Risk Trend'} subtitle={isHi ? 'पिछले 30 दिनों का जोखिम स्कोर' : 'Risk score over the last 30 days'} className="mt-6">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
            <Line type="monotone" dataKey="riskScore" stroke="#ea580c" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Water Quality Summary */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{isHi ? 'जल गुणवत्ता सारांश' : 'Water Quality Summary'}</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <WaterSummary label={t('community.waterQuality.ph')} value="6.1" status={t('common.riskLevels.attention')} statusColor="text-risk-medium" />
          <WaterSummary label={t('community.waterQuality.turbidity')} value="10.2 NTU" status={t('common.riskLevels.elevated')} statusColor="text-risk-critical" />
          <WaterSummary label={t('community.waterQuality.tds')} value="820 ppm" status={t('common.riskLevels.elevated')} statusColor="text-risk-medium" />
          <WaterSummary label={t('community.waterQuality.temperature')} value="29°C" status={t('common.riskLevels.normal')} statusColor="text-risk-low" />
        </div>
        <Link to="/community/water-quality" className="btn-secondary mt-4 w-full text-sm">
          <Droplets className="h-4 w-4" /> {isHi ? 'पूर्ण जल गुणवत्ता देखें' : 'View Full Water Quality'}
        </Link>
      </div>

      {/* Map */}
      <ChartCard title={isHi ? 'गाँव की स्थिति' : 'Village Location'} subtitle={isHi ? 'मानचित्र पर आपका गाँव' : 'Your village on the map'} className="mt-6">
        <div className="h-48 overflow-hidden rounded-lg">
          <iframe
            title="Village Map"
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: '0.5rem' }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${village.lng - 0.02},${village.lat - 0.02},${village.lng + 0.02},${village.lat + 0.02}&marker=${village.lat},${village.lng}`}
          />
        </div>
        <Link to="/community/risk-map" className="btn-secondary mt-3 w-full text-sm">
          <MapPin className="h-4 w-4" /> {t('community.quickActionsItems.map')}
        </Link>
      </ChartCard>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, valueColor }: { icon: React.ElementType; label: string; value: string; valueColor?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold" style={valueColor ? { color: valueColor } : { color: '#1e293b' }}>{value}</p>
    </div>
  );
}

function WaterSummary({ label, value, status, statusColor }: { label: string; value: string; status: string; statusColor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className={`text-xs ${statusColor}`}>{status}</p>
    </div>
  );
}
