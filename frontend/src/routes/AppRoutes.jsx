import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';

// Public Web Pages
import LandingPage from '../pages/LandingPage';
import FishermanReportPage from '../pages/FishermanReportPage';
import ReportSelectorPage from '../pages/ReportSelectorPage';
import GpsReportPage from '../pages/GpsReportPage';
import ManualReportPage from '../pages/ManualReportPage';

// New Stitch-Designed NGO Portal Screens
import NgoLayout from '../layouts/NgoLayout';
import NgoStaffLogin from '../pages/ngo/NgoStaffLogin';
import NgoDashboard from '../pages/ngo/NgoDashboard';
import AllReports from '../pages/ngo/AllReports';
import IncidentManagement from '../pages/ngo/IncidentManagement';
import IncidentDetails from '../pages/ngo/IncidentDetails';
import AiDetectionReview from '../pages/ngo/AiDetectionReview';
import EnvironmentalIntelligence from '../pages/ngo/EnvironmentalIntelligence';
import DriftForecasting from '../pages/ngo/DriftForecasting';
import RiskPrioritization from '../pages/ngo/RiskPrioritization';
import RecoveryPlanning from '../pages/ngo/RecoveryPlanning';
import RecoveryMissionDetails from '../pages/ngo/RecoveryMissionDetails';
import RouteOptimization from '../pages/ngo/RouteOptimization';
import VerifiedIncidentsMap from '../pages/ngo/VerifiedIncidentsMap';

/**
 * Clean 404 Not Found Page adhering to the OceanRescue Light Theme
 */
const NotFoundPage = () => (
  <div className="min-h-screen bg-[#F2FAFA] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white border border-[#D8ECEC] flex items-center justify-center text-[#087E8B] shadow-sm mb-4">
      <span className="material-symbols-outlined text-3xl">explore_off</span>
    </div>
    <span className="text-xs font-mono uppercase text-[#087E8B] font-bold tracking-wider">
      404 — Navigational Sector Not Found
    </span>
    <h1 className="text-2xl font-bold font-display text-[#173B4D] mt-1 mb-2">
      Page Not Found
    </h1>
    <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
      The requested route does not exist or has been relocated to the new OceanRescue operations platform.
    </p>
    <div className="flex items-center gap-3">
      <Link
        to="/"
        className="px-4 py-2 rounded-lg bg-white border border-[#D8ECEC] text-xs font-semibold text-[#173B4D] hover:bg-slate-50 transition-colors"
      >
        Public Home
      </Link>
      <Link
        to="/ngo/dashboard"
        className="px-4 py-2 rounded-lg bg-[#00C9C1] text-xs font-bold font-display text-[#173B4D] hover:bg-[#00b5ae] transition-colors"
      >
        NGO Operations Portal
      </Link>
    </div>
  </div>
);

export const AppRoutes = () => {
  return (
    <Routes>
      {/* ============================================================== */}
      {/* 1. PUBLIC OCEANRESCUE WEBSITE                                  */}
      {/* ============================================================== */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/report-gear" element={<ReportSelectorPage />} />
      <Route path="/report-gear/gps" element={<GpsReportPage />} />
      <Route path="/report-gear/manual" element={<ManualReportPage />} />
      <Route path="/report-gear/standard" element={<FishermanReportPage />} />
      <Route path="/report" element={<Navigate to="/report-gear" replace />} />

      {/* ============================================================== */}
      {/* 2. NGO STAFF AUTHENTICATION (Screen 1)                        */}
      {/* ============================================================== */}
      <Route path="/ngo/login" element={<NgoStaffLogin />} />
      <Route path="/ngo-login" element={<Navigate to="/ngo/login" replace />} />
      <Route path="/login" element={<Navigate to="/ngo/login" replace />} />

      {/* ============================================================== */}
      {/* 3. NEW STITCH NGO CONSERVATION OPERATIONS PORTAL (Screens 2-10) */}
      {/* All NGO pages share the consistent light-theme NgoLayout        */}
      {/* ============================================================== */}
      <Route path="/ngo" element={<NgoLayout />}>
        {/* Report Management: All Reports */}
        <Route path="reports" element={<AllReports />} />

        {/* Screen 2: NGO Dashboard */}
        <Route index element={<Navigate to="/ngo/dashboard" replace />} />
        <Route path="dashboard" element={<NgoDashboard />} />

        {/* Screen 3: Incident Management */}
        <Route path="incidents" element={<IncidentManagement />} />

        {/* Screen 4: Incident Details and Verification */}
        <Route path="incidents/:id" element={<IncidentDetails />} />

        {/* Verified Incident Location Map */}
        <Route path="map" element={<VerifiedIncidentsMap />} />
        <Route path="verified-map" element={<Navigate to="/ngo/map" replace />} />

        {/* Screen 5: AI Detection Review */}
        <Route path="ai-detection" element={<AiDetectionReview />} />

        {/* Screen 6: Environmental Intelligence */}
        <Route path="environmental-intelligence" element={<EnvironmentalIntelligence />} />

        {/* Screen 7: Drift Forecasting */}
        <Route path="drift-forecasting" element={<DriftForecasting />} />

        {/* Screen 8: Risk Prioritization */}
        <Route path="risk-prioritization" element={<RiskPrioritization />} />

        {/* Screen 9: Recovery Planning */}
        <Route path="recovery-planning" element={<RecoveryPlanning />} />

        {/* Dedicated Route Optimization Module */}
        <Route path="recovery-missions/:missionId/route-optimization" element={<RouteOptimization />} />
        <Route path="recovery-missions/:id/route-optimization" element={<RouteOptimization />} />

        {/* Screen 10: Recovery Mission Details & Recovery Outcome Tracking */}
        <Route path="recovery-missions/:id" element={<RecoveryMissionDetails />} />
      </Route>

      {/* ============================================================== */}
      {/* 4. SAFE LEGACY REDIRECTS (Hiding the old dark-mode dashboard)   */}
      {/* Old routes safely redirect to the new light-theme Stitch portal */}
      {/* ============================================================== */}
      <Route path="/dashboard" element={<Navigate to="/ngo/dashboard" replace />} />
      <Route path="/detection-review" element={<Navigate to="/ngo/ai-detection" replace />} />
      <Route path="/ai-detection" element={<Navigate to="/ngo/ai-detection" replace />} />
      <Route path="/detection-details" element={<Navigate to="/ngo/ai-detection" replace />} />
      <Route path="/data-sources" element={<Navigate to="/ngo/environmental-intelligence" replace />} />
      <Route path="/ocean-map" element={<Navigate to="/ngo/map" replace />} />

      <Route path="/drift-forecast" element={<Navigate to="/ngo/drift-forecasting" replace />} />
      <Route path="/risk-assessment" element={<Navigate to="/ngo/risk-prioritization" replace />} />
      <Route path="/recovery-planning" element={<Navigate to="/ngo/recovery-planning" replace />} />
      <Route path="/mission-details" element={<Navigate to="/ngo/recovery-planning" replace />} />
      <Route path="/reports-analytics" element={<Navigate to="/ngo/incidents" replace />} />
      <Route path="/settings" element={<Navigate to="/ngo/dashboard" replace />} />
      <Route path="/legacy" element={<Navigate to="/ngo/dashboard" replace />} />

      {/* ============================================================== */}
      {/* 5. CATCH-ALL NOT FOUND                                         */}
      {/* ============================================================== */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
