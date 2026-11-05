import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/ngo/EmptyState';
import { getReports, getDashboardStats } from '../../services/ngoService';
import { exportIncidentReportPdf } from '../../services/pdfExportService';

/**
 * Screen 3 — Incident Management & Verification
 * Converted directly from Stitch designs (screen_3_incident_management_verification)
 * Connected to live FastAPI + PostgreSQL backend.
 * Conforms strictly to Requirement 9: No fictional or fabricated sample records.
 */
export const IncidentManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gearFilter, setGearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [incidents, setIncidents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [metrics, setMetrics] = useState({
    pending: 0,
    verified: 0,
    inReview: 0,
    resolved: 0,
  });

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReports({
        status: statusFilter,
        gearType: gearFilter,
        search: searchTerm,
        page: 1,
        pageSize: 50,
      });
      setIncidents(data.items || []);
      setTotalCount(data.total || 0);

      // Load metric strip counts
      const stats = await getDashboardStats().catch(() => null);
      if (stats) {
        setMetrics({
          pending: stats.pending_reports || 0,
          verified: stats.verified_reports || 0,
          inReview: stats.in_review_reports || 0,
          resolved: stats.resolved_reports || 0,
        });
      }
    } catch (err) {
      console.warn('Backend unavailable for incident ledger:', err.message);
      setError('Backend service is currently offline or unreachable on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [gearFilter, statusFilter, searchTerm]);

  const handleExportCsv = () => {
    if (incidents.length === 0) {
      alert('Incident log export: No incident records currently cataloged in database.');
      return;
    }
    const headers = ['ID', 'Gear Type', 'Status', 'Latitude', 'Longitude', 'Reported At', 'Description'];
    const rows = incidents.map((i) => [
      i.id,
      i.gear_type,
      i.status,
      i.latitude,
      i.longitude,
      i.reported_at,
      `"${(i.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `oceanrescue_incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = async () => {
    if (incidents.length === 0) {
      alert('Incident report export: No incident records currently match your query.');
      return;
    }
    try {
      setExportingPdf(true);
      await exportIncidentReportPdf({
        incidents,
        metrics,
        filters: {
          status: statusFilter,
          gearType: gearFilter,
          search: searchTerm,
        },
      });
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      alert(`PDF report export failed: ${err.message}`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Operational Header Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1 text-xs font-mono">
            <span className="uppercase text-[#087E8B] font-semibold">Incident Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">ALDFG Telemetry Review</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#173B4D] tracking-tight">
            Incident Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Review, verify, and validate reported abandoned, lost, or discarded fishing gear vectors.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadIncidents}
            className="h-9 px-3 rounded-lg bg-white text-slate-700 border border-[#D8ECEC] hover:bg-[#F2FAFA] transition-colors text-xs font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#087E8B] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-lg bg-white text-[#087E8B] border border-[#D8ECEC] hover:bg-[#F2FAFA] transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087E8B]"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Export Log (CSV)</span>
          </button>

          <button
            type="button"
            id="export-incident-report-pdf-btn"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="h-9 px-3.5 rounded-lg bg-white text-[#087E8B] border border-[#D8ECEC] hover:bg-[#F2FAFA] transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087E8B] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#087E8B] border-t-transparent rounded-full animate-spin"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px] text-rose-600">picture_as_pdf</span>
                <span>Export Report (PDF)</span>
              </>
            )}
          </button>

          <Link
            to="/ngo/map"
            className="h-9 px-3.5 rounded-lg bg-white text-[#087E8B] border border-[#D8ECEC] hover:bg-[#F2FAFA] transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#087E8B]"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Verified Map</span>
          </Link>


          <Link
            to="/report-gear"
            className="h-9 px-4 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00C9C1]"
          >
            <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
            <span>Manual Incident Entry</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-600">info</span>
            <span>{error}</span>
          </div>
          <button
            onClick={loadIncidents}
            className="underline font-bold hover:text-amber-950 text-xs cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Operational Metrics Ticker Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
              Pending Intake
            </span>
            <span className="text-2xl font-bold font-display text-[#173B4D] mt-1">
              {metrics.pending}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Triage Required</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#EAF7F7] flex items-center justify-center text-[#087E8B]">
            <span className="material-symbols-outlined text-[20px]">assignment_late</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
              Verified Vectors
            </span>
            <span className="text-2xl font-bold font-display text-[#075E63] mt-1">
              {metrics.verified}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Telemetry Cleared</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-[#075E63]">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
              In Review
            </span>
            <span className="text-2xl font-bold font-display text-[#087E8B] mt-1">
              {metrics.inReview}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Drift Analysis</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F2FAFA] flex items-center justify-center text-[#087E8B]">
            <span className="material-symbols-outlined text-[20px]">insights</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
              Cleared &amp; Retrieved
            </span>
            <span className="text-2xl font-bold font-display text-emerald-700 mt-1">
              {metrics.resolved}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Salvage Complete</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Main Incident Ledger Panel */}
      <div className="bg-white rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col overflow-hidden">
        {/* Filters Row */}
        <div className="p-4 border-b border-[#D8ECEC] bg-[#F2FAFA]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by keywords, gear type, notes..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-[#D8ECEC] text-xs text-[#173B4D] placeholder:text-slate-400 focus:outline-none focus:border-[#00C9C1] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={gearFilter}
              onChange={(e) => setGearFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white border border-[#D8ECEC] text-xs text-[#173B4D] font-medium focus:outline-none focus:border-[#00C9C1] cursor-pointer"
            >
              <option value="ALL">All Gear Types</option>
              <option value="gillnet">Gillnets</option>
              <option value="trawl_net">Trawl Nets</option>
              <option value="crab_pot">Crab &amp; Lobster Pots</option>
              <option value="longline">Longlines</option>
              <option value="fad">FAD Bundles</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white border border-[#D8ECEC] text-xs text-[#173B4D] font-medium focus:outline-none focus:border-[#00C9C1] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="reported">Reported (Pending Triage)</option>
              <option value="verified">Verified</option>
              <option value="in_review">In Review</option>
              <option value="scheduled_recovery">Scheduled Recovery</option>
              <option value="resolved">Resolved / Cleared</option>
            </select>
          </div>
        </div>

        {/* Incidents Table / Empty State */}
        {incidents.length === 0 ? (
          <div className="p-6 sm:p-10">
            <EmptyState
              icon="assignment"
              title="No Incident Reports Available"
              description="No lost or abandoned fishing gear reports currently match your query in the operational database. Citizen mariner reports submitted through the public portal will appear here for verification."
              actionText="Submit Lost Gear Report"
              actionLink="/report-gear"
              secondaryNote="Fabricated records are omitted in compliance with platform integrity guidelines."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#F2FAFA] border-b border-[#D8ECEC] text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">INCIDENT ID</th>
                  <th className="py-3 px-4">GEAR CLASSIFICATION</th>
                  <th className="py-3 px-4">COORDINATES</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">REPORTED AT</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EFEF]">
                {incidents.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F2FAFA]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#087E8B]">
                      #{row.id}
                    </td>
                    <td className="py-3 px-4 text-[#173B4D] font-medium capitalize">
                      {row.gear_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {row.latitude.toFixed(4)}° N, {row.longitude >= 0 ? `${row.longitude.toFixed(4)}° E` : `${Math.abs(row.longitude).toFixed(4)}° W`}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EAF7F7] text-[#087E8B] border border-[#D8ECEC]">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(row.reported_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/ngo/incidents/${row.id}`}
                        className="px-2.5 py-1 rounded bg-white border border-[#D8ECEC] text-[#087E8B] hover:bg-[#F2FAFA] transition-colors font-medium text-[11px]"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentManagement;
