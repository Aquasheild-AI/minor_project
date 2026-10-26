import { useState, useEffect } from 'react';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { WaterRiskCard } from '@/components/risk/WaterRiskCard';
import { DiseaseRiskCard } from '@/components/risk/DiseaseRiskCard';
import { useAuth } from '@/hooks/useAuth';
import { riskApi } from '@/services/riskApi';
import type { ApiVillage, WaterRiskPrediction, DiseaseRiskPrediction } from '@/types';

export function WorkerRiskAnalysis() {
  const { user } = useAuth();
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [loadingVillages, setLoadingVillages] = useState<boolean>(true);

  const [waterPrediction, setWaterPrediction] = useState<WaterRiskPrediction | null>(null);
  const [diseasePrediction, setDiseasePrediction] = useState<DiseaseRiskPrediction | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState<boolean>(false);
  const [refreshingWater, setRefreshingWater] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    riskApi
      .getVillages()
      .then((allVillages) => {
        if (!active) return;
        // Filter by worker's assigned villages if assigned, otherwise show all
        const assignedIds = user?.assignedVillageIds;
        const available =
          assignedIds && assignedIds.length > 0
            ? allVillages.filter((v) => assignedIds.includes(v.id))
            : allVillages;

        setVillages(available);
        setLoadingVillages(false);
        if (available.length > 0) {
          setSelectedVillageId(String(available[0].id));
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load assigned villages:', err);
        setError('Failed to load assigned villages');
        setLoadingVillages(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

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
        setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      })
      .finally(() => {
        setLoadingPredictions(false);
      });
  }, [selectedVillageId, villages]);

  const handleRefreshWater = async () => {
    if (!selectedVillageId) return;
    setRefreshingWater(true);
    setError('');
    try {
      const updated = await riskApi.refreshVillageWaterRisk(Number(selectedVillageId));
      setWaterPrediction(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-score water tests');
    } finally {
      setRefreshingWater(false);
    }
  };

  const selectedVillage = villages.find((v) => v.id === Number(selectedVillageId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Risk Assessment & Surveillance"
        subtitle="Review water contamination predictions and regional outbreak warnings for assigned villages."
        breadcrumb={['Home', 'Risk Analysis']}
      />

      {/* Village Selection */}
      <div className="card p-6">
        <div className="max-w-md">
          <label className="label mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
            <MapPin className="h-4 w-4 text-primary-600" />
            Assigned Village
          </label>
          <select
            value={selectedVillageId}
            onChange={(e) => setSelectedVillageId(e.target.value)}
            disabled={loadingVillages}
            className="input font-medium"
          >
            {loadingVillages && <option value="">Loading assigned villages...</option>}
            {!loadingVillages && villages.length === 0 && (
              <option value="">No assigned villages found</option>
            )}
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — District {v.district}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Dual Risk Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <WaterRiskCard
          prediction={waterPrediction}
          loading={loadingPredictions}
          onRefresh={handleRefreshWater}
          refreshing={refreshingWater}
          showActions={true}
        />

        <DiseaseRiskCard
          prediction={diseasePrediction}
          loading={loadingPredictions}
          district={selectedVillage?.district}
        />
      </div>
    </div>
  );
}
