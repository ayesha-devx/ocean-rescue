import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/ngo/EmptyState';
import { getReports } from '../../services/ngoService';

/**
 * Screen — NGO Report Management: All Reports
 * Module: Unified ledger for GPS-Based and Manual Location reports.
 * Allows filtering by reporting method and verification status.
 * Links directly to the existing Incident Details page for verification review.
 */
export const AllReports = () => {
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [methodFilter, setMethodFilter] = useState('ALL'); // ALL, GPS, MANUAL
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, reported, verified, rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        pageSize,
        search: searchQuery.trim() || null,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (methodFilter !== 'ALL') {
        params.reportingMethod = methodFilter.toLowerCase();
      }

      const data = await getReports(params);
      setReports(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.warn('Failed to load reports ledger:', err.message);
      setError('Unable to fetch reports. Backend service may be offline or unreachable on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [methodFilter, statusFilter, searchQuery, page]);

  const formatCoords = (lat, lon) => {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return 'N/A';
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
  };

  const getMethodBadge = (report) => {
    const method = (report.reporting_method || '').toLowerCase();
    const locType = (report.location_type || '').toLowerCase();
    const radius = report.location_uncertainty_radius_m;

    if (method === 'manual' || locType === 'estimated') {
      const radiusLabel = radius ? ` ±${radius >= 1000 ? (radius / 1000).toFixed(1) + ' km' : Math.round(radius) + 'm'}` : '';
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <span className="material-symbols-outlined text-[14px] text-amber-600">map</span>
          <span>Manual Estimated{radiusLabel}</span>
        </span>
      );
    }

    if (method === 'gps' || locType === 'exact') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-300">
          <span className="material-symbols-outlined text-[14px] text-sky-600">my_location</span>
          <span>GPS Waypoint</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="material-symbols-outlined text-[14px] text-slate-500">history</span>
        <span>Legacy Record</span>
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </span>
        );
      case 'in_review':
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Review
          </span>
        );
      case 'scheduled_recovery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Salvage Scheduled
          </span>
        );
      case 'resolved':
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Recovered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8ECEC]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase text-[#087E8B] tracking-wider">
              Report Management
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-slate-500">
              Unified Mariner Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#173B4D]">
            All Citizen &amp; Mariner Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Central repository of all submitted fishing gear loss reports across GPS-based and manual location methods. Inspect records and transition verification statuses in Incident Details.
          </p>
        </div>

        {/* Quick Link to Public Intake */}
        <div className="flex items-center gap-2">
          <Link
            to="/report-gear"
            className="px-3.5 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
            <span>Public Intake Selector</span>
          </Link>
        </div>
      </div>

      {/* Filter Control Strip */}
      <div className="bg-white rounded-xl border border-[#D8ECEC] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Method Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="methodFilter" className="text-xs font-mono text-slate-600 font-semibold">
              Method:
            </label>
            <select
              id="methodFilter"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg text-xs font-medium text-[#173B4D] focus:outline-none focus:border-[#00C9C1]"
            >
              <option value="ALL">All Reports</option>
              <option value="GPS">GPS-Based</option>
              <option value="MANUAL">Manual Location</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="statusFilter" className="text-xs font-mono text-slate-600 font-semibold">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg text-xs font-medium text-[#173B4D] focus:outline-none focus:border-[#00C9C1]"
            >
              <option value="ALL">All Statuses</option>
              <option value="reported">Pending Verification</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved / Recovered</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search gear, description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-8 pr-3 w-48 sm:w-60 bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg text-xs text-[#173B4D] placeholder-slate-400 focus:outline-none focus:border-[#00C9C1]"
            />
          </div>
        </div>

        {/* Counter Badge */}
        <div className="text-xs font-mono text-slate-500">
          Showing <strong className="text-[#173B4D]">{reports.length}</strong> of{' '}
          <strong className="text-[#173B4D]">{totalCount}</strong> cataloged reports
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-700 text-lg">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-[#D8ECEC] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <span className="material-symbols-outlined text-[#087E8B] text-4xl animate-spin mb-2">
              progress_activity
            </span>
            <span className="text-xs font-mono">Loading report registry...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon="inventory_2"
              title="No Reports Match Query"
              description="No fishing gear loss reports currently match the selected reporting method or status filter criteria."
              actionText="Reset Filters"
              actionClick={() => {
                setMethodFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2FAFA] border-b border-[#D8ECEC] font-mono text-[11px] uppercase text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Dossier ID</th>
                  <th className="py-3 px-4">Method &amp; Location Fix</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Reporter &amp; Vessel</th>
                  <th className="py-3 px-4">Gear Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8ECEC] text-slate-700">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-[#F2FAFA]/50 transition-colors"
                  >
                    {/* Dossier ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#173B4D]">
                      #{report.id}
                    </td>

                    {/* Method & Location Type */}
                    <td className="py-3.5 px-4">
                      {getMethodBadge(report)}
                      {report.approximate_area && (
                        <span className="block text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                          {report.approximate_area}
                        </span>
                      )}
                    </td>

                    {/* Coordinates */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#173B4D]">
                      {formatCoords(report.latitude, report.longitude)}
                    </td>

                    {/* Reporter & Vessel Contact */}
                    <td className="py-3.5 px-4">
                      {report.reporter_name ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span>{report.reporter_name}</span>
                            {report.reporter_role && (
                              <span className="text-[10px] text-slate-500 font-normal">({report.reporter_role})</span>
                            )}
                          </div>
                          {report.reporter_phone && (
                            <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-[#087E8B]">call</span>
                              <span>{report.reporter_phone}</span>
                            </div>
                          )}
                          {report.vessel_name && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[180px]">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">directions_boat</span>
                              <span>{report.vessel_name}{report.vessel_type ? ` • ${report.vessel_type}` : ''}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unrecorded / Legacy</span>
                      )}
                    </td>

                    {/* Gear Details & Quantity */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#173B4D] capitalize block">
                        {report.gear_type.replace(/_/g, ' ')}
                      </span>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>Qty: <strong>{report.gear_quantity || 1}</strong></span>
                        {report.gear_markings && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]" title={report.gear_markings}>
                              {report.gear_markings}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(report.status)}
                    </td>

                    {/* Reported Time */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {report.loss_date_time
                        ? new Date(report.loss_date_time).toLocaleDateString()
                        : new Date(report.reported_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/ngo/incidents/${report.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] hover:border-[#00C9C1] hover:bg-[#F2FAFA] text-[#087E8B] text-xs font-semibold transition-all shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>Review</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Strip */}
        {totalCount > pageSize && (
          <div className="p-3 bg-[#F2FAFA] border-t border-[#D8ECEC] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-white border border-[#D8ECEC] text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= Math.ceil(totalCount / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-white border border-[#D8ECEC] text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReports;

