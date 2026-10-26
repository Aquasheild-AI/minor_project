import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { toRiskLevel, riskApi } from '@/services/riskApi';
import { riskConfig } from '@/utils/risk';
import type { WaterRiskEvaluation, WaterEvaluationInput } from '@/types';
import type { DatasetRecord } from '@/features/water-quality/WaterQualityPage';

interface WaterReadingRiskCardProps {
  record?: DatasetRecord | null;
  initialParams?: WaterEvaluationInput | null;
  className?: string;
  allowSimulate?: boolean;
}

export function WaterReadingRiskCard({
  record,
  initialParams,
  className = '',
  allowSimulate = true,
}: WaterReadingRiskCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<WaterRiskEvaluation | null>(null);

  // Simulation parameters
  const [isSimulating, setIsSimulating] = useState(false);
  const [simParams, setSimParams] = useState<WaterEvaluationInput>({
    ph: 7.2,
    temperature: 25.0,
    tds: 300,
    dissolved_oxygen: 6.0,
    nitrate: 10.0,
    source_type: 'HANDPUMP',
  });

  // Sync params when record or initialParams change
  useEffect(() => {
    if (record) {
      setSimParams({
        ph: Number(record.ph?.toFixed(2) ?? 7.2),
        temperature: Number(record.temperature?.toFixed(1) ?? 25.0),
        tds: Number(record.tds?.toFixed(0) ?? 300),
        dissolved_oxygen: Number(record.dissolvedOxygen?.toFixed(2) ?? 6.0),
        nitrate: Number(record.nitrate?.toFixed(2) ?? 10.0),
        source_type: record.waterSource || 'HANDPUMP',
        fecal_coliform: record.fecalColiform,
        district: record.district,
        source_name: `${record.waterSource || 'Source'} (${record.district || 'District'})`,
      });
      setIsSimulating(false);
    } else if (initialParams) {
      setSimParams(initialParams);
      setIsSimulating(false);
    }
  }, [record, initialParams]);

  const runEvaluation = useCallback(async (paramsToEvaluate: WaterEvaluationInput) => {
    if (paramsToEvaluate.ph === undefined || isNaN(paramsToEvaluate.ph)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await riskApi.evaluateWaterReading(paramsToEvaluate);
      setEvaluation(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run automatically when params are set
  useEffect(() => {
    if (simParams.ph !== undefined) {
      runEvaluation(simParams);
    }
  }, [simParams, runEvaluation]);

  const handleSimParamChange = (key: keyof WaterEvaluationInput, value: number | string) => {
    setSimParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!record && !initialParams && !isSimulating) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center ${className}`}>
        <Droplets className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">No Sample Selected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Select a sample from the table or start a custom simulation to analyze water contamination risk.
        </p>
      </div>
    );
  }

  const level = evaluation ? toRiskLevel(evaluation.risk_level) : 'low';
  const probOver100 = evaluation?.probability_fc_over_100 ?? 0;
  const isLabConfirmed = evaluation?.lab_confirmed_contamination;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">AI Contamination Risk</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                  Module A ML
                </span>
              </div>
              <p className="text-xs text-slate-500">
                WHO Faecal Indicator Model • {simParams.source_name || simParams.source_type || 'Water Sample'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allowSimulate && (
              <button
                type="button"
                onClick={() => setIsSimulating(!isSimulating)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  isSimulating
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Adjust readings to simulate what-if scenarios"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{isSimulating ? 'Hide Tuning' : 'Tune Values'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => runEvaluation(simParams)}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors"
              title="Re-run ML prediction"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Simulation Controls (expandable) */}
        {isSimulating && (
          <div className="mt-3 pt-3 border-t border-blue-100/60 bg-white/70 rounded-lg p-3 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span>Interactive Parameter Sandbox</span>
              <span className="text-[11px] text-slate-500 font-normal">Real-time ML re-scoring</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-slate-500 mb-1">pH ({simParams.ph})</label>
                <input
                  type="range"
                  min="4.0"
                  max="10.5"
                  step="0.1"
                  value={simParams.ph}
                  onChange={(e) => handleSimParamChange('ph', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Dissolved O₂ ({simParams.dissolved_oxygen ?? 6} mg/L)</label>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.1"
                  value={simParams.dissolved_oxygen ?? 6}
                  onChange={(e) => handleSimParamChange('dissolved_oxygen', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Nitrate ({simParams.nitrate ?? 10} mg/L)</label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={simParams.nitrate ?? 10}
                  onChange={(e) => handleSimParamChange('nitrate', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">TDS ({simParams.tds ?? 300} mg/L)</label>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="25"
                  value={simParams.tds ?? 300}
                  onChange={(e) => handleSimParamChange('tds', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Water Temp ({simParams.temperature ?? 25} °C)</label>
                <input
                  type="range"
                  min="10"
                  max="42"
                  step="1"
                  value={simParams.temperature ?? 25}
                  onChange={(e) => handleSimParamChange('temperature', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Source Type</label>
                <select
                  value={simParams.source_type}
                  onChange={(e) => handleSimParamChange('source_type', e.target.value)}
                  className="input py-1 text-xs"
                >
                  <option value="HANDPUMP">Handpump</option>
                  <option value="TUBEWELL">Tube Well / Borewell</option>
                  <option value="WELL">Open Well</option>
                  <option value="RIVER">River / Stream</option>
                  <option value="POND">Pond / Lake</option>
                  <option value="TAP">Piped Supply / Tap</option>
                  <option value="OTHER">Tanker / Other</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading && !evaluation ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Evaluating sample against WHO faecal indicator model...</p>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        ) : evaluation ? (
          <>
            {/* Lab Contamination Alert */}
            {isLabConfirmed && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900">Severe Contamination Flagged</div>
                  <div className="text-red-700 mt-0.5">
                    Faecal coliform exceeding threshold or detected biological pathogens. Water must be boiled or treated before consumption.
                  </div>
                </div>
              </div>
            )}

            {/* Main Score Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Model Risk Score
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {evaluation.risk_score.toFixed(1)}%
                  </span>
                  <RiskBadge level={level} />
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Faecal Coliform &gt; 100 MPN
                </div>
                <div className="flex items-baseline sm:justify-end gap-1.5 mt-0.5">
                  <span className={`text-lg font-bold ${(probOver100 >= 0.5) ? 'text-risk-critical' : (probOver100 >= 0.2) ? 'text-risk-medium' : 'text-risk-low'}`}>
                    {(probOver100 * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">WHO high-risk band</span>
                </div>
              </div>
            </div>

            {/* Probability Distribution Bar */}
            {evaluation.probabilities && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>WHO Band Probability Distribution</span>
                  <span className="font-medium text-slate-700">{evaluation.risk_level} band predominant</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: `${(evaluation.probabilities.LOW ?? 0) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`LOW: ${((evaluation.probabilities.LOW ?? 0) * 100).toFixed(0)}%`}
                  />
                  <div
                    style={{ width: `${(evaluation.probabilities.MEDIUM ?? 0) * 100}%` }}
                    className="bg-amber-400 transition-all duration-300"
                    title={`MEDIUM: ${((evaluation.probabilities.MEDIUM ?? 0) * 100).toFixed(0)}%`}
                  />
                  <div
                    style={{ width: `${(evaluation.probabilities.HIGH ?? 0) * 100}%` }}
                    className="bg-orange-500 transition-all duration-300"
                    title={`HIGH: ${((evaluation.probabilities.HIGH ?? 0) * 100).toFixed(0)}%`}
                  />
                  <div
                    style={{ width: `${(evaluation.probabilities.CRITICAL ?? 0) * 100}%` }}
                    className="bg-rose-600 transition-all duration-300"
                    title={`CRITICAL: ${((evaluation.probabilities.CRITICAL ?? 0) * 100).toFixed(0)}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span className="text-emerald-700">Low {((evaluation.probabilities.LOW ?? 0) * 100).toFixed(0)}%</span>
                  <span className="text-amber-700">Med {((evaluation.probabilities.MEDIUM ?? 0) * 100).toFixed(0)}%</span>
                  <span className="text-orange-700">High {((evaluation.probabilities.HIGH ?? 0) * 100).toFixed(0)}%</span>
                  <span className="text-rose-700">Crit {((evaluation.probabilities.CRITICAL ?? 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Contributing Factors */}
            {evaluation.factors && evaluation.factors.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  Key Parameter Drivers (Versus Safe Baseline)
                </h4>
                <div className="space-y-1.5">
                  {evaluation.factors.map((f, idx) => {
                    const isPositive = f.impact > 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span className="text-slate-700 truncate">{f.description}</span>
                        </div>
                        <span
                          className={`font-semibold shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                            isPositive
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isPositive ? `+${f.impact.toFixed(1)} pts` : `${f.impact.toFixed(1)} pts`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plain Language Explanation */}
            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-blue-900 block mb-1">Clinical AI Summary</span>
              {evaluation.plain_language_explanation}
            </div>

            {/* Recommended Field Actions */}
            {evaluation.recommended_actions && evaluation.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Recommended Field Actions</h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {evaluation.recommended_actions.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
