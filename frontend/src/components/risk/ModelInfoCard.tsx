import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, Database } from 'lucide-react';
import type { ModelInfo } from '@/types';

interface ModelInfoCardProps {
  info: ModelInfo | null;
  loading?: boolean;
}

export function ModelInfoCard({ info, loading = false }: ModelInfoCardProps) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-100 rounded" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="card p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="h-5 w-5 text-primary-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Machine Learning Models &amp; Diagnostics</h3>
          <p className="text-xs text-slate-500">Live operational status and validation metrics for the dual ML modules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module A */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Module A: Water Contamination</span>
            {info.water?.status === 'OK' ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3" /> Unavailable
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium">
            {info.water?.model_name || 'WaterRisk-HGB-v1'}
          </p>
          <p className="text-2xs text-slate-500 mt-0.5">
            Trained at: {info.water?.trained_at ? new Date(info.water.trained_at).toLocaleDateString() : 'Active'}
          </p>
          <div className="mt-3 text-2xs text-slate-600 space-y-1 border-t border-slate-200 pt-2">
            <div className="flex justify-between">
              <span>Architecture:</span>
              <span className="font-semibold text-slate-700">Ordinal Boosting (HGB)</span>
            </div>
            <div className="flex justify-between">
              <span>Constraints:</span>
              <span className="font-semibold text-emerald-700">Monotonic (DO↓, Nitrate↑)</span>
            </div>
            <div className="flex justify-between">
              <span>Training Dataset:</span>
              <span className="font-semibold text-slate-700">21,349 CPCB Station-Years</span>
            </div>
          </div>
        </div>

        {/* Module B */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Module B: Outbreak Surveillance</span>
            {info.outbreak?.status === 'OK' ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3" /> Unavailable
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium">
            {info.outbreak?.model_name || 'OutbreakRisk-HGB-v1'}
          </p>
          <p className="text-2xs text-slate-500 mt-0.5">
            Trained at: {info.outbreak?.trained_at ? new Date(info.outbreak.trained_at).toLocaleDateString() : 'Active'}
          </p>
          <div className="mt-3 text-2xs text-slate-600 space-y-1 border-t border-slate-200 pt-2">
            <div className="flex justify-between">
              <span>Calibration:</span>
              <span className="font-semibold text-slate-700">Isotonic Regression</span>
            </div>
            <div className="flex justify-between">
              <span>Satellite Feed:</span>
              <span className="font-semibold text-blue-700">Live NASA POWER Climate</span>
            </div>
            <div className="flex justify-between">
              <span>Surveillance Baseline:</span>
              <span className="font-semibold text-slate-700">IDSP Outbreaks (2009–2022)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
