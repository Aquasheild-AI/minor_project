import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Droplets, Activity, TrendingUp, MapPin } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { communityApi, type CommunityWaterQualitySummary } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village, TrendPoint } from '@/types';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';

export function CommunityVillageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null | undefined>(undefined);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [waterSummary, setWaterSummary] = useState<CommunityWaterQualitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

  useEffect(() => {
    Promise.all([
      communityApi.getVillage(id!),
      communityApi.getTrends(30),
      communityApi.getWaterQuality(),
    ]).then(([v, t, w]) => {
      setVillage(v || null);
      setTrend(t);
      setWaterSummary(w);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState message={t('common.states.loading')} />;

  if (!village) {
    return (
      <div className="card">
        <EmptyState 
          icon={MapPin} 
          title={isHi ? 'गाँव नहीं मिला' : 'Village Not Found'} 
          message={isHi ? 'यह गाँव उपलब्ध नहीं हो सकता है।' : 'This village may not be available.'} 
        />
      </div>
    );
  }

  const cfg = riskConfig[village.riskLevel];
  const localizedRiskLabel = t(`common.riskLevels.${village.riskLevel}`, { defaultValue: cfg.label });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 text-xs">
        <ArrowLeft className="h-4 w-4" /> {isHi ? 'वापस' : 'Back'}
      </button>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{village.name} {t('common.village')}</h1>
            <p className="mt-1 text-sm text-slate-500">{village.district}, {village.state}</p>
          </div>
          <RiskBadge level={village.riskLevel} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">{isHi ? 'जनसंख्या' : 'Population'}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{village.population.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('common.riskScore')}</p>
            <p className="mt-1 text-lg font-bold" style={{ color: cfg.hex }}>{village.riskScore}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isHi ? 'संदिग्ध मामले' : 'Suspected Cases'}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{village.suspectedCases}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('common.lastUpdated')}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{timeAgo(village.lastUpdated)}</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="card mb-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{isHi ? 'त्वरित सारांश' : 'Quick Summary'}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'सक्रिय चेतावनी' : 'Active alerts'}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{village.riskLevel === 'critical' ? '2' : village.riskLevel === 'high' ? '1' : '0'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'जल स्थिति' : 'Water Status'}</p>
            <p className="mt-1 text-sm font-bold capitalize text-slate-900">
              {waterSummary ? waterSummary.status : village.waterStatus}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'मामलों का रुझान' : 'Case trend'}</p>
            <p className="mt-1 text-sm font-bold text-risk-critical">{isHi ? 'बढ़ रहा है' : 'Increasing'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{isHi ? 'जोखिम रुझान' : 'Risk trend'}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: cfg.hex }}>{localizedRiskLabel}</p>
          </div>
        </div>
      </div>

      {/* Water Status */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">{isHi ? 'जल स्थिति' : 'Water Status'}</h3>
        </div>
        {waterSummary ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <WaterItem
              label="pH"
              value={waterSummary.ph.toFixed(1)}
              status={waterSummary.ph < 6.5 || waterSummary.ph > 8.5 ? (isHi ? 'ध्यान देने योग्य' : 'Needs Attention') : (isHi ? 'सामान्य' : 'Normal')}
              statusColor={waterSummary.ph < 6.5 || waterSummary.ph > 8.5 ? 'text-risk-medium' : 'text-risk-low'}
            />
            <WaterItem
              label={t('community.waterQuality.turbidity')}
              value={`${waterSummary.turbidity} NTU`}
              status={waterSummary.turbidity > 5 ? (isHi ? 'उच्च' : 'Elevated') : (isHi ? 'सामान्य' : 'Normal')}
              statusColor={waterSummary.turbidity > 5 ? 'text-risk-critical' : 'text-risk-low'}
            />
            <WaterItem
              label="TDS"
              value={`${waterSummary.tds} ppm`}
              status={waterSummary.tds > 500 ? (isHi ? 'उच्च' : 'Elevated') : (isHi ? 'सामान्य' : 'Normal')}
              statusColor={waterSummary.tds > 500 ? 'text-risk-medium' : 'text-risk-low'}
            />
            <WaterItem
              label={t('community.waterQuality.temperature')}
              value={`${waterSummary.temperature}°C`}
              status={isHi ? 'सामान्य' : 'Normal'}
              statusColor="text-risk-low"
            />
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">
              {isHi ? 'इस गाँव के लिए कोई नया जल परीक्षण दर्ज नहीं है।' : 'No water quality field tests recorded yet for this village.'}
            </p>
          </div>
        )}
        <Link to="/community/water-quality" className="btn-secondary mt-4 w-full text-sm">
          {isHi ? 'पूर्ण जल गुणवत्ता देखें' : 'View Full Water Quality'}
        </Link>
      </div>

      {/* Risk History */}
      <ChartCard 
        title={isHi ? 'जोखिम इतिहास' : 'Risk History'} 
        subtitle={isHi ? 'पिछले 30 दिनों में जोखिम स्कोर रुझान' : 'Risk score trend over the last 30 days'} 
        className="mb-6"
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="villageRiskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.hex} stopOpacity={0.2} />
                <stop offset="95%" stopColor={cfg.hex} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="riskScore" stroke={cfg.hex} fill="url(#villageRiskGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function WaterItem({ label, value, status, statusColor }: { label: string; value: string; status: string; statusColor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className={`text-xs ${statusColor}`}>{status}</p>
    </div>
  );
}
