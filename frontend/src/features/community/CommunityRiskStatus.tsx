import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Activity,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/States';
import { useAuth } from '@/hooks/useAuth';
import { riskApi, toRiskLevel } from '@/services/riskApi';
import type { ApiVillage, WaterRiskPrediction, DiseaseRiskPrediction } from '@/types';
import { useTranslation } from 'react-i18next';

export function CommunityRiskStatus() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(user?.villageId || null);

  const [waterPrediction, setWaterPrediction] = useState<WaterRiskPrediction | null>(null);
  const [diseasePrediction, setDiseasePrediction] = useState<DiseaseRiskPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize village list
  useEffect(() => {
    let active = true;
    riskApi
      .getVillages()
      .then((vList) => {
        if (!active) return;
        setVillages(vList);
        if (!selectedVillageId && vList.length > 0) {
          setSelectedVillageId(user?.villageId || vList[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load villages:', err);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Fetch prediction when selected village changes
  useEffect(() => {
    if (!selectedVillageId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const targetVillage = villages.find((v) => v.id === selectedVillageId);

    Promise.all([
      riskApi.getWaterRisks({ village_id: selectedVillageId }).catch(() => [] as WaterRiskPrediction[]),
      targetVillage?.district
        ? riskApi.getDiseaseRisks(targetVillage.district).catch(() => [] as DiseaseRiskPrediction[])
        : Promise.resolve([] as DiseaseRiskPrediction[]),
    ])
      .then(([wList, dList]) => {
        setWaterPrediction(wList.length > 0 ? wList[0] : null);
        setDiseasePrediction(dList.length > 0 ? dList[0] : null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedVillageId, villages]);

  const hasWaterData = Boolean(waterPrediction);
  const waterLevel = waterPrediction ? toRiskLevel(waterPrediction.risk_level) : 'low';
  const isCriticalOrHigh = hasWaterData && (waterLevel === 'high' || waterLevel === 'critical');
  const labEColi = hasWaterData && waterPrediction?.contributing_factors?.lab_confirmed_e_coli;

  if (loading && !waterPrediction && villages.length === 0) {
    return <LoadingState message={t('common.states.loading')} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header and village selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('community.riskStatus.title')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('community.riskStatus.subtitle')}
          </p>
        </div>

        {villages.length > 1 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <select
              value={selectedVillageId || ''}
              onChange={(e) => setSelectedVillageId(Number(e.target.value))}
              className="input text-xs py-1.5 font-medium"
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.district})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Status Hero Card */}
      <div
        className={`card overflow-hidden border-2 ${
          !hasWaterData
            ? 'border-slate-200'
            : isCriticalOrHigh
            ? 'border-red-300'
            : 'border-slate-200'
        }`}
        data-tour="risk-advisory-section"
      >
        <div className="p-6 text-center">
          {/* Status Icon */}
          <div className="mt-2 flex justify-center">
            <div
              className={`h-20 w-20 rounded-full flex items-center justify-center ${
                !hasWaterData
                  ? 'bg-slate-100 text-slate-500'
                  : labEColi
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : isCriticalOrHigh
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {!hasWaterData ? (
                <HelpCircle className="h-10 w-10 text-slate-400" />
              ) : labEColi ? (
                <ShieldAlert className="h-10 w-10 text-red-600" />
              ) : isCriticalOrHigh ? (
                <AlertTriangle className="h-10 w-10 text-amber-600" />
              ) : (
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
              )}
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4">
            {t('community.riskStatus.waterSafetyHeader')}
          </p>

          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            {!hasWaterData
              ? t('community.riskStatus.dataUnavailable', { defaultValue: 'Water Quality Data Unavailable' })
              : labEColi
              ? t('community.riskStatus.boilAdvisory')
              : waterLevel === 'critical'
              ? t('community.riskStatus.criticalRisk')
              : waterLevel === 'high'
              ? t('community.riskStatus.highRisk')
              : waterLevel === 'medium'
              ? t('community.riskStatus.moderateRisk')
              : t('community.riskStatus.safeRisk')}
          </h2>

          <div className="mt-3 flex justify-center">
            {hasWaterData ? (
              <RiskBadge level={waterLevel} />
            ) : (
              <Badge variant="neutral">{t('common.states.unavailable', { defaultValue: 'Data Unavailable' })}</Badge>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {hasWaterData && waterPrediction
              ? waterPrediction.plain_language_explanation
              : t('community.riskStatus.noTests')}
          </p>

          {/* Boil Water Action Banner for Citizens */}
          {hasWaterData && (isCriticalOrHigh || labEColi) && (
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4 max-w-lg mx-auto flex items-center gap-3 text-left">
              <Flame className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">{t('community.riskStatus.boilBannerTitle')}</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {t('community.riskStatus.boilBannerDesc')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Level Indicator Bar */}
        {hasWaterData ? (
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <div className={`flex-1 ${waterLevel === 'low' ? 'bg-risk-low' : 'bg-slate-200'}`} />
              <div className={`flex-1 ${waterLevel === 'medium' ? 'bg-risk-medium' : 'bg-slate-200'}`} />
              <div className={`flex-1 ${waterLevel === 'high' ? 'bg-risk-high' : 'bg-slate-200'}`} />
              <div className={`flex-1 ${waterLevel === 'critical' ? 'bg-risk-critical' : 'bg-slate-200'}`} />
            </div>
            <div className="mt-1.5 flex justify-between text-2xs font-semibold text-slate-500">
              <span className={waterLevel === 'low' ? 'text-risk-low' : ''}>{t('common.riskLevels.low')}</span>
              <span className={waterLevel === 'medium' ? 'text-risk-medium' : ''}>{t('common.riskLevels.medium')}</span>
              <span className={waterLevel === 'high' ? 'text-risk-high' : ''}>{t('common.riskLevels.high')}</span>
              <span className={waterLevel === 'critical' ? 'text-risk-critical' : ''}>{t('common.riskLevels.critical')}</span>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 text-center">
            <p className="text-xs text-slate-500">
              Field water testing pending for this village. Health workers will conduct routine testing shortly.
            </p>
          </div>
        )}
      </div>

      {/* Household Safety Guidelines */}
      {waterPrediction && waterPrediction.recommended_actions?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t('community.alertsPage.guidanceTitle')}
          </h3>
          <ul className="space-y-2.5">
            {waterPrediction.recommended_actions.map((act, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-primary-600 mt-1 flex-shrink-0" />
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* District Outbreak Notice */}
      {diseasePrediction && (
        <div className="card p-5 border border-purple-100 bg-purple-50/30">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                  {t('community.riskStatus.diseasePredictionsTitle')} ({diseasePrediction.district})
                </p>
                <RiskBadge level={toRiskLevel(diseasePrediction.risk_level)} />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {diseasePrediction.plain_language_explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation shortcuts */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link to="/community/report" className="btn-primary flex-1 justify-center py-2.5">
          {t('community.quickActionsItems.report')} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/community/alerts" className="btn-secondary flex-1 justify-center py-2.5">
          {t('community.quickActionsItems.alerts')}
        </Link>
      </div>
    </div>
  );
}
