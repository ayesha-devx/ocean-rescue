import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import EmptyState from '../../components/ngo/EmptyState';
import {
  getRiskQueue,
  getIncidentRisk,
  evaluateIncidentRisk,
  getRiskWeights,
} from '../../services/riskService';
import {
  resolveInitialIncidentId,
  setStoredIncidentId,
} from '../../utils/incidentStorage';

/**
 * Screen 8 — Risk Prioritization (Decision Support System Algorithmic Ranker)
 * Integrates with OceanRescue multi-criteria assessment engine.
 * Fully transparent, explainable scoring normalized from 0 to 100.
 * Priority bands:
 * - Critical: 80–100
 * - High: 60–79
 * - Medium: 35–59
 * - Low: 0–34
 * Conforms to scientific integrity: distinguishes model estimates from physical ground truth.
 */

// Helper to safely extract factor metrics regardless of backend field naming
const getFactorDisplay = (factor) => {
  if (!factor) return null;
  const points = factor.points ?? factor.points_awarded ?? 0;
  const maxPoints = factor.max_points ?? 1;
  const weight = factor.weight_pct ?? (factor.weight != null ? factor.weight * 100 : 0);
  const details = factor.details ?? factor.description ?? '';
  const percent = maxPoints > 0 ? Math.min(100, Math.max(0, (points / maxPoints) * 100)) : 0;
  const confidence = factor.confidence || 'MEDIUM';
  const evidenceSources = factor.evidence_sources || [];
  const formula = factor.formula_description || '';
  const status = factor.status || 'assessed';
  return { points, maxPoints, weight, details, percent, confidence, evidenceSources, formula, status };
};

export const RiskPrioritization = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [gearTypeFilter, setGearTypeFilter] = useState('all');
  const [wildlifeFilter, setWildlifeFilter] = useState('all');
  const [completenessFilter, setCompletenessFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'id' | 'age' | 'confidence'
  const [sortOrder, setSortOrder] = useState('desc');

  // Active filter state detection
  const isFiltered = useMemo(() => {
    return (
      priorityFilter !== 'all' ||
      gearTypeFilter !== 'all' ||
      wildlifeFilter !== 'all' ||
      completenessFilter !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [priorityFilter, gearTypeFilter, wildlifeFilter, completenessFilter, searchQuery]);

  const resetFilters = () => {
    setPriorityFilter('all');
    setGearTypeFilter('all');
    setWildlifeFilter('all');
    setCompletenessFilter('all');
    setSearchQuery('');
  };

  // Loading & data states
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [queueData, setQueueData] = useState({
    total_assessed: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    needs_inputs_count: 0,
    average_score: 0.0,
    items: [],
  });

  // Selected incident deep-dive state
  const [selectedIncidentId, setSelectedIncidentId] = useState(() =>
    resolveInitialIncidentId(searchParams, location.state)
  );
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Weight configuration modal & state
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weights, setWeights] = useState({
    gear_hazard: 0.30,
    wildlife_risk: 0.25,
    drift_dispersal: 0.20,
    coastal_grounding: 0.15,
    temporal_age: 0.10,
  });

  // Fetch initial weight config
  useEffect(() => {
    getRiskWeights()
      .then((data) => {
        if (data?.weights) {
          setWeights(data.weights);
        }
      })
      .catch((err) => console.warn('Using default weights:', err));
  }, []);

  // Fetch prioritized queue from backend
  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRiskQueue({
        priority: priorityFilter,
        gearType: gearTypeFilter,
        wildlife: wildlifeFilter,
        completeness: completenessFilter,
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      const rawItems = (data.items || []).map((item) => {
        let age_days = item.age_days;
        if (age_days == null && item.reported_at) {
          const diffMs = Date.now() - new Date(item.reported_at).getTime();
          age_days = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        }
        return {
          ...item,
          age_days,
          risk_score: item.risk_score ?? 0,
        };
      });
      const sum = data.summary || {};
      const avgScore =
        sum.average_score != null
          ? Number(sum.average_score)
          : rawItems.length > 0
          ? rawItems.reduce((acc, curr) => acc + (curr.risk_score || 0), 0) / rawItems.length
          : 0.0;

      setQueueData({
        total_assessed: sum.total_assessed ?? sum.total_verified ?? rawItems.length,
        critical_count: sum.critical_count ?? rawItems.filter((i) => i.priority === 'critical').length,
        high_count: sum.high_count ?? rawItems.filter((i) => i.priority === 'high').length,
        medium_count: sum.medium_count ?? rawItems.filter((i) => i.priority === 'medium').length,
        low_count: sum.low_count ?? rawItems.filter((i) => i.priority === 'low').length,
        needs_inputs_count: sum.needs_inputs_count ?? rawItems.filter((i) => i.needs_inputs).length,
        average_score: avgScore,
        items: rawItems,
        weights: data.weights || null,
      });

      // Auto-select initial incident or clear selection if filtered out
      if (rawItems.length > 0) {
        if (selectedIncidentId) {
          const match = rawItems.find((i) => i.report_id === selectedIncidentId);
          if (match) {
            setSelectedAssessment(match);
          } else {
            // When filters exclude the selected incident, automatically clear the selection
            setSelectedIncidentId(null);
            setSelectedAssessment(null);
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('incidentId');
                return next;
              },
              { replace: true }
            );
          }
        } else {
          const first = rawItems[0];
          setSelectedIncidentId(first.report_id);
          setSelectedAssessment(first);
          setStoredIncidentId(first.report_id);
        }
      } else {
        // When filtered queue is empty, clear selection and Case Inspector
        setSelectedIncidentId(null);
        setSelectedAssessment(null);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('incidentId');
            return next;
          },
          { replace: true }
        );
      }
    } catch (err) {
      console.error('Failed to load risk queue:', err);
      setError(err.message || 'Unable to retrieve prioritized incident queue.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed assessment for selected incident
  const fetchSelectedAssessment = async (reportId) => {
    if (!reportId) {
      setSelectedAssessment(null);
      return;
    }
    try {
      setLoadingAssessment(true);
      const data = await getIncidentRisk(reportId);
      if (data) {
        let age_days = data.age_days;
        if (age_days == null && data.reported_at) {
          const diffMs = Date.now() - new Date(data.reported_at).getTime();
          age_days = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        }
        setSelectedAssessment({ ...data, age_days, risk_score: data.risk_score ?? 0 });
      } else {
        setSelectedAssessment(null);
      }
    } catch (err) {
      console.warn(`Could not fetch detail for #${reportId}:`, err);
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Trigger queue fetch when filters or sorting change
  useEffect(() => {
    fetchQueue();
  }, [priorityFilter, gearTypeFilter, wildlifeFilter, completenessFilter, searchQuery, sortBy, sortOrder]);

  // Handle row selection
  const handleSelectIncident = (item) => {
    setSelectedIncidentId(item.report_id);
    setSelectedAssessment(item);
    setStoredIncidentId(item.report_id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('incidentId', String(item.report_id));
        return next;
      },
      { replace: true }
    );
  };

  // Handle re-evaluation / refresh of selected incident
  const handleReevaluate = async () => {
    if (!selectedIncidentId) return;
    try {
      setRecalculating(true);
      const updated = await evaluateIncidentRisk(selectedIncidentId, weights);
      if (updated) {
        let age_days = updated.age_days;
        if (age_days == null && updated.reported_at) {
          const diffMs = Date.now() - new Date(updated.reported_at).getTime();
          age_days = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        }
        setSelectedAssessment({ ...updated, age_days, risk_score: updated.risk_score ?? 0 });
      }
      await fetchQueue();
    } catch (err) {
      console.error('Re-evaluation error:', err);
      alert(`Re-evaluation failed: ${err.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  // Sort column toggle helper
  const handleSortToggle = (col) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  // Navigation handlers for cross-module integration
  const handleStageRecovery = () => {
    if (!selectedIncidentId) return;
    setStoredIncidentId(selectedIncidentId);
    navigate(`/ngo/recovery-planning?incidentId=${selectedIncidentId}`, {
      state: { incidentId: selectedIncidentId, incident: selectedAssessment },
    });
  };

  const handleOpenDrift = () => {
    if (!selectedIncidentId) return;
    setStoredIncidentId(selectedIncidentId);
    navigate(`/ngo/drift-forecasting?incidentId=${selectedIncidentId}`, {
      state: { incidentId: selectedIncidentId },
    });
  };

  const handleOpenTelemetry = () => {
    if (!selectedIncidentId) return;
    setStoredIncidentId(selectedIncidentId);
    navigate(`/ngo/environmental-intelligence?incidentId=${selectedIncidentId}`, {
      state: { incidentId: selectedIncidentId },
    });
  };

  // Weight total validator
  const totalWeightPercent = useMemo(() => {
    const sum =
      (weights.gear_hazard || 0) +
      (weights.wildlife_risk || 0) +
      (weights.drift_dispersal || 0) +
      (weights.coastal_grounding || 0) +
      (weights.temporal_age || 0);
    return Math.round(sum * 100);
  }, [weights]);

  // Priority color badges helper
  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'high':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'medium':
        return 'bg-[#EAF7F7] text-[#087E8B] border-[#087E8B]/30';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const getDataConfidenceBadgeClass = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'low':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Context Header & Metadata Bar */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[#087E8B]">Operations</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-[#173B4D]">Risk Prioritization</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-[#173B4D] tracking-tight">
              Risk Prioritization
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#EAF7F7] text-[#087E8B] text-[11px] font-mono uppercase tracking-wider font-semibold border border-[#D8ECEC]">
              DSS Multi-Criteria Engine v3.4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl font-sans">
            Algorithmic prioritization of verified ALDFG incidents based on gear hazard classifications, verified wildlife entanglement, drift trajectories, model-estimated grounding proximity, and temporal decay.
          </p>
        </div>

        {/* Quick Telemetry & Status Pill */}
        <div className="flex items-center gap-3 self-start xl:self-auto bg-white p-2 rounded-xl border border-[#D8ECEC] shadow-xs">
          <div className="px-2.5 py-1 rounded bg-[#EAF7F7] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00C9C1] animate-pulse"></span>
            <span className="text-[11px] font-mono uppercase text-[#087E8B] font-semibold">
              Prioritization Engine Active
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="text-[11px] font-mono text-slate-500 pr-1">
            Verified Queue: <span className="text-[#173B4D] font-bold">{queueData.total_assessed}</span>
          </div>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-[#087E8B] transition-colors"
            title="Refresh priority queue"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </section>

      {/* Metric Overview Bento Cards (System-wide verified incident summary) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 px-1">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#087E8B] font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">public</span>
              <span>
                SYSTEM-WIDE VERIFIED INCIDENT SUMMARY ({queueData.total_assessed} VERIFIED INCIDENTS • AVG RISK: {Number(queueData.average_score || 0).toFixed(1)} / 100)
              </span>
            </span>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              System-wide metrics calculated across all verified ALDFG incidents in OceanRescue (independent of active queue filters).
            </p>
          </div>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-[#087E8B] hover:text-[#00C9C1] flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-xs">filter_alt_off</span>
              <span>Reset Active Filters</span>
            </button>
          )}
        </div>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Critical (80-100) */}
          <div
            onClick={() => setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical')}
            className={`relative bg-white p-3.5 rounded-xl border shadow-xs flex flex-col justify-between overflow-hidden cursor-pointer transition-all ${
              priorityFilter === 'critical' ? 'ring-2 ring-rose-500 border-rose-300' : 'border-[#D8ECEC] hover:border-rose-300'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono uppercase text-rose-600 font-semibold tracking-wider">
                Critical (80–100)
              </span>
              <span className="material-symbols-outlined text-rose-500 text-base">crisis_alert</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#173B4D]">
                {queueData.critical_count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">VERIFIED INCIDENTS</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">Immediate ecological threat</div>
          </div>

          {/* Card 2: High Priority (60-79) */}
          <div
            onClick={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')}
            className={`relative bg-white p-3.5 rounded-xl border shadow-xs flex flex-col justify-between overflow-hidden cursor-pointer transition-all ${
              priorityFilter === 'high' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-[#D8ECEC] hover:border-amber-300'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono uppercase text-amber-700 font-semibold tracking-wider">
                High (60–79)
              </span>
              <span className="material-symbols-outlined text-amber-500 text-base">near_me</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#173B4D]">
                {queueData.high_count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">VERIFIED INCIDENTS</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">Drift into sensitive zones</div>
          </div>

          {/* Card 3: Medium Priority (35-59) */}
          <div
            onClick={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')}
            className={`relative bg-white p-3.5 rounded-xl border shadow-xs flex flex-col justify-between overflow-hidden cursor-pointer transition-all ${
              priorityFilter === 'medium' ? 'ring-2 ring-[#087E8B] border-[#087E8B]' : 'border-[#D8ECEC] hover:border-[#087E8B]'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#087E8B]"></div>
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono uppercase text-[#087E8B] font-semibold tracking-wider">
                Medium (35–59)
              </span>
              <span className="material-symbols-outlined text-[#087E8B] text-base">anchor</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#173B4D]">
                {queueData.medium_count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">VERIFIED INCIDENTS</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">Moderate dispersal snags</div>
          </div>

          {/* Card 4: Low Priority (0-34) */}
          <div
            onClick={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')}
            className={`relative bg-white p-3.5 rounded-xl border shadow-xs flex flex-col justify-between overflow-hidden cursor-pointer transition-all ${
              priorityFilter === 'low' ? 'ring-2 ring-slate-400 border-slate-400' : 'border-[#D8ECEC] hover:border-slate-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300"></div>
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                Low (0–34)
              </span>
              <span className="material-symbols-outlined text-slate-400 text-base">archive</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#173B4D]">
                {queueData.low_count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">VERIFIED INCIDENTS</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">Cataloged baseline risk</div>
          </div>

          {/* Card 5: Needs Operational Inputs */}
          <div
            onClick={() => setCompletenessFilter(completenessFilter === 'needs_inputs' ? 'all' : 'needs_inputs')}
            className={`relative bg-white p-3.5 rounded-xl border shadow-xs flex flex-col justify-between overflow-hidden col-span-2 sm:col-span-1 cursor-pointer transition-all ${
              completenessFilter === 'needs_inputs' ? 'ring-2 ring-[#00C9C1] border-[#00C9C1]' : 'border-[#D8ECEC] hover:border-[#00C9C1]'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#00C9C1]"></div>
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono uppercase text-[#008982] font-semibold tracking-wider">
                Needs Inputs
              </span>
              <span className="material-symbols-outlined text-[#00C9C1] text-base">hourglass_empty</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[#173B4D]">
                {queueData.needs_inputs_count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">INCIDENTS NEEDING INPUTS</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">Pending operational inputs</div>
          </div>
        </section>
      </div>

      {/* Scientific & Operational Integrity Notice */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#EAF7F7] text-[#173B4D] text-xs border border-[#D8ECEC]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-[#087E8B] shrink-0">info</span>
          <span className="leading-relaxed">
            <strong>Decision Support Protocol:</strong> Risk scoring reflects a prototype multi-criteria model (0–100) weighting gear hazard, confirmed wildlife risk, drift dispersion, model-estimated grounding proximity, and temporal decay. Only verified reports enter the queue.
          </span>
        </div>
        <button
          onClick={() => setShowWeightsModal(true)}
          className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-white text-[#087E8B] font-semibold border border-[#D8ECEC] hover:bg-slate-50 transition-colors whitespace-nowrap self-end sm:self-auto shadow-2xs"
        >
          Configure Weights
        </button>
      </div>

      {/* Filter Bar & Tactical Slicers */}
      <section className="w-full bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="flex flex-col gap-1 lg:col-span-1">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Search Incidents
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-[#087E8B] text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID (e.g. 417), gear, location..."
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#F2FAFA] border-0 text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Priority Tier
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F2FAFA] border-0 text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] cursor-pointer"
            >
              <option value="all">All Tiers (Critical, High, Med, Low)</option>
              <option value="critical">Critical (80–100)</option>
              <option value="high">High Priority (60–79)</option>
              <option value="medium">Medium Priority (35–59)</option>
              <option value="low">Low Priority (0–34)</option>
            </select>
          </div>

          {/* Gear Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Gear Classification
            </label>
            <select
              value={gearTypeFilter}
              onChange={(e) => setGearTypeFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F2FAFA] border-0 text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] cursor-pointer"
            >
              <option value="all">All Gear Types</option>
              <option value="gillnet">Gillnets</option>
              <option value="trawl">Trawls</option>
              <option value="longline">Longlines</option>
              <option value="traps">Traps / Pots</option>
              <option value="purse_seine">Purse Seines</option>
            </select>
          </div>

          {/* Wildlife Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Wildlife Impact
            </label>
            <select
              value={wildlifeFilter}
              onChange={(e) => setWildlifeFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F2FAFA] border-0 text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] cursor-pointer"
            >
              <option value="all">All Wildlife States</option>
              <option value="confirmed">Confirmed Impact / Entangled</option>
              <option value="none">No Confirmed Impact</option>
            </select>
          </div>

          {/* Data Completeness & Confidence */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Data Completeness &amp; Confidence
            </label>
            <select
              value={completenessFilter}
              onChange={(e) => setCompletenessFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F2FAFA] border-0 text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] cursor-pointer"
            >
              <option value="all">All Incidents</option>
              <option value="needs_inputs">Needs Operational Inputs</option>
              <option value="complete">Complete Operational Inputs</option>
              <option value="high_confidence">High Data Confidence</option>
              <option value="medium_confidence">Medium Data Confidence</option>
              <option value="low_confidence">Low Data Confidence</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Content Stage: Prioritized Queue Matrix (Left) + Selected Case Deep Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Prioritized Incident Table (7 or 8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#D8ECEC] shadow-xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="h-12 px-4 flex items-center justify-between bg-[#F2FAFA] border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#173B4D] font-display">
                  Verified ALDFG Priority Queue
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                  Showing {queueData.items.length} of {queueData.total_assessed} Verified
                </span>
                {isFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#087E8B] text-[10px] font-mono font-semibold flex items-center gap-1">
                    <span>Filtered</span>
                    <button
                      onClick={resetFilters}
                      className="hover:text-rose-600 font-bold ml-0.5"
                      title="Clear active filters"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>Avg Score: <strong>{(queueData?.average_score ?? 0).toFixed(1)}</strong></span>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[#087E8B] text-3xl animate-spin mb-2">
                  progress_activity
                </span>
                <span className="text-xs font-semibold text-[#173B4D]">
                  Calculating multi-criteria risk vectors...
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Synthesizing gear hazard, drift displacement, land-mask grounding, and wildlife reports.
                </span>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-3xl">error</span>
                <span className="text-sm font-bold text-rose-600">Failed to load risk queue</span>
                <p className="text-xs text-slate-500 max-w-sm">{error}</p>
                <button
                  onClick={fetchQueue}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-[#00C9C1] text-[#173B4D] font-bold text-xs"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && queueData.items.length === 0 && (
              <div className="p-8 sm:p-12">
                <EmptyState
                  icon="assessment"
                  title="No verified incidents match active filters."
                  description="Only verified incident reports enter the recovery priority queue. Clear or reset filters to view all verified ALDFG incidents."
                  actionText="Reset Filters"
                  actionOnClick={resetFilters}
                  secondaryNote="Operational data integrity policy: Unverified reports are excluded from the recovery queue."
                />
              </div>
            )}

            {/* Populated Table */}
            {!loading && !error && queueData.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#D8ECEC] bg-[#F2FAFA]/50 text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                      <th
                        onClick={() => handleSortToggle('score')}
                        className="py-3 px-3.5 cursor-pointer hover:text-[#087E8B] transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Risk Score</span>
                          {sortBy === 'score' && (
                            <span className="text-xs">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle('id')}
                        className="py-3 px-3 cursor-pointer hover:text-[#087E8B] transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Incident</span>
                          {sortBy === 'id' && (
                            <span className="text-xs">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3">Gear Classification</th>
                      <th className="py-3 px-3">Coordinates / Location</th>
                      <th
                        onClick={() => handleSortToggle('confidence')}
                        className="py-3 px-3 cursor-pointer hover:text-[#087E8B] transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Confidence</span>
                          {sortBy === 'confidence' && (
                            <span className="text-xs">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3">Primary Assessment Rationale</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8ECEC] text-xs">
                    {queueData.items.map((item) => {
                      const isSelected = selectedIncidentId === item.report_id;
                      return (
                        <tr
                          key={item.report_id}
                          onClick={() => handleSelectIncident(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#EAF7F7] font-medium'
                              : 'hover:bg-slate-50 bg-white'
                          }`}
                        >
                          {/* Risk Score & Priority Badge */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPriorityBadgeClass(
                                  item.priority
                                )}`}
                              >
                                {item.priority}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-[#173B4D] text-sm">
                                  {(item.risk_score ?? 0).toFixed(1)}
                                </span>
                                <div className="w-16 h-1 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full rounded-full ${
                                      (item.risk_score ?? 0) >= 80
                                        ? 'bg-rose-500'
                                        : (item.risk_score ?? 0) >= 60
                                        ? 'bg-amber-500'
                                        : (item.risk_score ?? 0) >= 35
                                        ? 'bg-[#087E8B]'
                                        : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, item.risk_score ?? 0))}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Incident ID */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-[#087E8B]">
                                  #{item.report_id}
                                </span>
                                <span
                                  className="material-symbols-outlined text-xs text-emerald-600"
                                  title="Verified Incident"
                                >
                                  verified
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.age_days != null
                                  ? `${Number(item.age_days).toFixed(1)}d ago`
                                  : item.reported_at
                                  ? `${Math.max(0, ((Date.now() - new Date(item.reported_at).getTime()) / (1000 * 60 * 60 * 24))).toFixed(1)}d ago`
                                  : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Gear Classification */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#173B4D] capitalize">
                                {item.gear_type}
                              </span>
                              {(item.factors?.wildlife_risk?.points > 0 || item.factors?.wildlife_risk?.points_awarded > 0 || item.wildlife_impact_confirmed) && (
                                <span className="text-[10px] text-rose-600 font-medium flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">pets</span>
                                  Wildlife Impact
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location & Estimated Grounding Status */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col max-w-[150px]">
                              <span className="font-mono text-[11px] text-slate-700 truncate">
                                {item.latitude != null ? Number(item.latitude).toFixed(4) : '—'}°, {item.longitude != null ? Number(item.longitude).toFixed(4) : '—'}°
                              </span>
                              {(item.grounding_detected ?? item.metadata_info?.grounding_detected) ? (
                                <span
                                  className="text-[10px] text-rose-600 font-mono flex items-center gap-0.5 truncate"
                                  title="Model shoreline land-mask estimate (Not physically confirmed)"
                                >
                                  <span className="material-symbols-outlined text-[11px]">pin_drop</span>
                                  Est. Grounding (+{item.grounding_step ?? item.metadata_info?.grounding_step_hours ?? 0}h)
                                </span>
                              ) : (item.has_forecast ?? item.metadata_info?.has_forecast) ? (
                                <span
                                  className="text-[10px] text-[#087E8B] font-mono flex items-center gap-0.5 truncate"
                                  title="Active Lagrangian drift advection simulation"
                                >
                                  <span className="material-symbols-outlined text-[11px]">air</span>
                                  Active Drift Vector
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                  No drift run
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Data Confidence */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${getDataConfidenceBadgeClass(
                                item.data_confidence
                              )}`}
                            >
                              {item.data_confidence}
                            </span>
                            {item.needs_inputs && (
                              <span
                                className="block text-[9px] text-amber-600 font-mono mt-0.5"
                                title="Missing drift forecast or environmental telemetry"
                              >
                                Needs Inputs
                              </span>
                            )}
                          </td>

                          {/* Primary Reason */}
                          <td className="py-3 px-3 max-w-xs">
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {item.primary_reason}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleSelectIncident(item)}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? 'bg-[#00C9C1] text-[#173B4D]'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Inspect multi-factor risk breakdown"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Spatial Risk Envelope Visualizer */}
          <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-base">map</span>
                <span className="font-semibold text-sm text-[#173B4D] font-display">
                  Incident Geospatial &amp; Grounding Envelope
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#087E8B] uppercase font-semibold">
                {selectedAssessment ? `Selected: Incident #${selectedAssessment.report_id}` : 'No Selection'}
              </span>
            </div>

            {selectedAssessment ? (
              <div className="p-3.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#173B4D]">
                      Incident #{selectedAssessment.report_id} — {selectedAssessment.gear_type}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({selectedAssessment.latitude != null ? Number(selectedAssessment.latitude).toFixed(4) : '—'}°N, {selectedAssessment.longitude != null ? Number(selectedAssessment.longitude).toFixed(4) : '—'}°E)
                    </span>
                    {selectedAssessment.min_shoreline_distance_km != null && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-[#D8ECEC] text-[#087E8B]">
                        {Number(selectedAssessment.min_shoreline_distance_km).toFixed(1)} km to coast
                      </span>
                    )}
                    {selectedAssessment.latest_forecast_id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-[#D8ECEC] text-slate-600">
                        Forecast #{selectedAssessment.latest_forecast_id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {(selectedAssessment.grounding_detected ?? selectedAssessment.metadata_info?.grounding_detected) ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Model land-mask collision estimated at step {selectedAssessment.grounding_step ?? selectedAssessment.metadata_info?.grounding_step_hours ?? 0}h. (Model estimate, not confirmed physical grounding. Post-grounding hypothetical trajectory excluded).
                      </span>
                    ) : ((selectedAssessment.forecast_points_count ?? selectedAssessment.metadata_info?.trajectory_points_count ?? 0) > 0) ? (
                      <span className="text-[#087E8B]">
                        Active offshore drift forecast with {selectedAssessment.forecast_points_count ?? selectedAssessment.metadata_info?.trajectory_points_count} valid steps. Net displacement: {Number(selectedAssessment.net_displacement_km ?? selectedAssessment.metadata_info?.displacement_km ?? 0).toFixed(2)} km (Total path: {Number(selectedAssessment.total_drift_distance_km || 0).toFixed(2)} km).
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        No valid drift forecast generated yet. Run Lagrangian drift simulation to calculate trajectory and grounding risk.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={handleOpenDrift}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] text-xs font-semibold text-[#087E8B] hover:bg-slate-50 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">air</span>
                    <span>Drift Map</span>
                  </button>
                  <button
                    onClick={handleStageRecovery}
                    className="px-3 py-1.5 rounded-lg bg-[#00C9C1] text-[#173B4D] text-xs font-bold font-display hover:bg-[#00b5ae] transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">sailing</span>
                    <span>Stage Recovery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-center text-xs text-slate-500">
                Select an incident from the queue to inspect geospatial parameters and drift trajectories.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Case Deep-Dive Inspector (4 or 5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold tracking-wider">
                  Case Inspector
                </span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display mt-0.5">
                  Multi-Factor Risk Breakdown
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {selectedAssessment && (
                  <button
                    onClick={handleReevaluate}
                    disabled={recalculating}
                    className="p-1 rounded text-slate-400 hover:text-[#087E8B] hover:bg-[#F2FAFA] transition-colors"
                    title="Recalculate risk score"
                  >
                    <span className={`material-symbols-outlined text-base ${recalculating ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                  </button>
                )}
                <span className="material-symbols-outlined text-slate-400 text-base">
                  analytics
                </span>
              </div>
            </div>

            {loadingAssessment ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[#087E8B] text-2xl animate-spin mb-1">
                  progress_activity
                </span>
                <span className="text-xs font-semibold text-[#173B4D]">Loading assessment details...</span>
              </div>
            ) : selectedAssessment ? (
              <div className="flex flex-col gap-4">
                {/* Score & Urgency Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#F2FAFA] to-white border border-[#D8ECEC] flex flex-col gap-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-[#087E8B]">
                          INCIDENT #{selectedAssessment.report_id}
                        </span>
                        <span className="material-symbols-outlined text-xs text-emerald-600">
                          verified
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#173B4D] capitalize block">
                        {selectedAssessment.gear_type}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPriorityBadgeClass(
                          selectedAssessment.priority
                        )}`}
                      >
                        {selectedAssessment.priority}
                      </span>
                      <span className="text-2xl font-bold font-mono text-[#173B4D] mt-0.5">
                        {Number(selectedAssessment.risk_score ?? 0).toFixed(1)}
                        <span className="text-xs text-slate-400 font-normal"> / 100</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#D8ECEC]/60 text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>
                        Data Confidence:{' '}
                        <strong className="uppercase font-mono text-[#173B4D]">
                          {selectedAssessment.data_confidence}
                        </strong>
                      </span>
                      {selectedAssessment.calculation_version && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white border border-[#D8ECEC] text-slate-500">
                          {selectedAssessment.calculation_version}
                        </span>
                      )}
                    </div>
                    <span className="font-mono">
                      {selectedAssessment.age_days != null
                        ? `Reported ${Number(selectedAssessment.age_days).toFixed(1)}d ago`
                        : selectedAssessment.reported_at
                        ? `Reported ${Math.max(0, ((Date.now() - new Date(selectedAssessment.reported_at).getTime()) / (1000 * 60 * 60 * 24))).toFixed(1)}d ago`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Stale Drift Forecast Warning Banner */}
                {selectedAssessment.forecast_is_stale && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">history_toggle_off</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
                        Stale Drift Forecast Warning ({selectedAssessment.forecast_validity_period_hours || 48}h Validity Expired)
                      </span>
                      <span className="text-[11px] leading-relaxed text-amber-800">
                        Associated forecast #{selectedAssessment.latest_forecast_id} was generated &gt;48 hours ago. A 20% temporal confidence penalty has been applied to drift and grounding factors. Re-run Lagrangian simulation for current advection vector.
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Reason & Explanation */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                    Primary Prioritization Rationale
                  </span>
                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 leading-relaxed font-sans">
                    {selectedAssessment.primary_reason}
                  </div>
                  {selectedAssessment.explanation && (
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                      {selectedAssessment.explanation}
                    </p>
                  )}
                </div>

                {/* Contributing Factor Breakdown */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                    Factor Contribution Breakdown
                  </span>

                  {/* Factor 1: Gear Hazard */}
                  {selectedAssessment.factors?.gear_hazard && (() => {
                    const f = getFactorDisplay(selectedAssessment.factors.gear_hazard);
                    return (
                      <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#087E8B]">inventory_2</span>
                            Gear Hazard Classification
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white border border-[#D8ECEC] text-[#087E8B]">
                              {f.confidence}
                            </span>
                            <span className="font-mono font-bold text-[#087E8B]">
                              {Number(f.points).toFixed(1)} / {Number(f.maxPoints).toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-[#087E8B] rounded-full"
                            style={{ width: `${f.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal">
                          {f.details} (Weight: {Math.round(f.weight)}%)
                        </span>
                        {f.formula && (
                          <div className="px-2 py-0.5 rounded bg-white/80 border border-[#D8ECEC] font-mono text-[9px] text-[#087E8B] truncate" title={f.formula}>
                            {f.formula}
                          </div>
                        )}
                        {f.evidenceSources && f.evidenceSources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-400">Sources:</span>
                            {f.evidenceSources.map((src, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-600 border border-[#D8ECEC]">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Factor 2: Wildlife Risk */}
                  {selectedAssessment.factors?.wildlife_risk && (() => {
                    const f = getFactorDisplay(selectedAssessment.factors.wildlife_risk);
                    return (
                      <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-rose-500">pets</span>
                            Wildlife Impact &amp; Entanglement
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white border border-[#D8ECEC] text-rose-600">
                              {f.confidence}
                            </span>
                            <span className="font-mono font-bold text-rose-600">
                              {Number(f.points).toFixed(1)} / {Number(f.maxPoints).toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${f.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal">
                          {f.details} (Weight: {Math.round(f.weight)}%)
                        </span>
                        {f.formula && (
                          <div className="px-2 py-0.5 rounded bg-white/80 border border-[#D8ECEC] font-mono text-[9px] text-rose-700 truncate" title={f.formula}>
                            {f.formula}
                          </div>
                        )}
                        {f.evidenceSources && f.evidenceSources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-400">Sources:</span>
                            {f.evidenceSources.map((src, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-600 border border-[#D8ECEC]">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Factor 3: Drift & Dispersal */}
                  {selectedAssessment.factors?.drift_dispersal && (() => {
                    const f = getFactorDisplay(selectedAssessment.factors.drift_dispersal);
                    return (
                      <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#00C9C1]">air</span>
                            Drift &amp; Spatial Dispersal
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white border border-[#D8ECEC] text-[#008982]">
                              {f.confidence}
                            </span>
                            <span className="font-mono font-bold text-[#008982]">
                              {Number(f.points).toFixed(1)} / {Number(f.maxPoints).toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-[#00C9C1] rounded-full"
                            style={{ width: `${f.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal">
                          {f.details} (Weight: {Math.round(f.weight)}%)
                        </span>
                        {f.formula && (
                          <div className="px-2 py-0.5 rounded bg-white/80 border border-[#D8ECEC] font-mono text-[9px] text-[#008982] truncate" title={f.formula}>
                            {f.formula}
                          </div>
                        )}
                        {f.evidenceSources && f.evidenceSources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-400">Sources:</span>
                            {f.evidenceSources.map((src, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-600 border border-[#D8ECEC]">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Factor 4: Coastal Grounding */}
                  {selectedAssessment.factors?.coastal_grounding && (() => {
                    const f = getFactorDisplay(selectedAssessment.factors.coastal_grounding);
                    return (
                      <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-amber-500">pin_drop</span>
                            Shoreline Grounding Risk
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white border border-[#D8ECEC] text-amber-700">
                              {f.confidence}
                            </span>
                            <span className="font-mono font-bold text-amber-700">
                              {Number(f.points).toFixed(1)} / {Number(f.maxPoints).toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${f.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal">
                          {f.details} (Weight: {Math.round(f.weight)}%)
                        </span>
                        {f.formula && (
                          <div className="px-2 py-0.5 rounded bg-white/80 border border-[#D8ECEC] font-mono text-[9px] text-amber-700 truncate" title={f.formula}>
                            {f.formula}
                          </div>
                        )}
                        {f.evidenceSources && f.evidenceSources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-400">Sources:</span>
                            {f.evidenceSources.map((src, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-600 border border-[#D8ECEC]">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Factor 5: Incident Age */}
                  {selectedAssessment.factors?.temporal_age && (() => {
                    const f = getFactorDisplay(selectedAssessment.factors.temporal_age);
                    return (
                      <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                            Incident Age &amp; Degradation
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white border border-[#D8ECEC] text-slate-600">
                              {f.confidence}
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {Number(f.points).toFixed(1)} / {Number(f.maxPoints).toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-slate-400 rounded-full"
                            style={{ width: `${f.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal">
                          {f.details} (Weight: {Math.round(f.weight)}%)
                        </span>
                        {f.formula && (
                          <div className="px-2 py-0.5 rounded bg-white/80 border border-[#D8ECEC] font-mono text-[9px] text-slate-600 truncate" title={f.formula}>
                            {f.formula}
                          </div>
                        )}
                        {f.evidenceSources && f.evidenceSources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-400">Sources:</span>
                            {f.evidenceSources.map((src, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-600 border border-[#D8ECEC]">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Missing Data Warnings */}
                {selectedAssessment.missing_inputs && selectedAssessment.missing_inputs.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex flex-col gap-1">
                    <div className="flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      <span>Missing / Stale Inputs</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {selectedAssessment.missing_inputs.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rule-Based Recommended Action */}
                <div className="p-3 rounded-lg bg-[#EAF7F7] border border-[#00C9C1] flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#087E8B]">
                    <span className="material-symbols-outlined text-base">recommend</span>
                    <span>Recommended Next Action</span>
                  </div>
                  <p className="text-xs text-[#173B4D] font-medium leading-relaxed">
                    {selectedAssessment.recommended_action}
                  </p>
                </div>

                {/* Cross-Module Integration Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#D8ECEC]">
                  <button
                    onClick={handleStageRecovery}
                    className="w-full h-9 rounded-lg bg-[#00C9C1] text-[#173B4D] font-display text-xs font-bold hover:bg-[#00b5ae] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">sailing</span>
                    <span>Stage Recovery Mission</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleOpenDrift}
                      className="h-8 rounded-lg bg-white border border-[#D8ECEC] hover:bg-slate-50 text-xs font-semibold text-[#087E8B] transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">air</span>
                      <span>Drift Vector</span>
                    </button>
                    <button
                      onClick={handleOpenTelemetry}
                      className="h-8 rounded-lg bg-white border border-[#D8ECEC] hover:bg-slate-50 text-xs font-semibold text-[#087E8B] transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">water_drop</span>
                      <span>Telemetry</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#F2FAFA] flex items-center justify-center text-slate-400 mb-2">
                  <span className="material-symbols-outlined text-xl">touch_app</span>
                </div>
                <h3 className="text-xs font-semibold text-[#173B4D]">
                  No Incident Selected
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Select an incident from the verified queue to view contributing factor points, wildlife impact evidence, drift displacement, and rule-based recovery recommendations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Algorithmic Weights Configuration Modal */}
      {showWeightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D8ECEC] shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-xl">tune</span>
                <h3 className="font-display font-bold text-base text-[#173B4D]">
                  Configure Multi-Criteria Decision Weights
                </h3>
              </div>
              <button
                onClick={() => setShowWeightsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust multi-criteria weights across factors to calibrate risk scoring for specific operational priorities. Weights should sum to 100%.
            </p>

            <div className="flex flex-col gap-3.5 py-2">
              {/* Gear Hazard */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#173B4D]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#087E8B]">inventory_2</span>
                    Gear Hazard Classification
                  </span>
                  <span className="font-mono">{Math.round((weights.gear_hazard || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((weights.gear_hazard || 0) * 100)}
                  onChange={(e) =>
                    setWeights({ ...weights, gear_hazard: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#087E8B] cursor-pointer"
                />
              </div>

              {/* Wildlife Risk */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#173B4D]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-rose-500">pets</span>
                    Wildlife Vulnerability &amp; Entanglement
                  </span>
                  <span className="font-mono">{Math.round((weights.wildlife_risk || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((weights.wildlife_risk || 0) * 100)}
                  onChange={(e) =>
                    setWeights({ ...weights, wildlife_risk: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Drift & Dispersal */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#173B4D]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#00C9C1]">air</span>
                    Drift &amp; Spatial Dispersal
                  </span>
                  <span className="font-mono">{Math.round((weights.drift_dispersal || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((weights.drift_dispersal || 0) * 100)}
                  onChange={(e) =>
                    setWeights({ ...weights, drift_dispersal: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#00C9C1] cursor-pointer"
                />
              </div>

              {/* Coastal Grounding */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#173B4D]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-amber-500">pin_drop</span>
                    Shoreline Grounding Proximity
                  </span>
                  <span className="font-mono">{Math.round((weights.coastal_grounding || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((weights.coastal_grounding || 0) * 100)}
                  onChange={(e) =>
                    setWeights({ ...weights, coastal_grounding: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Temporal Age */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#173B4D]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                    Incident Age / Loss Duration
                  </span>
                  <span className="font-mono">{Math.round((weights.temporal_age || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((weights.temporal_age || 0) * 100)}
                  onChange={(e) =>
                    setWeights({ ...weights, temporal_age: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-slate-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Sum indicator */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs">
              <span className="text-slate-600 font-semibold">Total Weight Sum:</span>
              <span
                className={`font-mono font-bold ${
                  totalWeightPercent === 100 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {totalWeightPercent}% {totalWeightPercent !== 100 && '(Adjust to equal 100%)'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D8ECEC]">
              <button
                type="button"
                onClick={() =>
                  setWeights({
                    gear_hazard: 0.30,
                    wildlife_risk: 0.25,
                    drift_dispersal: 0.20,
                    coastal_grounding: 0.15,
                    temporal_age: 0.10,
                  })
                }
                className="text-xs text-slate-500 hover:text-[#087E8B] underline"
              >
                Reset to Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeightsModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowWeightsModal(false);
                    if (selectedIncidentId) {
                      await handleReevaluate();
                    } else {
                      await fetchQueue();
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#00C9C1] text-[#173B4D] hover:bg-[#00b5ae] transition-colors font-display"
                >
                  Apply &amp; Recalculate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskPrioritization;
