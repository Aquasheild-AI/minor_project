import { Activity, CloudRain, Thermometer, MapPin, AlertCircle, CheckCircle2, Info, Compass } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { toRiskLevel } from '@/services/riskApi';
import { riskConfig } from '@/utils/risk';
import type { DiseaseRiskPrediction } from '@/types';

interface DiseaseRiskCardProps {
  prediction: DiseaseRiskPrediction | null;
  loading?: boolean;
  district?: string;
}

export function DiseaseRiskCard({ prediction, loading = false, district }: DiseaseRiskCardProps) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-6 w-20 bg-slate-200 rounded" />
        </div>
        <div className="h-24 bg-slate-100 rounded-lg mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="card p-6 border-dashed border-2 border-slate-200">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No District Outbreak Risk Available</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            {district
              ? `No live NASA POWER surveillance prediction recorded yet for district: ${district}.`
              : 'Select a village or district to view regional outbreak surveillance predictions.'}
          </p>
        </div>
      </div>
    );
  }

  const level = toRiskLevel(prediction.risk_level);
  const cfg = riskConfig[level];
  const factors = prediction.contributing_factors;
  const match = factors?.matched_location;
  const features = factors?.features;
  const prob = (prediction.outbreak_probability * 100).toFixed(1);
  const baseRate = factors?.base_rate ? (factors.base_rate * 100).toFixed(1) : null;
  const lift = factors?.base_rate && factors.base_rate > 0
    ? (prediction.outbreak_probability / factors.base_rate).toFixed(1)
    : null;

  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      {/* Header Banner */}
      <div className="border-b border-slate-100 bg-slate-50/70 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">District Outbreak Risk (Next 14 Days)</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                Module B
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              District: <span className="font-medium text-slate-700">{prediction.district}</span>
              {match && ` • Nearest Reference: ${match.district} (${match.distance_km.toFixed(0)} km)`}
            </p>
          </div>
        </div>

        <RiskBadge level={level} />
      </div>

      <div className="p-6 space-y-6">
        {/* Outbreak Probability vs Historical Baseline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col items-center justify-center text-center p-2 md:border-r border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              14-Day Outbreak Probability
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold" style={{ color: cfg.hex }}>
                {prob}%
              </span>
            </div>
            {lift && (
              <span className="mt-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {lift}x historical base rate ({baseRate}%)
              </span>
            )}
          </div>

          <div className="col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-700">Historical Fortnight Risk Percentile:</span>
              <span className="font-bold text-slate-900">{prediction.risk_score.toFixed(0)}th percentile</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(5, prediction.risk_score))}%`,
                  backgroundColor: cfg.hex,
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Calibrated against 2009–2022 IDSP outbreak surveillance and live weekly NASA POWER satellite climate.
            </p>
          </div>
        </div>

        {/* Plain Language Explanation */}
        <div className="rounded-lg bg-purple-50/50 border border-purple-100 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Surveillance Summary</p>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                {prediction.plain_language_explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Climate & Environmental Indicators */}
        {features && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <CloudRain className="h-3.5 w-3.5 text-blue-500" />
              Satellite Climate Drivers (NASA POWER)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CloudRain className="h-3.5 w-3.5 text-blue-500" />
                  <span>4-Week Rainfall</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {features.precip_4w !== null && features.precip_4w !== undefined
                    ? `${features.precip_4w.toFixed(0)} mm`
                    : 'N/A'}
                </p>
                {features.precip_4w_anom !== null && features.precip_4w_anom !== undefined && (
                  <p className="text-2xs text-slate-500 mt-0.5">
                    {features.precip_4w_anom >= 0 ? `+${features.precip_4w_anom.toFixed(0)}` : features.precip_4w_anom.toFixed(0)} mm vs normal
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                  <span>Mean Temperature</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {features.temp_mean_4w !== null && features.temp_mean_4w !== undefined
                    ? `${features.temp_mean_4w.toFixed(1)} °C`
                    : 'N/A'}
                </p>
                {features.temp_4w_anom !== null && features.temp_4w_anom !== undefined && (
                  <p className="text-2xs text-slate-500 mt-0.5">
                    {features.temp_4w_anom >= 0 ? `+${features.temp_4w_anom.toFixed(1)}` : features.temp_4w_anom.toFixed(1)} °C vs normal
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Compass className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Seasonal Rate</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {features.hist_season_rate !== null && features.hist_season_rate !== undefined
                    ? `${features.hist_season_rate.toFixed(1)} / yr`
                    : 'N/A'}
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">Historical district season baseline</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Surveillance Actions */}
        {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
              Surveillance &amp; Health Worker Directives
            </h4>
            <ul className="space-y-2">
              {prediction.recommended_actions.map((act, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
        <span>Model: {prediction.model_name || 'OutbreakRisk-HGB-v1'}</span>
        <span>
          Climate Week Ending: {factors?.climate_week_ending || new Date(prediction.prediction_date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
