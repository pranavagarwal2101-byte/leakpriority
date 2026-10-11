/**
 * LeakPriority — Report Store (localStorage-backed)
 *
 * This module provides a simple data layer that:
 * 1. Seeds from sample reports on first load.
 * 2. Persists all changes to localStorage under key 'leakpriority_reports'.
 * 3. Enriches each report with a live priority score on read.
 *
 * When AWS integration is added, this module's interface stays the same —
 * only the underlying implementation changes (API calls replace localStorage).
 */

import { SAMPLE_REPORTS } from '../data/sampleReports';
import {
  calculatePriorityScore,
  deriveHoursUnresolved,
  estimateWaterSaved,
} from '../engine/scoringEngine';

const STORAGE_KEY = 'leakpriority_reports';

// ─── Private helpers ──────────────────────────────────────────────────────────

function loadRaw() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {
    // ignore parse errors — fall through to seed
  }
  return null;
}

function saveRaw(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function seed() {
  saveRaw(SAMPLE_REPORTS);
  return SAMPLE_REPORTS;
}

/** Enrich a raw report with live scoring */
function enrich(raw) {
  const hoursUnresolved =
    raw.status === 'RESOLVED'
      ? Math.max(
          0,
          (new Date(raw.resolvedAt) - new Date(raw.createdAt)) / (1000 * 60 * 60),
        )
      : deriveHoursUnresolved(raw.createdAt);

  const scoring = calculatePriorityScore({
    severity: raw.severity,
    waterLossRate: raw.waterLossRate,
    affectedHouseholds: raw.affectedHouseholds,
    hoursUnresolved,
    nearCriticalFacility: raw.nearCriticalFacility,
  });

  const waterSaved = estimateWaterSaved(raw);

  return {
    ...raw,
    hoursUnresolved: parseFloat(hoursUnresolved.toFixed(1)),
    priorityScore: scoring.total,
    priorityCategory: scoring.category,
    scoreBreakdown: scoring.breakdown,
    estimatedWaterSavedLitres: waterSaved,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return all reports enriched with scores, sorted by priority (desc). */
export function getAllReports() {
  const raw = loadRaw() || seed();
  return raw.map(enrich).sort((a, b) => {
    // Active reports ranked by score desc; resolved sent to bottom
    if (a.status === 'RESOLVED' && b.status !== 'RESOLVED') return 1;
    if (b.status === 'RESOLVED' && a.status !== 'RESOLVED') return -1;
    return b.priorityScore - a.priorityScore;
  });
}

/** Return a single report by id, enriched. */
export function getReportById(id) {
  const raw = loadRaw() || seed();
  const report = raw.find((r) => r.id === id);
  return report ? enrich(report) : null;
}

/** Add a new report. Returns the created report (enriched). */
export function createReport(formData) {
  const raw = loadRaw() || seed();
  const id = `LK-${String(raw.length + 1).padStart(3, '0')}`;
  const newReport = {
    id,
    location: formData.location,
    zone: formData.zone || 'Unspecified',
    severity: formData.severity,
    waterLossRate: parseFloat(formData.waterLossRate) || 0,
    affectedHouseholds: parseInt(formData.affectedHouseholds, 10) || 0,
    nearCriticalFacility: Boolean(formData.nearCriticalFacility),
    criticalFacilityName: formData.criticalFacilityName || '',
    createdAt: new Date().toISOString(),
    status: 'REPORTED',
    reportedBy: formData.reportedBy || 'Staff',
    notes: formData.notes || '',
    assignedTo: '',
    assignedAt: null,
    startedAt: null,
    resolvedAt: null,
  };
  raw.push(newReport);
  saveRaw(raw);
  return enrich(newReport);
}

/** Update the status of a report. Returns the updated report (enriched). */
export function updateReportStatus(id, newStatus, extra = {}) {
  const raw = loadRaw() || seed();
  const idx = raw.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Report ${id} not found`);

  const timestamps = {};
  if (newStatus === 'ASSIGNED')    timestamps.assignedAt   = new Date().toISOString();
  if (newStatus === 'IN_PROGRESS') timestamps.startedAt    = new Date().toISOString();
  if (newStatus === 'RESOLVED')    timestamps.resolvedAt   = new Date().toISOString();

  raw[idx] = { ...raw[idx], status: newStatus, ...timestamps, ...extra };
  saveRaw(raw);
  return enrich(raw[idx]);
}

/** Reset to sample data (useful for demos). */
export function resetToSampleData() {
  saveRaw(SAMPLE_REPORTS);
}

/** Compute dashboard summary statistics */
export function getDashboardStats(reports) {
  const active = reports.filter((r) => r.status !== 'RESOLVED');
  const totalDailyLoss = active.reduce(
    (sum, r) => sum + (parseFloat(r.waterLossRate) || 0) * 24,
    0,
  );
  const totalSaved = reports
    .filter((r) => r.estimatedWaterSavedLitres != null)
    .reduce((sum, r) => sum + r.estimatedWaterSavedLitres, 0);

  return {
    total: reports.length,
    critical: reports.filter((r) => r.priorityCategory === 'CRITICAL' && r.status !== 'RESOLVED').length,
    pending: reports.filter((r) => ['REPORTED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length,
    resolved: reports.filter((r) => r.status === 'RESOLVED').length,
    estimatedDailyLossLitres: Math.round(totalDailyLoss),
    estimatedWaterSavedLitres: Math.round(totalSaved),
  };
}
