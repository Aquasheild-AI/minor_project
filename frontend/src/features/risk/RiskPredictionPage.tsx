import { useState, useEffect } from 'react';
import { Brain, MapPin, RefreshCw, AlertCircle, CheckCircle2, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { WaterRiskCard } from '@/components/risk/WaterRiskCard';
import { DiseaseRiskCard } from '@/components/risk/DiseaseRiskCard';
import { ModelInfoCard } from '@/components/risk/ModelInfoCard';
import { riskApi, type RefreshSummary } from '@/services/riskApi';
import type { ApiVillage, WaterRiskPrediction, DiseaseRiskPrediction, ModelInfo } from '@/types';

export function RiskPredictionPage() {
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [loadingVillages, setLoadingVillages] = useState<boolean>(true);

  // Predictions state
  const [waterPrediction, setWaterPrediction] = useState<WaterRiskPrediction | null>(null);
  const [diseasePrediction, setDiseasePrediction] = useState<DiseaseRiskPrediction | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState<boolean>(false);
  const [refreshingWater, setRefreshingWater] = useState<boolean>(false);
  const [refreshingAll, setRefreshingAll] = useState<boolean>(false);

  // Diagnostics & errors
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [refreshSummary, setRefreshSummary] = useState<RefreshSummary | null>(null);

  // Load villages and model diagnostics on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      riskApi.getVillages().catch((err) => {
        console.error('Failed to load villages:', err);
        return [] as ApiVillage[];
      }),
      riskApi.getModelInfo().catch((err) => {
        console.warn('Failed to load model diagnostics:', err);
        return null;
      }),
    ]).then(([vList, mInfo]) => {
      if (!active) return;
      setVillages(vList);
      setModelInfo(mInfo);
      setLoadingVillages(false);
      // Auto-select first village if available
      if (vList.length > 0) {
        setSelectedVillageId(String(vList[0].id));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Fetch predictions whenever selectedVillageId changes
  useEffect(() => {
    if (!selectedVillageId) {
      setWaterPrediction(null);
      setDiseasePrediction(null);
      return;
    }

    const vId = Number(selectedVillageId);
    const selectedVillage = villages.find((v) => v.id === vId);

    setLoadingPredictions(true);
    setError('');
    setRefreshSummary(null);

    Promise.all([
      riskApi.getWaterRisks({ village_id: vId }).catch((err) => {
        console.error('Water risk error:', err);
        return [] as WaterRiskPrediction[];
      }),
      selectedVillage?.district
        ? riskApi.getDiseaseRisks(selectedVillage.district).catch((err) => {
            console.error('Disease risk error:', err);
            return [] as DiseaseRiskPrediction[];
          })
        : Promise.resolve([] as DiseaseRiskPrediction[]),
    ])
      .then(([waterList, diseaseList]) => {
        setWaterPrediction(waterList.length > 0 ? waterList[0] : null);
        setDiseasePrediction(diseaseList.length > 0 ? diseaseList[0] : null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load risk predictions');
      })
      .finally(() => {
        setLoadingPredictions(false);
      });
  }, [selectedVillageId, villages]);

  const handleRefreshVillageWater = async () => {
    if (!selectedVillageId) return;
    setRefreshingWater(true);
    setError('');
    try {
      const updated = await riskApi.refreshVillageWaterRisk(Number(selectedVillageId));
      setWaterPrediction(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-score village water risk');
    } finally {
      setRefreshingWater(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    setError('');
    setRefreshSummary(null);
    try {
      const summary = await riskApi.refreshAll();
      setRefreshSummary(summary);
      // Re-fetch current predictions to reflect new updates
      if (selectedVillageId) {
        const vId = Number(selectedVillageId);
        const selectedVillage = villages.find((v) => v.id === vId);
        const [waterList, diseaseList] = await Promise.all([
          riskApi.getWaterRisks({ village_id: vId }),
          selectedVillage?.district ? riskApi.getDiseaseRisks(selectedVillage.district) : Promise.resolve([]),
        ]);
        setWaterPrediction(waterList.length > 0 ? waterList[0] : null);
        setDiseasePrediction(diseaseList.length > 0 ? diseaseList[0] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch refresh failed');
    } finally {
      setRefreshingAll(false);
    }
  };

  const selectedVillage = villages.find((v) => v.id === Number(selectedVillageId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Risk Prediction Engine"
        subtitle="Dual-model real-time risk assessment: Village-level water contamination and district-level outbreak surveillance."
        breadcrumb={['Home', 'Risk Prediction']}
      />

      {/* Control Bar: Village selection + Global Refresh */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="label mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-primary-600" />
              Target Village
            </label>
            <div className="relative">
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                disabled={loadingVillages}
                className="input pr-10 font-medium"
              >
                {loadingVillages && <option value="">Loading monitored villages...</option>}
                {!loadingVillages && villages.length === 0 && (
                  <option value="">No villages found in database</option>
                )}
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — District {v.district} ({v.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 md:pt-5">
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm"
              title="Re-run both models across all villages & live NASA climate"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingAll ? 'animate-spin' : ''}`} />
              {refreshingAll ? 'Running Dual Models...' : 'Run Live Refresh (All)'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {refreshSummary && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>
              Live refresh complete: Water models updated: {refreshSummary.water.updated} (skipped {refreshSummary.water.skipped}); Outbreak models updated: {refreshSummary.disease.updated}.
            </span>
          </div>
        )}
      </div>

      {/* Dual Risk Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Module A: Water Contamination Risk */}
        <WaterRiskCard
          prediction={waterPrediction}
          loading={loadingPredictions}
          onRefresh={handleRefreshVillageWater}
          refreshing={refreshingWater}
        />

        {/* Module B: Regional Disease Outbreak Risk */}
        <DiseaseRiskCard
          prediction={diseasePrediction}
          loading={loadingPredictions}
          district={selectedVillage?.district}
        />
      </div>

      {/* Model Transparency & Metrics */}
      <ModelInfoCard info={modelInfo} />
    </div>
  );
}
