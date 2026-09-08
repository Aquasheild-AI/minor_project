import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WorkerSidebar } from './WorkerSidebar';
import { WorkerTopNav } from './WorkerTopNav';

const pageTitles: Record<string, string> = {
  '/worker/dashboard': 'Health Worker Dashboard',
  '/worker/villages': 'My Villages',
  '/worker/health': 'Health Records',
  '/worker/health/add': 'Add Health Record',
  '/worker/water-quality': 'Water Quality Monitoring',
  '/worker/water-quality/add': 'Add Water Quality Observation',
  '/worker/risk-analysis': 'Village Risk Analysis',
  '/worker/risk-map': 'My Villages Risk Map',
  '/worker/trends': 'Health & Risk Trends',
  '/worker/alerts': 'Early Warnings & Alerts',
  '/worker/profile': 'My Profile',
  '/worker/help': 'Help & Support',
};

export function WorkerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Health Worker Portal';

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <WorkerTopNav title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
