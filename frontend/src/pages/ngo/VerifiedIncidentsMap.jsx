import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import EmptyState from '../../components/ngo/EmptyState';
import { getReports } from '../../services/ngoService';
import { API_BASE_URL } from '../../services/api';
import { setStoredIncidentId } from '../../utils/incidentStorage';

/**
 * Approximate pilot coordinates for Mirkarwada Fishing Harbour, Ratnagiri, Maharashtra, India.
 * Note: These coordinates are for pilot area benchmarking only.
 * Markers always use submitted coordinates from actual incident reports.
 */
const PILOT_COORDINATES = {
  lat: 16.99,
  lng: 73.30,
  name: 'Mirkarwada Fishing Harbour',
  region: 'Ratnagiri, Maharashtra, India',
};

/**
 * Coordinate validator utility.
 * Ensures coordinates are valid numeric WGS84 latitude (-90 to 90) and longitude (-180 to 180).
 */
export function isValidCoordinate(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return false;
  const numLat = Number(lat);
  const numLon = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return false;
  if (numLat < -90 || numLat > 90) return false;
  if (numLon < -180 || numLon > 180) return false;
  return true;
}

/**
 * Formats coordinates into readable WGS84 nautical degrees.
 */
function formatCoordinates(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
}

/**
 * Custom Leaflet DivIcon for Reported Loss Locations.
 * Uses OceanRescue branding with pulsing halo.
 */
function createReportedLocationIcon(isSelected = false) {
  return L.divIcon({
    className: 'custom-reported-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${
          isSelected ? 'rgba(245, 158, 11, 0.45)' : 'rgba(0, 201, 193, 0.35)'
        }; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background-color: ${
          isSelected ? '#F59E0B' : '#087E8B'
        }; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(23, 59, 77, 0.35); display: flex; align-items: center; justify-content: center; color: white;">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

/**
 * Custom Leaflet DivIcon for Mirkarwada Pilot Harbour Benchmark.
 */
const pilotHarbourIcon = L.divIcon({
  className: 'custom-pilot-marker',
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 8px; background-color: #173B4D; border: 2px solid #00C9C1; box-shadow: 0 4px 8px rgba(23, 59, 77, 0.3); display: flex; align-items: center; justify-content: center; color: #00C9C1;">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v20m0 0a8 8 0 01-8-8h2a6 6 0 0012 0h2a8 8 0 01-8 8zm0-16a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

/**
 * Map controller helper to smoothly animate zoom and center changes.
 */
function MapController({ selectedCoords, boundsTarget, pilotCoords }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords && isValidCoordinate(selectedCoords[0], selectedCoords[1])) {
      map.flyTo(selectedCoords, 14, { duration: 1.2 });
    }
  }, [selectedCoords, map]);

  useEffect(() => {
    if (boundsTarget && boundsTarget.length > 0) {
      map.fitBounds(boundsTarget, { padding: [60, 60], maxZoom: 14 });
    }
  }, [boundsTarget, map]);

  return null;
}

/**
 * Screen — Verified Incident Location Map
 * Module: Geospatial visualization of NGO-approved mariner reports.
 * Conforms to all OceanRescue pilot requirements.
 */
export const VerifiedIncidentsMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParamId = searchParams.get('selected');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState(
    selectedParamId ? Number(selectedParamId) : null
  );
  const [gearFilter, setGearFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [flyToBoundsTrigger, setFlyToBoundsTrigger] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);

  const markerRefs = useRef({});

  // 1. Fetch only verified / approved reports from backend
  const loadVerifiedReports = async () => {
    try {
      setLoading(true);
      setError(null);
      // Query reports with status='verified'
      const data = await getReports({
        status: 'verified',
        page: 1,
        pageSize: 100,
      });
      setReports(data.items || []);
    } catch (err) {
      console.warn('Failed to load verified incident telemetry:', err.message);
      setError('Unable to reach backend operations service. Please check server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifiedReports();
  }, []);

  // 2. Separate valid vs invalid coordinates
  const { validReports, invalidReports } = useMemo(() => {
    const valid = [];
    const invalid = [];
    reports.forEach((rep) => {
      if (isValidCoordinate(rep.latitude, rep.longitude)) {
        valid.push(rep);
      } else {
        invalid.push(rep);
      }
    });
    return { validReports: valid, invalidReports: invalid };
  }, [reports]);

  // 3. Filter reports by gear and search term for list view
  const filteredReports = useMemo(() => {
    return validReports.filter((rep) => {
      const matchGear =
        gearFilter === 'ALL' || rep.gear_type.toLowerCase() === gearFilter.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        String(rep.id).includes(searchQuery.trim()) ||
        rep.gear_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rep.description && rep.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGear && matchSearch;
    });
  }, [validReports, gearFilter, searchQuery]);

  // 4. Handle initial selection from URL param if available
  useEffect(() => {
    if (selectedParamId && validReports.length > 0) {
      const targetId = Number(selectedParamId);
      const target = validReports.find((r) => r.id === targetId);
      if (target) {
        setSelectedIncidentId(targetId);
        setFlyToCoords([target.latitude, target.longitude]);
        setTimeout(() => {
          markerRefs.current[targetId]?.openPopup();
        }, 500);
      }
    }
  }, [selectedParamId, validReports]);

  // Handle selecting an incident from the compact ledger
  const handleSelectIncident = (report) => {
    setSelectedIncidentId(report.id);
    setStoredIncidentId(report.id);
    setFlyToCoords([report.latitude, report.longitude]);
    setSearchParams({ selected: report.id });
    setTimeout(() => {
      markerRefs.current[report.id]?.openPopup();
    }, 400);
  };

  // Zoom to Mirkarwada Pilot Harbour
  const handleResetToPilot = () => {
    setSelectedIncidentId(null);
    setFlyToCoords([PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]);
  };

  // Fit all markers
  const handleFitAll = () => {
    if (validReports.length === 0) {
      handleResetToPilot();
      return;
    }
    const bounds = validReports.map((r) => [r.latitude, r.longitude]);
    bounds.push([PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]);
    setFlyToBoundsTrigger(bounds);
  };

  return (
    <div className="flex flex-col w-full gap-6 ocean-leaflet-map">
      {/* Operational Breadcrumb & Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span className="uppercase text-[#087E8B] font-semibold">Operations</span>
            <span>/</span>
            <span className="text-slate-400">Spatial Intelligence</span>
            <span>/</span>
            <span className="text-[#173B4D] font-bold">Verified Loss Telemetry</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#173B4D] tracking-tight">
              Verified Incident Location Map
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7F7] border border-[#00C9C1]/40 text-[#087E8B] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C9C1] animate-pulse"></span>
              <span>Approved GPS Telemetry</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Geospatial coordinates of mariner lost gear reports validated through the NGO review workflow.
            Pilot benchmark sector: <strong className="text-[#173B4D]">Mirkarwada Fishing Harbour, Ratnagiri</strong>.
          </p>
        </div>

        {/* Global Map Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          <button
            type="button"
            onClick={loadVerifiedReports}
            title="Refresh verified incident records from backend"
            className="h-9 px-3 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-slate-700 text-xs font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#087E8B] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleResetToPilot}
            title="Recenter on Mirkarwada Pilot Harbour benchmark"
            className="h-9 px-3 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-[#087E8B] text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">anchor</span>
            <span>Pilot Base</span>
          </button>

          <button
            type="button"
            onClick={handleFitAll}
            title="Fit map view to all verified markers"
            className="h-9 px-3.5 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">crop_free</span>
            <span>Fit All ({validReports.length})</span>
          </button>
        </div>
      </div>

      {/* Critical Geographic Telemetry Distinction Advisory */}
      <div className="p-3.5 rounded-xl bg-[#F2FAFA] border border-[#00C9C1]/30 text-xs flex items-start gap-3 shadow-2xs">
        <span className="material-symbols-outlined text-[#087E8B] text-lg mt-0.5 flex-shrink-0">
          info
        </span>
        <div className="flex flex-col gap-0.5 leading-relaxed text-[#173B4D]">
          <span className="font-bold font-mono uppercase text-[11px] text-[#087E8B] tracking-wider">
            Important Geographic Telemetry Distinction
          </span>
          <p className="text-slate-600 text-xs">
            Markers on this map indicate the <strong>Reported Loss Location</strong> submitted by mariners and validated through the NGO report review process. NGO approval confirms the citizen report according to verification criteria; it does not guarantee that the physical gear location has been independently confirmed at sea.
            <span className="block mt-1 text-slate-500 font-mono text-[11px]">
              Hydrodynamic drift trajectories and dispersal paths will be simulated in the downstream drift forecasting module.
            </span>
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-600">warning</span>
            <span>{error}</span>
          </div>
          <button
            onClick={loadVerifiedReports}
            className="underline font-bold hover:text-amber-950 text-xs cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Invalid Coordinates Alert */}
      {invalidReports.length > 0 && (
        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-orange-600">location_off</span>
            <span>
              {invalidReports.length} approved incident report(s) skipped from map due to missing or invalid GPS coordinates.
            </span>
          </div>
          <Link
            to="/ngo/incidents"
            className="underline font-semibold hover:text-orange-950 text-xs"
          >
            Audit Coordinates
          </Link>
        </div>
      )}

      {/* Main 12-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Interactive Leaflet Map */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[580px] rounded-xl overflow-hidden border border-[#D8ECEC] bg-white shadow-xs">
            {loading && reports.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#F2FAFA]">
                <span className="material-symbols-outlined text-[#087E8B] text-4xl animate-spin mb-3">
                  progress_activity
                </span>
                <span className="text-xs font-mono text-slate-500 font-medium">
                  Loading verified incident telemetry...
                </span>
              </div>
            ) : validReports.length === 0 && !loading ? (
              <div className="w-full h-full flex items-center justify-center p-6 bg-white">
                <EmptyState
                  icon="map"
                  title="No Verified Incident Locations"
                  description="There are currently no lost gear reports with 'verified' status in the operational database. When NGO field staff review and verify reports in Incident Management, their reported GPS coordinates will appear here."
                  actionText="Inspect Incident Queue"
                  actionLink="/ngo/incidents"
                  secondaryNote="Pilot Area Benchmark: Mirkarwada Fishing Harbour (16.99° N, 73.30° E)"
                />
              </div>
            ) : (
              <>
                <MapContainer
                  center={[PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]}
                  zoom={10}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                  style={{ minHeight: '580px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapController
                    selectedCoords={flyToCoords}
                    boundsTarget={flyToBoundsTrigger}
                    pilotCoords={[PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]}
                  />

                  {/* Pilot Area Harbour Benchmark Marker */}
                  <Marker
                    position={[PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]}
                    icon={pilotHarbourIcon}
                  >
                    <Popup>
                      <div className="p-3 flex flex-col gap-1.5 text-xs max-w-xs">
                        <div className="flex items-center gap-1.5 text-[#087E8B] font-mono font-bold text-[10px] uppercase">
                          <span className="material-symbols-outlined text-sm">anchor</span>
                          <span>Pilot Operational Harbour</span>
                        </div>
                        <h4 className="font-bold font-display text-sm text-[#173B4D]">
                          {PILOT_COORDINATES.name}
                        </h4>
                        <p className="text-slate-500 text-[11px]">
                          {PILOT_COORDINATES.region}
                        </p>
                        <div className="mt-1 p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC] font-mono text-[10px] text-slate-700">
                          Approx. Benchmark: {PILOT_COORDINATES.lat.toFixed(4)}° N, {PILOT_COORDINATES.lng.toFixed(4)}° E
                        </div>
                        <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">
                          Reference base point for pilot regional monitoring and salvage vessel mobilization.
                        </p>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
                      <span className="font-mono text-xs font-semibold text-[#173B4D]">
                        Pilot Base: {PILOT_COORDINATES.name}
                      </span>
                    </Tooltip>
                  </Marker>

                  {/* Verified Incident Report Markers */}
                  {validReports.map((report) => {
                    const isSelected = selectedIncidentId === report.id;
                    const coords = [report.latitude, report.longitude];

                    return (
                      <Marker
                        key={report.id}
                        position={coords}
                        icon={createReportedLocationIcon(isSelected)}
                        ref={(el) => {
                          if (el) markerRefs.current[report.id] = el;
                        }}
                        eventHandlers={{
                          click: () => {
                            setSelectedIncidentId(report.id);
                            setSearchParams({ selected: report.id });
                          },
                        }}
                      >
                        <Popup>
                          <div className="p-3.5 flex flex-col gap-2.5 text-xs max-w-sm">
                            {/* Header Badge */}
                            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EAF7F7] text-[#087E8B] border border-[#00C9C1]/30">
                                Reported Loss Location
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {report.status}
                              </span>
                            </div>

                            {/* Title & Classification */}
                            <div>
                              <h4 className="font-bold font-display text-base text-[#173B4D] capitalize">
                                {report.gear_type.replace('_', ' ')} Sighting #{report.id}
                              </h4>
                              <span className="font-mono text-[11px] text-slate-500">
                                Loss Date: {new Date(report.reported_at).toLocaleString()}
                              </span>
                            </div>

                            {/* Submitted Coordinates */}
                            <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-0.5 font-mono text-xs">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                Submitted GPS Telemetry
                              </span>
                              <span className="font-bold text-[#173B4D]">
                                {formatCoordinates(report.latitude, report.longitude)}
                              </span>
                            </div>

                            {/* Description Excerpt */}
                            {report.description && (
                              <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed italic bg-slate-50 p-2 rounded border border-slate-100">
                                &ldquo;{report.description}&rdquo;
                              </p>
                            )}

                            {/* Evidence Photo Preview if available */}
                            {report.image_url && (
                              <div className="rounded-lg overflow-hidden border border-[#D8ECEC] max-h-24 bg-slate-100">
                                <img
                                  src={
                                    report.image_url.startsWith('http://') || report.image_url.startsWith('https://')
                                      ? report.image_url
                                      : `${API_BASE_URL.replace(/\/+$/, '')}${report.image_url.startsWith('/') ? '' : '/'}${report.image_url}`
                                  }
                                  alt={`Evidence ${report.id}`}
                                  className="w-full h-24 object-cover"
                                />
                              </div>
                            )}

                            {/* Action Link */}
                            <div className="pt-1 flex items-center justify-between">
                              <Link
                                to={`/ngo/incidents/${report.id}`}
                                className="w-full py-1.5 px-3 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white text-center font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                              >
                                <span>Inspect Incident Details</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                              </Link>
                            </div>
                          </div>
                        </Popup>

                        <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
                          <div className="font-mono text-xs text-[#173B4D]">
                            <strong>Reported Loss Location</strong> — #{report.id} ({report.gear_type})
                          </div>
                        </Tooltip>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Floating Glassmorphism Map Legend */}
                <div className="absolute bottom-4 right-4 z-[1000] p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#D8ECEC] shadow-md text-xs font-mono flex flex-col gap-2 max-w-[270px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#D8ECEC]">
                    <span className="font-bold text-[#173B4D] uppercase text-[10px] tracking-wider">
                      Map Telemetry Legend
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#00C9C1]"></span>
                  </div>

                  {/* Reported Loss Location */}
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#087E8B] border border-white shadow-2xs flex-shrink-0 mt-0.5"></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#173B4D] text-[11px]">
                        Reported Loss Location
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Submitted mariner GPS, approved by NGO
                      </span>
                    </div>
                  </div>

                  {/* Future Drift Trajectory */}
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-1 border-t-2 border-dashed border-amber-500 flex-shrink-0 mt-2"></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-amber-700 text-[11px]">
                        Future Drift Prediction
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Downstream hydrodynamic drift vector
                      </span>
                    </div>
                  </div>

                  {/* Pilot Harbour Benchmark */}
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-[#173B4D] border border-[#00C9C1] flex-shrink-0 mt-0.5 flex items-center justify-center text-cyan-300">
                      <span className="material-symbols-outlined text-[10px]">anchor</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#173B4D] text-[11px]">
                        Pilot Operations Base
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Mirkarwada Harbour, Ratnagiri
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Compact Incident Selection Ledger */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC] mb-3">
              <div>
                <h3 className="text-sm font-bold font-display text-[#173B4D]">
                  Verified Incidents Queue
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {validReports.length} approved target{validReports.length === 1 ? '' : 's'} on map
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                VERIFIED
              </span>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-slate-400 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, gear type..."
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs text-[#173B4D] placeholder:text-slate-400 focus:outline-none focus:border-[#00C9C1]"
                />
              </div>

              <select
                value={gearFilter}
                onChange={(e) => setGearFilter(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#D8ECEC] text-xs text-[#173B4D] font-medium focus:outline-none focus:border-[#00C9C1] cursor-pointer"
              >
                <option value="ALL">All Gear Classifications</option>
                <option value="gillnet">Gillnets</option>
                <option value="trawl_net">Trawl Nets</option>
                <option value="crab_pot">Crab &amp; Lobster Pots</option>
                <option value="longline">Longlines</option>
                <option value="fad">FAD Bundles</option>
              </select>
            </div>

            {/* List of Verified Incidents */}
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredReports.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono bg-[#F2FAFA] rounded-lg border border-[#D8ECEC]">
                  No verified incidents match your current filter.
                </div>
              ) : (
                filteredReports.map((item) => {
                  const isSelected = selectedIncidentId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectIncident(item)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-[#EAF7F7] border-[#00C9C1] shadow-xs'
                          : 'bg-white border-[#D8ECEC] hover:bg-[#F2FAFA] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#087E8B]">
                            #{item.id}
                          </span>
                          <span className="font-semibold text-[#173B4D] capitalize">
                            {item.gear_type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Reported: {new Date(item.reported_at).toLocaleDateString()}</span>
                        <span className="text-[#087E8B] font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                          <span>Zoom to Pin</span>
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-600 bg-white/70 p-1.5 rounded border border-[#D8ECEC]/60 truncate">
                        {formatCoordinates(item.latitude, item.longitude)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Operations Actions */}
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-4 shadow-xs flex flex-col gap-2 text-xs">
            <span className="font-mono uppercase text-[10px] text-slate-500 font-bold">
              Related Workflows
            </span>
            <Link
              to="/ngo/incidents"
              className="flex items-center justify-between p-2 rounded-lg border border-[#D8ECEC] hover:bg-[#F2FAFA] text-[#173B4D] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-base">assignment</span>
                <span className="font-medium">Incident Review &amp; Triage</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">arrow_forward</span>
            </Link>

            <Link
              to={selectedIncidentId ? `/ngo/drift-forecasting?incidentId=${selectedIncidentId}` : "/ngo/drift-forecasting"}
              onClick={() => {
                if (selectedIncidentId) {
                  setStoredIncidentId(selectedIncidentId);
                }
              }}
              className="flex items-center justify-between p-2 rounded-lg border border-[#D8ECEC] hover:bg-[#F2FAFA] text-[#173B4D] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-base">explore</span>
                <span className="font-medium">
                  {selectedIncidentId ? `Model Drift for Incident #${selectedIncidentId}` : 'Drift Forecasting Module'}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifiedIncidentsMap;
