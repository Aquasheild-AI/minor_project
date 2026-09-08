import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, MapPin, Calendar, Sparkles, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { villages } from '@/data/mockData';
import { riskConfig } from '@/utils/risk';
import type { RiskPrediction, RiskLevel } from '@/types';

export function RiskPredictionPage() {
  const [villageId, setVillageId] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = () => {
    if (!villageId || !date) {
      setError('Please select a village and date.');
      return;
    }
    setError('');
    setLoading(true);
    setPrediction(null);
    api.predictRisk(villageId, date).then((p) => {
      setPrediction(p);
      setLoading(false);
    });
  };

  const impactColor: Record<string, string> = {
    low: 'text-risk-low bg-risk-low-bg',
    medium: 'text-risk-medium bg-risk-medium-bg',
    high: 'text-risk-high bg-risk-high-bg',
  };

  const gaugeColor = (score: number) => {
    if (score >= 80) return riskConfig.critical.hex;
    if (score >= 60) return riskConfig.high.hex;
    if (score >= 35) return riskConfig.medium.hex;
    return riskConfig.low.hex;
  };

  return (
    <div>
      <PageHeader
        title="Disease Risk Prediction"
        subtitle="Analyze disease outbreak risk for a selected village using ML-driven assessment."
        breadcrumb={['Home', 'Risk Prediction']}
      />

      {/* Form */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Select Parameters</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Select Village</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="input pl-10">
                <option value="">Choose village</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.district}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Analysis Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input pl-10" />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze Risk</>}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-risk-critical">{error}</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card mt-6 p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            <p className="text-sm text-slate-500">Running risk analysis model...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !prediction && (
        <div className="card mt-6">
          <EmptyState icon={Brain} title="No Analysis Yet" message="Select a village and date above, then click Analyze Risk to run the ML-driven risk assessment." />
        </div>
      )}

      {/* Result */}
      {prediction && !loading && (
        <div className="mt-6 space-y-6">
          {/* Risk Score Card */}
          <div className="card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Gauge */}
              <div className="flex flex-col items-center justify-center border-b border-slate-200 p-8 lg:border-b-0 lg:border-r">
                <div className="relative h-40 w-40">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={gaugeColor(prediction.riskScore)}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(prediction.riskScore / 100) * 314} 314`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{prediction.riskScore}%</span>
                    <span className="text-xs text-slate-500">Risk Score</span>
                  </div>
                </div>
                <div className="mt-4">
                  <RiskBadge level={prediction.riskLevel} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Confidence: {prediction.confidence}%</p>
              </div>

              {/* Summary */}
              <div className="p-6 lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-900">Risk Summary</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Village</p>
                    <p className="text-sm font-semibold text-slate-900">{prediction.villageName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Analysis Date</p>
                    <p className="text-sm font-semibold text-slate-900">{prediction.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Risk Level</p>
                    <div className="mt-1"><RiskBadge level={prediction.riskLevel} /></div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Risk Score</p>
                    <p className="text-sm font-semibold" style={{ color: gaugeColor(prediction.riskScore) }}>{prediction.riskScore}%</p>
                  </div>
                </div>

                {/* Risk gauge bar */}
                <div className="mt-6">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full">
                    <div className="flex-1 bg-risk-low" />
                    <div className="flex-1 bg-risk-medium" />
                    <div className="flex-1 bg-risk-high" />
                    <div className="flex-1 bg-risk-critical" />
                  </div>
                  <div className="relative mt-1" style={{ height: 0 }}>
                    <div className="absolute -translate-x-1/2 text-xs" style={{ left: `${prediction.riskScore}%` }}>
                      <div className="h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white shadow" style={{ backgroundColor: gaugeColor(prediction.riskScore) }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-high" />
              <h3 className="text-sm font-semibold text-slate-900">Contributing Factors</h3>
            </div>
            <div className="space-y-3">
              {prediction.factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{factor.label}</p>
                      <span className={`badge ${impactColor[factor.impact]}`}>Impact: {factor.impact.charAt(0).toUpperCase() + factor.impact.slice(1)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{factor.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recommended Attention</h3>
            </div>
            <p className="text-sm text-slate-600">{prediction.recommendation}</p>
            <p className="mt-2 text-xs text-slate-400">This is a decision-support tool. It does not provide medical diagnoses or treatment recommendations.</p>
            <div className="mt-4 flex gap-2">
              <Link to={`/villages/${prediction.villageId}`} className="btn-secondary">View Village</Link>
              <Link to="/risk-map" className="btn-secondary">View on Map</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
