/**
 * OceanRescue PDF Export Service
 * Generates professional, downloadable incident reports conforming to
 * platform integrity and tactical telemetry documentation standards.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from './api';

const BASE = API_BASE_URL.replace(/\/+$/, '');

/**
 * Triggers browser download of a PDF Blob.
 */
export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Client-side fallback PDF generator using jsPDF and jspdf-autotable.
 * Ensures the officer can always export report even if backend streaming is interrupted.
 */
export function generateClientSidePdf({
  incidents = [],
  metrics = { pending: 0, verified: 0, inReview: 0, resolved: 0 },
  filters = { status: 'ALL', gearType: 'ALL', search: '' },
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Header Banner
  doc.setFillColor(23, 59, 77); // #173B4D
  doc.rect(36, 32, pageWidth - 72, 54, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('OceanRescue — Incident Management & Telemetry Report', 50, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 201, 193); // #00C9C1
  doc.text(
    'AI-Driven Geospatial Intelligence for ALDFG Detection, Drift Forecasting & Retrieval Optimization',
    50,
    72
  );

  // 2. Metadata Grid
  const nowUtc = new Date().toUTCString();
  const activeFilters = `Status: ${filters.status || 'ALL'} | Gear: ${filters.gearType || 'ALL'}${
    filters.search ? ` | Search: "${filters.search}"` : ''
  }`;

  autoTable(doc, {
    startY: 96,
    theme: 'plain',
    margin: { left: 36, right: 36 },
    body: [
      [
        { content: `Generated: ${nowUtc}`, styles: { fontStyle: 'bold' } },
        { content: 'Scope: Arabian Sea – Ratnagiri / Konkan Coast', styles: { fontStyle: 'bold' } },
        { content: 'Authorized Officer: Lead Recovery Operations Officer', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: `Total Incidents: ${incidents.length}` },
        { content: 'Harbour Benchmark: Mirkarwada (16.99° N, 73.30° E)' },
        { content: `Active Filters: ${activeFilters}` },
      ],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [51, 65, 85],
      fillColor: [242, 250, 250],
      lineColor: [216, 236, 236],
      lineWidth: 0.5,
    },
  });

  // 3. Executive Summary: Verification Summary & Risk Distribution
  const verifiedCnt = incidents.filter((i) => i.status === 'verified').length;
  const pendingCnt = incidents.filter((i) => ['reported', 'draft'].includes(i.status)).length;
  const reviewCnt = incidents.filter((i) => ['in_review', 'under_review', 'scheduled_recovery'].includes(i.status)).length;
  const resolvedCnt = incidents.filter((i) => ['resolved', 'recovered', 'rejected', 'cancelled'].includes(i.status)).length;
  const total = Math.max(incidents.length, 1);

  // Risk distribution
  let highRisk = 0;
  let medRisk = 0;
  let lowRisk = 0;
  let unassessedRisk = 0;

  incidents.forEach((i) => {
    if (i.risk_score != null) {
      if (i.risk_score >= 70) highRisk++;
      else if (i.risk_score >= 40) medRisk++;
      else lowRisk++;
    } else {
      unassessedRisk++;
    }
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    margin: { left: 36, right: 36 },
    head: [
      [
        'VERIFICATION SUMMARY',
        'COUNT',
        'PERCENTAGE',
        'RISK DISTRIBUTION TIER',
        'THRESHOLD',
        'COUNT',
      ],
    ],
    body: [
      [
        'Verified Vectors (Telemetry Cleared)',
        verifiedCnt,
        `${((verifiedCnt / total) * 100).toFixed(1)}%`,
        'High Priority',
        'Risk Score ≥ 70.0',
        highRisk,
      ],
      [
        'Pending Triage (Reported Intake)',
        pendingCnt,
        `${((pendingCnt / total) * 100).toFixed(1)}%`,
        'Medium Priority',
        '40.0 ≤ Score < 70.0',
        medRisk,
      ],
      [
        'In Review / Drift Analysis Active',
        reviewCnt,
        `${((reviewCnt / total) * 100).toFixed(1)}%`,
        'Low Priority',
        'Risk Score < 40.0',
        lowRisk,
      ],
      [
        'Resolved / Retrieved / Rejected',
        resolvedCnt,
        `${((resolvedCnt / total) * 100).toFixed(1)}%`,
        'Pending Assessment',
        'Unassessed Telemetry',
        unassessedRisk,
      ],
    ],
    headStyles: {
      fillColor: [234, 247, 247],
      textColor: [23, 59, 77],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [216, 236, 236],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 55, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 75, halign: 'center' },
      3: { cellWidth: 200 },
      4: { cellWidth: 180 },
      5: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
    },
  });

  // 4. Detailed Incident Ledger Table
  const tableHeaders = [
    'ID',
    'GEAR TYPE',
    'REPORTER / INTAKE',
    'COORDINATES',
    'LOSS TIME',
    'NGO STATUS',
    'AI DETECTION\n(PREDICTION)',
    'CONFIDENCE',
    'RISK SCORE',
    'DRIFT STATUS',
    'MAP SNAPSHOT',
  ];

  const tableBody = incidents.map((inc) => {
    // Parse reporter
    let reporter = 'Anonymous / Public';
    const desc = inc.description || '';
    if (desc.includes('Field Telemetry:')) {
      const match = desc.match(/Vessel\/Reporter:\s*([^|\]]+)/);
      const roleMatch = desc.match(/Role:\s*([^|\]]+)/);
      if (match && roleMatch) {
        reporter = `${match[1].trim()} (${roleMatch[1].trim()})`;
      } else if (match) {
        reporter = match[1].trim();
      }
    } else if (desc) {
      reporter = desc.length > 25 ? `${desc.substring(0, 25)}...` : desc;
    }

    // Coords
    const lat = inc.latitude != null ? `${Number(inc.latitude).toFixed(4)}° N` : 'N/A';
    const lon = inc.longitude != null ? `${Number(inc.longitude).toFixed(4)}° E` : 'N/A';
    const coordsStr = `${lat}\n${lon}`;

    // Loss time
    const lossTime = inc.reported_at
      ? new Date(inc.reported_at).toISOString().replace('T', ' ').substring(0, 16)
      : 'Not Available';

    // AI detection
    const aiDets = inc.ai_detections_count || 0;
    const aiStr = aiDets > 0 ? `${aiDets} target(s) detected` : 'No Target / Not Run';
    const confStr = inc.confidence ? `${(inc.confidence * 100).toFixed(1)}%` : 'N/A';

    // Risk
    const riskStr = inc.risk_score != null
      ? `${Number(inc.risk_score).toFixed(1)}/100 (${(inc.priority || 'N/A').toUpperCase()})`
      : 'Not Available';

    // Drift
    const driftCnt = inc.drift_forecasts_count || 0;
    const driftStr = driftCnt > 0 ? `Active (${driftCnt} steps)` : 'No Forecast';

    // Map snapshot
    const mapSnap = inc.image_url ? 'Evidence Attached' : 'Not Available';

    return [
      `#${inc.id}`,
      (inc.gear_type || 'N/A').replace('_', ' ').toUpperCase(),
      reporter,
      coordsStr,
      lossTime,
      (inc.status || 'REPORTED').toUpperCase(),
      aiStr,
      confStr,
      riskStr,
      driftStr,
      mapSnap,
    ];
  });

  if (tableBody.length === 0) {
    tableBody.push([
      'N/A',
      'No matching incident records found.',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
    ]);
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    theme: 'grid',
    margin: { left: 36, right: 36, bottom: 45 },
    head: [tableHeaders],
    body: tableBody,
    headStyles: {
      fillColor: [242, 250, 250],
      textColor: [23, 59, 77],
      fontStyle: 'bold',
      fontSize: 7,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [216, 236, 236],
      lineWidth: 0.5,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 252, 252],
    },
    columnStyles: {
      0: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { cellWidth: 96 },
      3: { cellWidth: 78 },
      4: { cellWidth: 68, halign: 'center' },
      5: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 92 },
      7: { cellWidth: 58, halign: 'center' },
      8: { cellWidth: 78 },
      9: { cellWidth: 72, halign: 'center' },
      10: { cellWidth: 72, halign: 'center' },
    },
  });

  // 5. Running Headers and Footers with 'Page X of Y'
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    // Header on pages > 1
    if (i > 1) {
      doc.text('OceanRescue — Incident Management & Telemetry Report', 36, 26);
      doc.text('Confidential Tactical Ledger • Arabian Sea Sector', pageWidth - 36, 26, {
        align: 'right',
      });
      doc.setDrawColor(216, 236, 236);
      doc.setLineWidth(0.5);
      doc.line(36, 32, pageWidth - 36, 32);
    }

    // Running Footer on every page
    doc.setDrawColor(216, 236, 236);
    doc.setLineWidth(0.5);
    doc.line(36, pageHeight - 30, pageWidth - 36, pageHeight - 30);
    doc.text(
      'OceanRescue AI-Driven Geospatial Decision-Support Platform • Ratnagiri / Konkan Coast Pilot',
      36,
      pageHeight - 18
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 36, pageHeight - 18, { align: 'right' });
  }

  const pdfBlob = doc.output('blob');
  const filename = `OceanRescue_Incident_Report_${todayStr}.pdf`;
  downloadPdfBlob(pdfBlob, filename);
  return filename;
}

/**
 * Primary export entry point.
 * Attempts server-side PDF generation first; falls back smoothly to client-side jsPDF.
 */
export async function exportIncidentReportPdf({
  incidents = [],
  metrics = null,
  filters = { status: 'ALL', gearType: 'ALL', search: '' },
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `OceanRescue_Incident_Report_${todayStr}.pdf`;

  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status.toLowerCase());
  if (filters.gearType && filters.gearType !== 'ALL') params.append('gear_type', filters.gearType.toLowerCase());
  if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

  try {
    const res = await fetch(`${BASE}/api/v1/reports/export/pdf?${params.toString()}`, {
      headers: { Accept: 'application/pdf' },
    });

    if (res.ok) {
      const blob = await res.blob();
      downloadPdfBlob(blob, filename);
      return { success: true, mode: 'server', filename };
    }
  } catch (err) {
    console.warn('Backend PDF endpoint unreachable, utilizing client-side PDF renderer:', err.message);
  }

  // Client-side fallback
  try {
    generateClientSidePdf({ incidents, metrics, filters });
    return { success: true, mode: 'client', filename };
  } catch (clientErr) {
    console.error('Client-side PDF generation failed:', clientErr);
    throw new Error(`Failed to generate PDF report: ${clientErr.message}`);
  }
}
