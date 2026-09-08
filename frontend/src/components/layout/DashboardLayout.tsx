import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Disease Surveillance Dashboard',
  '/health': 'Health Surveillance',
  '/health/add': 'Add Health Record',
  '/water-quality': 'Water Quality Monitoring',
  '/water-quality/add': 'Add Water Quality Record',
  '/risk-prediction': 'Disease Risk Prediction',
  '/risk-map': 'Village Risk Map',
  '/trends': 'Historical Trends',
  '/alerts': 'Early Warnings & Alerts',
  '/villages': 'Villages',
  '/admin': 'User Administration',
  '/settings': 'Settings',
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <TopNav title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
