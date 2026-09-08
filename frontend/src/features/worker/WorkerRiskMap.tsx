import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, X, Droplets, Beaker, Thermometer, Activity, AlertTriangle, Bell } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { workerAlerts } from '@/data/workerData';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village } from '@/types';

const legendItems = [
  { level: 'Low', color: riskConfig.low.hex },
  { level: 'Medium', color: riskConfig.medium.hex },
  { level: 'High', color: riskConfig.high.hex },
  { level: 'Critical', color: riskConfig.critical.hex },
];

export function WorkerRiskMap() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selected, setSelected] = useState<Village | null>(null);

  useEffect(() => {
    workerApi.getVillages().then((v) => {
      setVillages(v);
      setLoading(false);
    });
  }, []);

  const filtered = villages.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter && v.riskLevel !== riskFilter) return false;
    return true;
  });

  const villageAlerts = selected ? workerAlerts.filter((a) => a.villageId === selected.id) : [];

  if (loading) return <LoadingState message="Loading map data..." />;

  return (
    <div>
      <PageHeader title="My Villages Risk Map" subtitle="Geographic view of disease risk across your assigned villages." breadcrumb={['Home', 'Risk Map']} />

      <div className="card mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search village..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="input">
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex items-center justify-end gap-3 text-xs">
            {legendItems.map((item) => (
              <div key={item.level} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600">{item.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="h-[600px]">
            <MapContainer center={[25.32, 83.0]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {filtered.map((v) => (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lng]}
                  radius={10}
                  pathOptions={{ color: riskConfig[v.riskLevel].hex, fillColor: riskConfig[v.riskLevel].hex, fillOpacity: 0.7 }}
                  eventHandlers={{ click: () => setSelected(v) }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.district}, {v.state}</p>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p>Risk Score: <span className="font-semibold">{v.riskScore}%</span></p>
                        <p>Suspected Cases: {v.suspectedCases}</p>
                        <p>Water Status: {v.waterStatus}</p>
                        <p>Updated: {timeAgo(v.lastUpdated)}</p>
                      </div>
                      <Link to={`/worker/villages/${v.id}`} className="text-xs font-medium text-primary-600 hover:underline">View Village</Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="card overflow-hidden">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Select a Village</h3>
              <p className="text-sm text-slate-500">Click on a marker in the map to view detailed village information.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500">{selected.district}, {selected.state}</p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Village Overview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Population</p><p className="text-lg font-bold text-slate-900">{selected.population.toLocaleString()}</p></div>
                    <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Risk Score</p><p className="text-lg font-bold" style={{ color: riskConfig[selected.riskLevel].hex }}>{selected.riskScore}%</p></div>
                    <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Suspected Cases</p><p className="text-lg font-bold text-slate-900">{selected.suspectedCases}</p></div>
                    <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Risk Level</p><div className="mt-1"><RiskBadge level={selected.riskLevel} /></div></div>
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Water Quality</h4>
                  <div className="space-y-2">
                    <WaterRow icon={Beaker} label="pH" value="7.2" status="Within range" />
                    <WaterRow icon={Droplets} label="Turbidity" value="4.8 NTU" status="Moderate" statusColor="text-risk-medium" />
                    <WaterRow icon={Activity} label="TDS" value="420 ppm" status="Normal" statusColor="text-risk-low" />
                    <WaterRow icon={Thermometer} label="Temperature" value="27.5°C" status="Normal" statusColor="text-risk-low" />
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Factors</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-3.5 w-3.5 text-risk-high" /> High suspected cases</div>
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-3.5 w-3.5 text-risk-medium" /> Elevated turbidity</div>
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-3.5 w-3.5 text-risk-medium" /> High TDS levels</div>
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Alerts</h4>
                  {villageAlerts.length === 0 ? (
                    <p className="text-sm text-slate-400">No recent alerts for this village.</p>
                  ) : (
                    <div className="space-y-2">
                      {villageAlerts.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2">
                          <Bell className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: riskConfig[a.severity].hex }} />
                          <div>
                            <p className="text-xs font-medium text-slate-800">{a.message}</p>
                            <p className="text-xs text-slate-400">{timeAgo(a.detectedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link to={`/worker/villages/${selected.id}`} className="btn-primary w-full">View Full Village Profile</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WaterRow({ icon: Icon, label, value, status, statusColor = 'text-slate-500' }: { icon: React.ElementType; label: string; value: string; status: string; statusColor?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">{value}</p>
        <p className={`text-xs ${statusColor}`}>{status}</p>
      </div>
    </div>
  );
}
