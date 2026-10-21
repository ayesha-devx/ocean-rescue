import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import {
  Sliders,
  Cpu,
  Layers,
  ShieldCheck,
  RotateCcw,
  Save,
  User,
  Bell,
  Moon,
  MapPin,
  Database,
  Activity,
  Check,
  AlertTriangle,
  Info,
  Lock,
  Satellite,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  Radio,
  Server,
  Zap,
  Globe,
  Gauge
} from 'lucide-react';

export const Settings = () => {
  // Default configuration baseline
  const defaultSettings = {
    // Model & AI Inference
    modelWeight: 'yolov8s',
    computeTarget: 'orin', // 'orin' or 'cpu'
    classFishingNet: true,
    classRopeLine: true,
    confidenceThreshold: 0.25,
    iouThreshold: 0.50,
    swathResolution: '640', // '320', '640', '1024'

    // Geospatial & Map
    crs: 'EPSG:4326',
    tacticalUnits: 'nm', // 'nm', 'km', 'mi'
    defaultBasemap: 'hydro_dark', // 'hydro_dark', 'sar_radar', 'bathymetry'
    driftHorizon: '24', // '24', '48', '72'
    timestepDt: 900,
    layerHycom: true,
    layerEra5: true,
    layerWw3: true,
    layerGebco: true,
    layerCoral: true,
    layerPins: true,
    monteCarloToggle: true,

    // Risk Formulation Weights
    weightHabitat: 35,
    weightEntanglement: 25,
    weightDrift: 20,
    weightLongevity: 20,

    // App Preferences
    theme: 'midnight', // 'midnight', 'oceanic', 'high_contrast'
    soundAlerts: true,
    alertCriticalEntanglement: true,
    alertBiologistValidation: true,
    alertIngestionLatency: true,
    alertLowRiskSightings: false,
    autoSyncInterval: '30s', // '15s', '30s', '60s', 'manual'
    quietWindow: true
  };

  // State management
  const [settings, setSettings] = useState(defaultSettings);
  const [savedSettings, setSavedSettings] = useState(defaultSettings);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'ai', 'gis', 'risk', 'gateways', 'profile'
  const [activeGateways, setActiveGateways] = useState({
    hycom: true,
    era5: true,
    ww3: true,
    gebco: true,
    sentinel2: true,
    rov03: true
  });
  const [testingGateway, setTestingGateway] = useState(null);

  // Calculate pending changes
  const pendingChanges = [];
  if (settings.confidenceThreshold !== savedSettings.confidenceThreshold) {
    pendingChanges.push(`Confidence Cutoff: ${settings.confidenceThreshold.toFixed(2)}`);
  }
  if (settings.iouThreshold !== savedSettings.iouThreshold) {
    pendingChanges.push(`IoU NMS Overlap: ${settings.iouThreshold.toFixed(2)}`);
  }
  if (settings.modelWeight !== savedSettings.modelWeight) {
    pendingChanges.push(`Model: ${settings.modelWeight}`);
  }
  if (settings.computeTarget !== savedSettings.computeTarget) {
    pendingChanges.push(`Compute: ${settings.computeTarget.toUpperCase()}`);
  }
  if (settings.swathResolution !== savedSettings.swathResolution) {
    pendingChanges.push(`Resolution: ${settings.swathResolution}px`);
  }
  if (settings.crs !== savedSettings.crs) {
    pendingChanges.push(`CRS: ${settings.crs}`);
  }
  if (settings.defaultBasemap !== savedSettings.defaultBasemap) {
    pendingChanges.push(`Basemap: ${settings.defaultBasemap}`);
  }
  if (settings.driftHorizon !== savedSettings.driftHorizon) {
    pendingChanges.push(`Drift Horizon: ${settings.driftHorizon}h`);
  }
  if (
    settings.weightHabitat !== savedSettings.weightHabitat ||
    settings.weightEntanglement !== savedSettings.weightEntanglement ||
    settings.weightDrift !== savedSettings.weightDrift ||
    settings.weightLongevity !== savedSettings.weightLongevity
  ) {
    pendingChanges.push(`Risk Weights Adjusted`);
  }
  if (settings.soundAlerts !== savedSettings.soundAlerts) {
    pendingChanges.push(`Sound Alerts: ${settings.soundAlerts ? 'ON' : 'OFF'}`);
  }
  if (settings.theme !== savedSettings.theme) {
    pendingChanges.push(`Theme: ${settings.theme}`);
  }

  // Weight summation
  const totalWeight =
    settings.weightHabitat +
    settings.weightEntanglement +
    settings.weightDrift +
    settings.weightLongevity;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    setSavedSettings({ ...settings });
    showToast('System configuration saved to local state. Parameters active for current session.');
  };

  const handleReset = () => {
    setSettings({ ...defaultSettings });
    setSavedSettings({ ...defaultSettings });
    showToast('Configuration restored to operational baseline defaults.');
  };

  const resetWeightsToStandard = () => {
    setSettings((prev) => ({
      ...prev,
      weightHabitat: 35,
      weightEntanglement: 25,
      weightDrift: 20,
      weightLongevity: 20
    }));
    showToast('ALDFG risk scoring weights restored to IUCN guideline distribution.');
  };

  const testGatewayPing = (key, name) => {
    setTestingGateway(key);
    setTimeout(() => {
      setTestingGateway(null);
      showToast(`Gateway ping to ${name}: 200 OK • Round-trip latency: 24.8ms`);
    }, 600);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1680px] mx-auto text-[#EAF6FF] pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#00E5FF] text-[#061522] font-semibold text-sm shadow-[0_0_24px_rgba(0,229,255,0.4)] animate-fade-in border border-[#75E6DA]">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. ATMOSPHERIC SETTINGS COMMAND HERO */}
      <PageHero
        sector="Node: PACIFIC-SW-04 // Uptime: 14d 08h"
        title="Settings & System Configuration"
        subtitle="Configure real-time AI inference hyperparameters, hydrodynamic drift integration vectors, multi-tier ALDFG vulnerability weighting, and secure telemetry gateways."
        badgeText={pendingChanges.length > 0 ? `${pendingChanges.length} PENDING CHANGES` : 'SYNCHRONIZED (NOMINAL)'}
        badgeVariant={pendingChanges.length > 0 ? 'red' : 'teal'}
        stats={[
          {
            label: 'YOLOv8 CONFIDENCE',
            value: `${(settings.confidenceThreshold * 100).toFixed(0)}% Cutoff`,
            highlightColor: 'text-[#00E5FF]',
            icon: <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'IoU OVERLAP',
            value: `${(settings.iouThreshold * 100).toFixed(0)}% NMS`,
            highlightColor: 'text-[#75E6DA]',
            icon: <Layers className="w-3.5 h-3.5 text-[#75E6DA]" />
          },
          {
            label: 'DRIFT HORIZON',
            value: `+${settings.driftHorizon}h Timestep`,
            highlightColor: 'text-[#00D6A3]',
            icon: <Compass className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'RISK TOTAL',
            value: `${totalWeight}/100% Weight`,
            highlightColor: totalWeight === 100 ? 'text-[#00D6A3]' : 'text-[#FF6B61]',
            icon: <ShieldCheck className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'BUILD',
            value: 'v0.9.4-PROD-TENSORRT',
            highlightColor: 'text-[#EAF6FF]',
            icon: <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] text-xs font-mono uppercase tracking-wider transition-all border border-[#16465A] flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#91A9BB]" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        }
      />

        {/* Section Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-b border-[#16465A] overflow-x-auto text-xs pb-2">
          {[
            { id: 'all', label: 'All Settings' },
            { id: 'ai', label: 'AI Inference' },
            { id: 'gis', label: 'Geospatial & Drift' },
            { id: 'risk', label: 'Risk Formulation' },
            { id: 'gateways', label: 'Data Gateways' },
            { id: 'profile', label: 'Profile & Alerts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.15)]'
                  : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#0B2638]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      {/* 2-COLUMN TACTICAL BENTO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: COMPUTE, GEOSPATIAL & RISK HEURISTICS (SPAN 7) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* SECTION A: AI INFERENCE & VISION RUNTIME */}
          {(activeTab === 'all' || activeTab === 'ai') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-5">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">AI Inference &amp; Vision Architecture</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">GEOMETRIC SEGMENTATION &amp; TENSORRT ENGINE</span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                  FP16 CUDA VRAM
                </span>
              </div>

              {/* Operational Callout */}
              <div className="p-3.5 rounded-lg bg-[#103B50]/60 border border-[#16465A] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FFB547] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#91A9BB] leading-relaxed">
                  <span className="font-semibold text-[#FFB547] uppercase tracking-wider font-mono block mb-0.5">
                    Operational Baseline Reference Notice
                  </span>
                  YOLOv8s-seg Tactical Baseline — Trained on 110-image ALDFG benchmark dataset (TensorRT FP16). Calibrated for mission planning; requires oceanic field ground-truthing prior to high-stakes autonomous salvage operations. Changing parameters here updates local client state.
                </div>
              </div>

              {/* Model Selection & Runtime Pills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#91A9BB] mb-1.5 uppercase tracking-wider">
                    Active Baseline Model Weight
                  </label>
                  <select
                    value={settings.modelWeight}
                    onChange={(e) => setSettings({ ...settings, modelWeight: e.target.value })}
                    className="w-full bg-[#071D33] border border-[#16465A] rounded px-3 py-2 text-xs text-[#EAF6FF] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors cursor-pointer"
                  >
                    <option value="yolov8s">YOLOv8s-seg (v0.9-alpha) — Balanced Target</option>
                    <option value="yolov8n">YOLOv8n-seg — Edge Low-Power (12W Drone)</option>
                    <option value="yolov8m">YOLOv8m-seg — Deep Pelagic High-Density</option>
                    <option value="yolov8x">YOLOv8x-seg — Heavy Ensemble (Offline Cluster)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#91A9BB] mb-1.5 uppercase tracking-wider">
                    Inference Compute Target
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#071D33] border border-[#16465A] rounded">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, computeTarget: 'orin' })}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        settings.computeTarget === 'orin'
                          ? 'bg-[#00E5FF] text-[#061522] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                          : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Jetson Orin (GPU)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, computeTarget: 'cpu' })}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        settings.computeTarget === 'cpu'
                          ? 'bg-[#00E5FF] text-[#061522] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                          : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Host x86 CPU</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Detection Classes Toggles */}
              <div>
                <label className="block text-xs font-mono text-[#91A9BB] mb-2 uppercase tracking-wider">
                  Target Semantic Segmentation Classes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#071D33] border border-[#16465A] hover:border-[#00E5FF]/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.classFishingNet}
                      onChange={(e) => setSettings({ ...settings, classFishingNet: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#061522] border-[#16465A] text-[#00E5FF] focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#00E5FF]">fishing_net (Class 0)</div>
                      <div className="text-[11px] text-[#91A9BB] truncate">Ghost gillnets, trawl codends, purse seine meshes</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#071D33] border border-[#16465A] hover:border-[#00E5FF]/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.classRopeLine}
                      onChange={(e) => setSettings({ ...settings, classRopeLine: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#061522] border-[#16465A] text-[#00E5FF] focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#75E6DA]">rope_line (Class 1)</div>
                      <div className="text-[11px] text-[#91A9BB] truncate">Synthetic poly-braid lines, mooring cables &amp; hawsers</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sliders: Confidence & IoU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Confidence */}
                <div className="flex flex-col gap-2 p-3 bg-[#071D33] rounded-lg border border-[#16465A]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold uppercase tracking-wider">Confidence Cutoff Threshold</span>
                    <span className="font-mono font-bold text-[#00E5FF] text-sm">
                      {settings.confidenceThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.01"
                    value={settings.confidenceThreshold}
                    onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-[#00E5FF] bg-[#16465A] h-1.5 rounded appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#91A9BB]">
                    <span>0.05 (High Recall)</span>
                    <span>Default 0.25</span>
                    <span>0.95 (High Precision)</span>
                  </div>
                </div>

                {/* IoU NMS */}
                <div className="flex flex-col gap-2 p-3 bg-[#071D33] rounded-lg border border-[#16465A]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold uppercase tracking-wider">IoU / NMS Clustered Overlap</span>
                    <span className="font-mono font-bold text-[#FFB547] text-sm">
                      {settings.iouThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={settings.iouThreshold}
                    onChange={(e) => setSettings({ ...settings, iouThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-[#FFB547] bg-[#16465A] h-1.5 rounded appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#91A9BB]">
                    <span>0.10 (Aggressive NMS)</span>
                    <span>Default 0.50</span>
                    <span>0.90 (Permissive)</span>
                  </div>
                </div>
              </div>

              {/* Resolution Radio Pill Selector */}
              <div>
                <label className="block text-xs font-mono text-[#91A9BB] mb-2 uppercase tracking-wider">
                  Inference Swath Input Matrix
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '320', label: '320 × 320', desc: 'High-Speed Micro Drone' },
                    { id: '640', label: '640 × 640', desc: 'Standard Operational' },
                    { id: '1024', label: '1024 × 1024', desc: 'Deep Pelagic Swath' }
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, swathResolution: res.id })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer text-center ${
                        settings.swathResolution === res.id
                          ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                          : 'bg-[#071D33] border-[#16465A] text-[#91A9BB] hover:text-[#EAF6FF] hover:border-[#103B50]'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold">{res.label}</span>
                      <span className="text-[10px] mt-0.5 opacity-80">{res.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Benchmarks Telemetry Bar & Tools */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-[#071D33] border border-[#16465A] p-3 rounded-lg">
                <div className="flex items-center gap-5 font-mono text-xs">
                  <div>
                    <span className="text-[#91A9BB]">Latency:</span>
                    <span className="text-[#00D6A3] ml-1.5 font-bold">38.4 ms</span>
                  </div>
                  <div>
                    <span className="text-[#91A9BB]">Batch:</span>
                    <span className="text-[#EAF6FF] ml-1.5">1 (Realtime)</span>
                  </div>
                  <div>
                    <span className="text-[#91A9BB]">VRAM:</span>
                    <span className="text-[#00E5FF] ml-1.5">2.1 / 8.0 GB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showToast('Benchmark recalibrated: Current compute pipeline steady at 38.4 ms inference.')}
                    className="px-3 py-1.5 rounded bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>Calibrate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Model weights re-verified in GPU cache: MD5 8f4e2... verified.')}
                    className="px-3 py-1.5 rounded bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#00D6A3]" />
                    <span>Reload Weights</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: GEOSPATIAL & HYDRODYNAMIC DRIFT CONFIGURATION */}
          {(activeTab === 'all' || activeTab === 'gis') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#00D6A3]/10 text-[#00D6A3] border border-[#00D6A3]/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">Geospatial Datum &amp; Drift Parameters</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">LAGRANGIAN RUNGE-KUTTA 4TH ORDER INTEGRATION</span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#00D6A3]/10 text-[#00D6A3] border border-[#00D6A3]/20">
                  CRS: {settings.crs}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CRS Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-[#91A9BB] mb-1.5 uppercase tracking-wider">
                    Coordinate Reference System (CRS)
                  </label>
                  <select
                    value={settings.crs}
                    onChange={(e) => setSettings({ ...settings, crs: e.target.value })}
                    className="w-full bg-[#071D33] border border-[#16465A] rounded px-3 py-2 text-xs text-[#EAF6FF] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors cursor-pointer"
                  >
                    <option value="EPSG:4326">WGS84 (EPSG:4326) — Global Geodetic Spheroid</option>
                    <option value="EPSG:3857">EPSG:3857 — Spherical Pseudo-Mercator (Web Standard)</option>
                    <option value="EPSG:32760">UTM Zone 60S (EPSG:32760) — South Pacific Projected</option>
                  </select>
                </div>

                {/* Unit System */}
                <div>
                  <label className="block text-xs font-mono text-[#91A9BB] mb-1.5 uppercase tracking-wider">
                    Tactical Units
                  </label>
                  <select
                    value={settings.tacticalUnits}
                    onChange={(e) => setSettings({ ...settings, tacticalUnits: e.target.value })}
                    className="w-full bg-[#071D33] border border-[#16465A] rounded px-3 py-2 text-xs text-[#EAF6FF] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors cursor-pointer"
                  >
                    <option value="nm">NM / Knots / Meters</option>
                    <option value="km">Kilometers / m/s / Meters</option>
                    <option value="mi">Statute Miles / mph / Feet</option>
                  </select>
                </div>
              </div>

              {/* Drift Horizon & Default Basemap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#91A9BB] uppercase tracking-wider">Lagrangian Drift Horizon</span>
                    <span className="text-[#00E5FF] font-bold">{settings.driftHorizon} HOURS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {['24', '48', '72'].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setSettings({ ...settings, driftHorizon: hrs })}
                        className={`py-1.5 px-2 rounded font-bold transition-all cursor-pointer ${
                          settings.driftHorizon === hrs
                            ? 'bg-[#00E5FF] text-[#061522] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                            : 'bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF]'
                        }`}
                      >
                        {hrs} Hours
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#91A9BB]">4th-Order Runge-Kutta numerical path generation</span>
                </div>

                <div className="p-3.5 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#91A9BB] uppercase tracking-wider">Default Tactical Basemap</span>
                    <span className="text-[#00D6A3] font-bold uppercase">{settings.defaultBasemap.replace('_', ' ')}</span>
                  </div>
                  <select
                    value={settings.defaultBasemap}
                    onChange={(e) => setSettings({ ...settings, defaultBasemap: e.target.value })}
                    className="w-full bg-[#103B50] border border-[#16465A] rounded px-2.5 py-1.5 text-xs text-[#EAF6FF] font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="hydro_dark">Hydrographic Dark Marine</option>
                    <option value="sar_radar">SAR Microwave Radar</option>
                    <option value="bathymetry">GEBCO Bathymetry Contours</option>
                  </select>
                  <span className="text-[10px] text-[#91A9BB]">Preset loaded across GIS Dashboard and Ocean Map</span>
                </div>
              </div>

              {/* Layer Checkboxes Matrix */}
              <div>
                <label className="block text-xs font-mono text-[#91A9BB] mb-2 uppercase tracking-wider">
                  Tactical GIS Default Overlay Layers
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                  {[
                    { key: 'layerHycom', label: 'HYCOM Surface Currents' },
                    { key: 'layerEra5', label: 'ERA5 Wind Vectors' },
                    { key: 'layerWw3', label: 'WW3 Wave Swell' },
                    { key: 'layerGebco', label: 'GEBCO Bathymetry Contours' },
                    { key: 'layerCoral', label: 'Coral Sanctuary Polygon' },
                    { key: 'layerPins', label: 'Detection Pins & AIS Tracks' }
                  ].map((layer) => (
                    <label
                      key={layer.key}
                      className="flex items-center gap-2.5 p-2.5 rounded bg-[#071D33] border border-[#16465A] hover:border-[#00E5FF]/40 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={settings[layer.key]}
                        onChange={(e) => setSettings({ ...settings, [layer.key]: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-[#061522] border-[#16465A] text-[#00E5FF] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[#EAF6FF] text-[11px] truncate">{layer.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Monte Carlo Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#071D33] border border-[#16465A]">
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-semibold text-[#EAF6FF]">
                    Render 95% Confidence Drift Cone &amp; Dispersion Ellipse
                  </span>
                  <span className="text-[11px] text-[#91A9BB] mt-0.5">
                    Runs 500-particle Monte Carlo stochastic ensemble with turbulent eddy diffusion coefficient (Kh = 10 m²/s).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, monteCarloToggle: !settings.monteCarloToggle })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out border border-transparent ${
                    settings.monteCarloToggle ? 'bg-[#00E5FF]' : 'bg-[#16465A]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[#061522] shadow transition duration-200 ease-in-out ${
                      settings.monteCarloToggle ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* SECTION C: ALGORITHMIC RISK HEURISTICS */}
          {(activeTab === 'all' || activeTab === 'risk') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#FFB547]/10 text-[#FFB547] border border-[#FFB547]/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">ALDFG Risk Formulation &amp; Vulnerability Weights</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">PRIORITY SCORING EQUATION ENGINE</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#91A9BB]">TOTAL SUM:</span>
                  <span
                    className={`font-mono font-bold text-xs px-2.5 py-1 rounded border ${
                      totalWeight === 100
                        ? 'bg-[#00D6A3]/10 text-[#00D6A3] border-[#00D6A3]/30'
                        : 'bg-[#FF6B61]/10 text-[#FF6B61] border-[#FF6B61]/30'
                    }`}
                  >
                    {totalWeight}% {totalWeight === 100 ? '(BALANCED)' : '(UNBALANCED)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#071D33] border border-[#16465A] text-xs text-[#91A9BB] flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-[11px] text-[#75E6DA]">
                  Score = (W₁ · Habitat) + (W₂ · Entangle) + (W₃ · Drift) + (W₄ · Longevity)
                </div>
                <button
                  type="button"
                  onClick={resetWeightsToStandard}
                  className="font-mono text-xs text-[#00E5FF] hover:underline uppercase cursor-pointer"
                >
                  Reset IUCN Heuristic
                </button>
              </div>

              {/* 4 Interactive Weight Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* W1: Habitat */}
                <div className="p-3 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold">1. Habitat Proximity Index</span>
                    <span className="font-mono text-[#00E5FF] font-bold">{settings.weightHabitat}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={settings.weightHabitat}
                    onChange={(e) => setSettings({ ...settings, weightHabitat: parseInt(e.target.value) })}
                    className="w-full accent-[#00E5FF] bg-[#16465A] h-1.5 rounded cursor-pointer"
                  />
                  <span className="text-[10px] text-[#91A9BB]">Priority to Acropora Coral Sanctuaries &amp; turtle corridors.</span>
                </div>

                {/* W2: Entanglement */}
                <div className="p-3 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold">2. Entanglement Hazard</span>
                    <span className="font-mono text-[#00E5FF] font-bold">{settings.weightEntanglement}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={settings.weightEntanglement}
                    onChange={(e) => setSettings({ ...settings, weightEntanglement: parseInt(e.target.value) })}
                    className="w-full accent-[#00E5FF] bg-[#16465A] h-1.5 rounded cursor-pointer"
                  />
                  <span className="text-[10px] text-[#91A9BB]">Mesh aperture, monofilament gauge, leadline anchor mass.</span>
                </div>

                {/* W3: Drift Exposure */}
                <div className="p-3 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold">3. Hydrodynamic Drift Exposure</span>
                    <span className="font-mono text-[#00E5FF] font-bold">{settings.weightDrift}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={settings.weightDrift}
                    onChange={(e) => setSettings({ ...settings, weightDrift: parseInt(e.target.value) })}
                    className="w-full accent-[#00E5FF] bg-[#16465A] h-1.5 rounded cursor-pointer"
                  />
                  <span className="text-[10px] text-[#91A9BB]">Nearshore current velocity &amp; tidal surge translation velocity.</span>
                </div>

                {/* W4: Mass & Longevity */}
                <div className="p-3 bg-[#071D33] rounded-lg border border-[#16465A] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#EAF6FF] font-semibold">4. Mass &amp; Longevity Persistence</span>
                    <span className="font-mono text-[#00E5FF] font-bold">{settings.weightLongevity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={settings.weightLongevity}
                    onChange={(e) => setSettings({ ...settings, weightLongevity: parseInt(e.target.value) })}
                    className="w-full accent-[#00E5FF] bg-[#16465A] h-1.5 rounded cursor-pointer"
                  />
                  <span className="text-[10px] text-[#91A9BB]">Biofouling ballast load &amp; polymer solar UV embrittlement rate.</span>
                </div>
              </div>

              {/* Classification Tiers */}
              <div>
                <label className="block text-xs font-mono text-[#91A9BB] mb-2 uppercase tracking-wider">
                  Classification Tiers &amp; Automatic Operational Protocols
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded bg-[#FF6B61]/10 border border-[#FF6B61]/30 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#FF6B61] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#FF6B61]" />
                      <span>CRITICAL (85–100)</span>
                    </div>
                    <span className="text-[10px] text-[#91A9BB] mt-1">Immediate Salvage Dispatch</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#FFB547]/10 border border-[#FFB547]/30 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#FFB547] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#FFB547]" />
                      <span>HIGH (65–84)</span>
                    </div>
                    <span className="text-[10px] text-[#91A9BB] mt-1">24h Task Force Assignment</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#00D6A3]/10 border border-[#00D6A3]/30 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#00D6A3] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
                      <span>MEDIUM (40–64)</span>
                    </div>
                    <span className="text-[10px] text-[#91A9BB] mt-1">48h Verification Route</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#071D33] border border-[#16465A] flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#91A9BB] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#91A9BB]" />
                      <span>LOW (&lt;40)</span>
                    </div>
                    <span className="text-[10px] text-[#91A9BB] mt-1">Nominal Passive Monitoring</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: GATEWAYS, ALERTS, DATABASE & PROFILE (SPAN 5) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* SECTION D: ENVIRONMENTAL TELEMETRY GATEWAYS */}
          {(activeTab === 'all' || activeTab === 'gateways') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    <Satellite className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">Environmental Data Gateways</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">NETCDF / OPENDAP / REST CONSUMPTION</span>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-[#91A9BB]" title="Encrypted Environment Secrets" />
              </div>

              <div className="text-[11px] font-mono text-[#91A9BB] bg-[#071D33] p-2.5 rounded border border-[#16465A] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
                <span>Tokens sealed via HashiCorp Vault. Ingestion rate-limits cached.</span>
              </div>

              {/* Provider List */}
              <div className="space-y-2.5">
                {[
                  {
                    id: 'hycom',
                    name: 'HYCOM Global Ocean Currents',
                    meta: 'OPeNDAP 0.08° • Sync: 14m ago (6h cycle)',
                    statusColor: 'bg-[#00D6A3]',
                    actionLabel: 'Ping API'
                  },
                  {
                    id: 'era5',
                    name: 'ECMWF ERA5 Atmospheric Winds',
                    meta: 'Copernicus CDS • Sync: 32m ago (Hourly)',
                    statusColor: 'bg-[#00D6A3]',
                    actionLabel: 'Ping API'
                  },
                  {
                    id: 'ww3',
                    name: 'NOAA WaveWatch III (WW3)',
                    meta: 'NCEP NOMADS • Sync: 58m ago (6h cycle)',
                    statusColor: 'bg-[#00D6A3]',
                    actionLabel: 'Ping API'
                  },
                  {
                    id: 'gebco',
                    name: 'GEBCO 2024 Bathymetric Grid',
                    meta: 'Static 15-ArcSec Cache • 1.2 GB local volume',
                    statusColor: 'bg-[#00E5FF]',
                    actionLabel: 'Re-index'
                  },
                  {
                    id: 'sentinel2',
                    name: 'Copernicus Sentinel-2 Swath',
                    meta: 'SIMULATED AOI (+6h Latent / Cloud: 12%)',
                    statusColor: 'bg-[#FFB547]',
                    actionLabel: 'Test Link'
                  },
                  {
                    id: 'rov03',
                    name: 'ROV-03 Optical Drone Telemetry',
                    meta: 'STANDBY • gRPC port: 8501 • Tavaru Mooring',
                    statusColor: 'bg-[#91A9BB]',
                    actionLabel: 'Ping Node'
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#071D33] border border-[#16465A] hover:border-[#103B50] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${item.statusColor} flex-shrink-0 shadow-[0_0_6px_rgba(0,214,163,0.6)]`} />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-[#EAF6FF] truncate">{item.name}</div>
                        <div className="text-[10px] text-[#91A9BB] font-mono truncate">{item.meta}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingGateway === item.id}
                      onClick={() => testGatewayPing(item.id, item.name)}
                      className="px-2.5 py-1 rounded bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] font-mono text-[11px] border border-[#16465A] transition-colors cursor-pointer flex-shrink-0"
                    >
                      {testingGateway === item.id ? 'Testing...' : item.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION E: TELEMETRY ALERTING & DISPATCH HOOKS */}
          {(activeTab === 'all' || activeTab === 'profile') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">Operational Alerts &amp; Dispatch Hooks</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">EVENT-DRIVEN INCIDENT ESCALATION</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'alertCriticalEntanglement',
                    label: 'Critical Entanglement Alert (>85 or Coral <1 NM)',
                    desc: 'Immediate visual strobe & bridge dispatch sound',
                    icon: AlertTriangle
                  },
                  {
                    key: 'alertBiologistValidation',
                    label: 'Marine Biologist Ground-Truth Confirmations',
                    desc: 'Notify when manual observation tagged as verified',
                    icon: Check
                  },
                  {
                    key: 'alertIngestionLatency',
                    label: 'Worker Latency & Ingestion Degradation (>450ms)',
                    desc: 'System telemetry warning for dropped hydro packets',
                    icon: Activity
                  },
                  {
                    key: 'alertLowRiskSightings',
                    label: 'Low-Risk Debris Sightings (<35 Score)',
                    desc: 'Suppress routine logs to prevent notification fatigue',
                    icon: Eye
                  }
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#071D33] border border-[#16465A]"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-mono text-xs text-[#EAF6FF] font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-[#91A9BB]">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                        settings[item.key] ? 'bg-[#00E5FF]' : 'bg-[#16465A]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#061522] shadow mt-0.5 ml-0.5 transition duration-200 ${
                          settings[item.key] ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Sound & Quiet Period */}
              <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-xs">
                <div className="p-2.5 rounded bg-[#071D33] border border-[#16465A] flex items-center justify-between">
                  <div>
                    <span className="text-[#91A9BB] uppercase text-[10px] block">Audio Delivery</span>
                    <span className="text-[#EAF6FF]">{settings.soundAlerts ? 'WebAudio Ping' : 'Muted'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, soundAlerts: !settings.soundAlerts })}
                    className="p-1.5 rounded bg-[#0B2638] text-[#00E5FF] hover:bg-[#103B50] cursor-pointer"
                  >
                    {settings.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#91A9BB]" />}
                  </button>
                </div>

                <div className="p-2.5 rounded bg-[#071D33] border border-[#16465A]">
                  <span className="text-[#91A9BB] uppercase text-[10px] block">Auto-Sync Cycle</span>
                  <select
                    value={settings.autoSyncInterval}
                    onChange={(e) => setSettings({ ...settings, autoSyncInterval: e.target.value })}
                    className="bg-transparent text-[#00E5FF] font-mono text-xs focus:outline-none cursor-pointer mt-0.5 w-full"
                  >
                    <option value="15s" className="bg-[#071D33]">Every 15 Seconds</option>
                    <option value="30s" className="bg-[#071D33]">Every 30 Seconds</option>
                    <option value="60s" className="bg-[#071D33]">Every 60 Seconds</option>
                    <option value="manual" className="bg-[#071D33]">Manual Refresh Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION F: USER PROFILE & DATABASE HEALTH */}
          {(activeTab === 'all' || activeTab === 'profile') && (
            <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#EAF6FF] tracking-wide">Operator Profile &amp; Nodes</h2>
                    <span className="text-[11px] font-mono text-[#91A9BB]">AUTHENTICATED SCIENTIFIC OPERATOR</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#00D6A3] px-2 py-0.5 rounded bg-[#00D6A3]/10 border border-[#00D6A3]/30">
                  ACTIVE
                </span>
              </div>

              {/* Profile Card */}
              <div className="p-4 rounded-lg bg-[#071D33] border border-[#16465A] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00E5FF]/15 border-2 border-[#00E5FF] flex items-center justify-center font-mono font-bold text-base text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                  CE
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#EAF6FF]">Chief Engineer (CE)</div>
                  <div className="text-xs text-[#00E5FF] font-mono">Lead Marine GIS &amp; AI Systems Architect</div>
                  <div className="text-[11px] text-[#91A9BB] font-mono mt-0.5">Role: Principal Operations Administrator • Clearance: Tier 3 Tactical</div>
                </div>
              </div>

              {/* Database Telemetry */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded bg-[#071D33] border border-[#16465A]">
                  <div className="text-[#91A9BB] text-[10px] uppercase">PostGIS Storage Pool</div>
                  <div className="text-[#EAF6FF] font-bold text-sm mt-0.5">8 / 30 Connections</div>
                  <div className="text-[10px] text-[#00D6A3]">Latency: 12.1 ms (p99)</div>
                </div>
                <div className="p-3 rounded bg-[#071D33] border border-[#16465A]">
                  <div className="text-[#91A9BB] text-[10px] uppercase">Storage Allocation</div>
                  <div className="text-[#EAF6FF] font-bold text-sm mt-0.5">14.8 GB / 100 GB</div>
                  <div className="text-[10px] text-[#91A9BB]">148 GeoJSONs, 12 NetCDF</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
