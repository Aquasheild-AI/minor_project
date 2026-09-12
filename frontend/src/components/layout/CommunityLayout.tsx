import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CommunitySidebar } from './CommunitySidebar';
import { CommunityTopNav } from './CommunityTopNav';

const pageTitles: Record<string, string> = {
  '/community/home': 'Community Health Monitor',
  '/community/village': 'My Village',
  '/community/risk': 'Risk Status',
  '/community/water-quality': 'Water Quality',
  '/community/report': 'Report a Health Issue',
  '/community/reports': 'My Reports',
  '/community/chat': 'AI Health Assistant',
  '/community/risk-map': 'Community Risk Map',
  '/community/trends': 'Community Health Trends',
  '/community/alerts': 'Community Alerts',
  '/community/profile': 'My Profile',
};

export function CommunityLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Community Portal';

  return (
    <div className="min-h-screen bg-slate-50">
      <CommunitySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <CommunityTopNav title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
