import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Search, Filter, MapPin } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village, RiskLevel } from '@/types';
import 'leaflet/dist/leaflet.css';

const riskColors: Record<RiskLevel, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
};

export function CommunityRiskMap() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  useEffect(() => {
    communityApi.getVillages().then((v) => {
      setVillages(v);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  const filtered = villages.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || v.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  const center: [number, number] = [25.3176, 82.9739];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Community Risk Map</h1>
      <p className="mb-6 text-sm text-slate-500">See risk levels for your village and nearby areas.</p>

      {/* Controls */}
      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search village..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Map */}
      <div className="card overflow-hidden p-0">
        <div style={{ height: '450px' }}>
          <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {filtered.map((v) => (
              <CircleMarker
                key={v.id}
                center={[v.lat, v.lng]}
                radius={12}
                pathOptions={{ color: riskColors[v.riskLevel], fillColor: riskColors[v.riskLevel], fillOpacity: 0.6 }}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px 0' }}>{v.name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px 0' }}>{v.district}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: riskColors[v.riskLevel], fontWeight: 600 }}>
                        {riskConfig[v.riskLevel].label} Risk
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>· {v.riskScore}%</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px 0' }}>
                      Cases: {v.suspectedCases} · Water: {v.waterStatus}
                    </p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0' }}>
                      Updated {timeAgo(v.lastUpdated)}
                    </p>
                    <a
                      href={`/community/villages/${v.id}`}
                      style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}
                    >
                      View Village →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {(Object.keys(riskColors) as RiskLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: riskColors[level] }} />
            <span className="text-xs text-slate-600">{riskConfig[level].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
