import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import GisDashboard from '../pages/GisDashboard';
import AiDetectionReview from '../pages/AiDetectionReview';
import DetectionDetails from '../pages/DetectionDetails';
import DataSources from '../pages/DataSources';
import OceanMap from '../pages/OceanMap';
import DriftForecast from '../pages/DriftForecast';
import RiskAssessment from '../pages/RiskAssessment';
import RecoveryPlanning from '../pages/RecoveryPlanning';
import MissionDetails from '../pages/MissionDetails';
import ReportsAnalytics from '../pages/ReportsAnalytics';
import Settings from '../pages/Settings';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Root redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Established Routes */}
        <Route path="/dashboard" element={<GisDashboard />} />
        <Route path="/detection-review" element={<AiDetectionReview />} />
        <Route path="/ai-detection" element={<Navigate to="/detection-review" replace />} />
        <Route path="/detection-details" element={<DetectionDetails />} />
        <Route path="/data-sources" element={<DataSources />} />

        {/* Dedicated Batch 2 Routes */}
        <Route path="/ocean-map" element={<OceanMap />} />
        <Route path="/drift-forecast" element={<DriftForecast />} />
        <Route path="/risk-assessment" element={<RiskAssessment />} />
        <Route path="/recovery-planning" element={<RecoveryPlanning />} />

        {/* Dedicated Phase 3 Routes */}
        <Route path="/mission-details" element={<MissionDetails />} />
        <Route path="/reports-analytics" element={<ReportsAnalytics />} />
        <Route path="/settings" element={<Settings />} />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
