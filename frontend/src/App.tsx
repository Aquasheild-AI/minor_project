import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkerLayout } from '@/components/layout/WorkerLayout';
import { CommunityLayout } from '@/components/layout/CommunityLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HealthRecordsPage } from '@/features/health/HealthRecordsPage';
import { AddHealthRecordPage } from '@/features/health/AddHealthRecordPage';
import { HealthRecordDetailsPage } from '@/features/health/HealthRecordDetailsPage';
import { WaterQualityPage } from '@/features/water-quality/WaterQualityPage';
import { AddWaterQualityPage } from '@/features/water-quality/AddWaterQualityPage';
import { RiskPredictionPage } from '@/features/risk/RiskPredictionPage';
import { RiskMapPage } from '@/features/gis/RiskMapPage';
import { TrendsPage } from '@/features/trends/TrendsPage';
import { AlertsPage } from '@/features/alerts/AlertsPage';
import { VillagesPage } from '@/features/villages/VillagesPage';
import { VillageDetailsPage } from '@/features/villages/VillageDetailsPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { WorkerDashboard } from '@/features/worker/WorkerDashboard';
import { WorkerVillagesPage } from '@/features/worker/WorkerVillagesPage';
import { WorkerHealthRecordsPage } from '@/features/worker/WorkerHealthRecordsPage';
import { WorkerAddHealthRecord } from '@/features/worker/WorkerAddHealthRecord';
import { WorkerHealthRecordDetails } from '@/features/worker/WorkerHealthRecordDetails';
import { WorkerWaterQualityPage } from '@/features/worker/WorkerWaterQualityPage';
import { WorkerAddWaterQuality } from '@/features/worker/WorkerAddWaterQuality';
import { WorkerRiskAnalysis } from '@/features/worker/WorkerRiskAnalysis';
import { WorkerRiskMap } from '@/features/worker/WorkerRiskMap';
import { WorkerTrends } from '@/features/worker/WorkerTrends';
import { WorkerAlerts } from '@/features/worker/WorkerAlerts';
import { WorkerVillageDetails } from '@/features/worker/WorkerVillageDetails';
import { WorkerProfile } from '@/features/worker/WorkerProfile';
import { CommunityHome } from '@/features/community/CommunityHome';
import { CommunityVillage } from '@/features/community/CommunityVillage';
import { CommunityRiskStatus } from '@/features/community/CommunityRiskStatus';
import { CommunityWaterQuality } from '@/features/community/CommunityWaterQuality';
import { CommunityReportIssue } from '@/features/community/CommunityReportIssue';
import { CommunityReports } from '@/features/community/CommunityReports';
import { CommunityRiskMap } from '@/features/community/CommunityRiskMap';
import { CommunityTrends } from '@/features/community/CommunityTrends';
import { CommunityAlerts } from '@/features/community/CommunityAlerts';
import { CommunityAlertDetails } from '@/features/community/CommunityAlertDetails';
import { CommunityVillageDetails } from '@/features/community/CommunityVillageDetails';
import { CommunityProfile } from '@/features/community/CommunityProfile';
import { CommunityChatbot } from '@/features/community/CommunityChatbot';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin / Authority routes */}
          <Route
            element={
              <ProtectedRoute role="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/health" element={<HealthRecordsPage />} />
            <Route path="/health/add" element={<AddHealthRecordPage />} />
            <Route path="/health/:id" element={<HealthRecordDetailsPage />} />
            <Route path="/water-quality" element={<WaterQualityPage />} />
            <Route path="/water-quality/add" element={<AddWaterQualityPage />} />
            <Route path="/risk-prediction" element={<RiskPredictionPage />} />
            <Route path="/risk-map" element={<RiskMapPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/villages" element={<VillagesPage />} />
            <Route path="/villages/:id" element={<VillageDetailsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Health Worker routes */}
          <Route
            element={
              <ProtectedRoute role="worker">
                <WorkerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/villages" element={<WorkerVillagesPage />} />
            <Route path="/worker/villages/:id" element={<WorkerVillageDetails />} />
            <Route path="/worker/health" element={<WorkerHealthRecordsPage />} />
            <Route path="/worker/health/add" element={<WorkerAddHealthRecord />} />
            <Route path="/worker/health/:id" element={<WorkerHealthRecordDetails />} />
            <Route path="/worker/water-quality" element={<WorkerWaterQualityPage />} />
            <Route path="/worker/water-quality/add" element={<WorkerAddWaterQuality />} />
            <Route path="/worker/risk-analysis" element={<WorkerRiskAnalysis />} />
            <Route path="/worker/risk-map" element={<WorkerRiskMap />} />
            <Route path="/worker/trends" element={<WorkerTrends />} />
            <Route path="/worker/alerts" element={<WorkerAlerts />} />
            <Route path="/worker/profile" element={<WorkerProfile />} />
          </Route>

          {/* Community User routes */}
          <Route
            element={
              <ProtectedRoute role="community">
                <CommunityLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/community/home" element={<CommunityHome />} />
            <Route path="/community/village" element={<CommunityVillage />} />
            <Route path="/community/risk" element={<CommunityRiskStatus />} />
            <Route path="/community/water-quality" element={<CommunityWaterQuality />} />
            <Route path="/community/report" element={<CommunityReportIssue />} />
            <Route path="/community/reports" element={<CommunityReports />} />
            <Route path="/community/chat" element={<CommunityChatbot />} />
            <Route path="/community/risk-map" element={<CommunityRiskMap />} />
            <Route path="/community/villages/:id" element={<CommunityVillageDetails />} />
            <Route path="/community/trends" element={<CommunityTrends />} />
            <Route path="/community/alerts" element={<CommunityAlerts />} />
            <Route path="/community/alerts/:id" element={<CommunityAlertDetails />} />
            <Route path="/community/profile" element={<CommunityProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
