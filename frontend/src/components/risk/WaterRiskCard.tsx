import { Droplets, AlertTriangle, CheckCircle2, RefreshCw, Beaker, ShieldAlert, Info } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { toRiskLevel } from '@/services/riskApi';
import { riskConfig } from '@/utils/risk';
import type { WaterRiskPrediction } from '@/types';

interface WaterRiskCardProps {
  prediction: WaterRiskPrediction | null;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  showActions?: boolean;
}

export function WaterRiskCard({
  prediction,
  loading = false,
  onRefresh,
  refreshing = false,
  showActions = true,
}: WaterRiskCardProps) {
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
            <Droplets className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No Water Risk Prediction Yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            This village has no recorded water quality tests yet. Record a test in the Water Quality tab
            or click refresh to trigger automated scoring.
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="mt-4 btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Evaluating Tests...' : 'Check & Score Tests'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const level = toRiskLevel(prediction.risk_level);
  const cfg = riskConfig[level];
  const factors = prediction.contributing_factors;
  const labConfirmed = factors?.lab_confirmed_e_coli;
  const probOver100 = factors?.probability_fc_over_100 ?? 0;

  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      {/* Header Banner */}
      <div className="border-b border-slate-100 bg-slate-50/70 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Water Contamination Risk</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                Module A
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Village: <span className="font-medium text-slate-700">{prediction.village_name}</span>
              {factors?.water_source && ` • Source: ${factors.water_source}`}
              {factors?.sample_date && ` (${new Date(factors.sample_date).toLocaleDateString()})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge level={level} />
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Re-score from latest water tests"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Lab Confirmed E. coli Alert */}
        {labConfirmed && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3 text-red-900">
            <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Confirmed E. coli Contamination</p>
              <p className="text-xs text-red-800 mt-0.5">
                Laboratory testing detected E. coli in {factors.water_source}. This water is unsafe to drink
                without boiling or chlorination. An automated advisory has been raised.
              </p>
            </div>
          </div>
        )}

        {/* Score & Gauge Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col items-center justify-center text-center p-2 md:border-r border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Contamination Score
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold" style={{ color: cfg.hex }}>
                {prediction.risk_score.toFixed(0)}
              </span>
              <span className="text-slate-400 text-sm font-semibold">/ 100</span>
            </div>
            <span className="mt-1 text-xs font-semibold capitalize px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
              {level} Risk Band
            </span>
          </div>

          <div className="col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-700">P(Faecal Coliform &gt; 100 MPN/100 mL):</span>
              <span className="font-bold text-slate-900">{(probOver100 * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(5, probOver100 * 100))}%`,
                  backgroundColor: cfg.hex,
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Threshold matches WHO high-risk guideline. Ordinal model with monotonic constraints on DO and Nitrate.
            </p>
          </div>
        </div>

        {/* Plain Language Explanation */}
        <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Model Assessment</p>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                {prediction.plain_language_explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Contributing Factors */}
        {factors?.factors && factors.factors.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Beaker className="h-3.5 w-3.5" />
              Key Contributing Field Readings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {factors.factors.map((f, idx) => {
                const isNegative = f.impact < 0;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-100 bg-white shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{f.label}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          isNegative
                            ? 'bg-emerald-50 text-emerald-700'
                            : f.impact >= 5
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {f.impact > 0 ? `+${f.impact.toFixed(0)}` : f.impact.toFixed(0)} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">{f.description}</p>
                    {f.value !== null && (
                      <span className="text-2xs text-slate-400 mt-1.5">
                        Reading: {f.value} {f.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {showActions && prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Recommended Field Actions
            </h4>
            <ul className="space-y-2">
              {prediction.recommended_actions.map((act, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
        <span>Model: {prediction.model_name || 'WaterRisk-HGB-v1'}</span>
        <span>Evaluated: {new Date(prediction.created_at || prediction.prediction_date).toLocaleString()}</span>
      </div>
    </div>
  );
}
