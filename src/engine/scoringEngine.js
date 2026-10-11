/**
 * LeakPriority Scoring Engine
 *
 * Calculates a 0–100 priority score for a water leak report.
 * Each factor produces a sub-score; the factors sum to 100 maximum.
 *
 * Weights (as defined in the project brief):
 *   Leak severity            → max 30 pts
 *   Estimated water-loss rate→ max 25 pts
 *   Affected households      → max 20 pts
 *   Time unresolved          → max 15 pts
 *   Critical facility nearby → max 10 pts
 *
 * These are prototype weights, not official engineering standards.
 */

// ─── Severity mapping ────────────────────────────────────────────────────────
// Severity levels and their point allocations (out of 30)
export const SEVERITY_LEVELS = {
  CRITICAL: { label: 'Critical', points: 30, description: 'Major pipe burst or main line failure' },
  HIGH:     { label: 'High',     points: 22, description: 'Large leak, significant flow visible' },
  MEDIUM:   { label: 'Medium',   points: 14, description: 'Moderate leak, steady drip or seep' },
  LOW:      { label: 'Low',      points:  6, description: 'Minor leak, occasional drip' },
};

// ─── Priority categories ──────────────────────────────────────────────────────
export const PRIORITY_CATEGORIES = {
  CRITICAL: { label: 'Critical', min: 80, max: 100, color: '#dc2626', bg: '#fef2f2' },
  HIGH:     { label: 'High',     min: 60, max: 79,  color: '#ea580c', bg: '#fff7ed' },
  MEDIUM:   { label: 'Medium',   min: 35, max: 59,  color: '#ca8a04', bg: '#fefce8' },
  LOW:      { label: 'Low',      min:  0, max: 34,  color: '#16a34a', bg: '#f0fdf4' },
};

// ─── Status workflow ──────────────────────────────────────────────────────────
export const REPAIR_STATUSES = {
  REPORTED:    { label: 'Reported',    next: ['ASSIGNED'],            color: '#6b7280' },
  ASSIGNED:    { label: 'Assigned',    next: ['IN_PROGRESS'],         color: '#2563eb' },
  IN_PROGRESS: { label: 'In Progress', next: ['RESOLVED'],            color: '#d97706' },
  RESOLVED:    { label: 'Resolved',    next: [],                      color: '#16a34a' },
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Score: Leak severity (0–30)
 */
function scoreSeverity(severityKey) {
  const entry = SEVERITY_LEVELS[severityKey];
  if (!entry) return { points: 0, note: 'Severity not specified.' };
  return {
    points: entry.points,
    note: `${entry.label} severity (${entry.description}).`,
  };
}

/**
 * Score: Estimated water-loss rate (0–25)
 * Input: litres per hour (L/h)
 * Scale: 0 → 0 pts, ≥200 L/h → 25 pts, linear in between.
 */
function scoreWaterLoss(litresPerHour) {
  const lph = parseFloat(litresPerHour);
  if (isNaN(lph) || lph < 0) {
    return { points: 0, note: 'Water-loss rate not provided.' };
  }
  const MAX_LPH = 200;
  const raw = Math.min(lph / MAX_LPH, 1) * 25;
  const points = parseFloat(raw.toFixed(1));
  return {
    points,
    note: `${lph} L/h estimated flow rate (scale: 0–${MAX_LPH}+ L/h = 0–25 pts).`,
  };
}

/**
 * Score: Affected households (0–20)
 * Scale: 0 → 0 pts, ≥500 households → 20 pts, linear in between.
 */
function scoreAffectedHouseholds(count) {
  const n = parseInt(count, 10);
  if (isNaN(n) || n < 0) {
    return { points: 0, note: 'Affected household count not provided.' };
  }
  const MAX_HH = 500;
  const raw = Math.min(n / MAX_HH, 1) * 20;
  const points = parseFloat(raw.toFixed(1));
  return {
    points,
    note: `${n} household(s) affected (scale: 0–${MAX_HH}+ = 0–20 pts).`,
  };
}

/**
 * Score: Time unresolved (0–15)
 * Input: hours since first reported.
 * Scale: 0 → 0 pts, ≥72 h (3 days) → 15 pts, linear in between.
 */
function scoreTimeUnresolved(hoursUnresolved) {
  const h = parseFloat(hoursUnresolved);
  if (isNaN(h) || h < 0) {
    return { points: 0, note: 'Time unresolved not available.' };
  }
  const MAX_HOURS = 72;
  const raw = Math.min(h / MAX_HOURS, 1) * 15;
  const points = parseFloat(raw.toFixed(1));
  const days = (h / 24).toFixed(1);
  return {
    points,
    note: `Unresolved for ${days} day(s) / ${h.toFixed(0)} h (scale: 0–${MAX_HOURS}+ h = 0–15 pts).`,
  };
}

/**
 * Score: Critical facility proximity (0 or 10)
 * A binary flag: true = 10 pts.
 */
function scoreCriticalFacility(nearCriticalFacility) {
  if (nearCriticalFacility) {
    return { points: 10, note: 'Leak is located near a critical facility (hospital, school, etc.).' };
  }
  return { points: 0, note: 'No critical facility in immediate proximity.' };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calculates the complete priority score for a leak report.
 *
 * @param {object} report - Leak report data
 * @param {string} report.severity        - One of SEVERITY_LEVELS keys
 * @param {number} report.waterLossRate   - Litres per hour
 * @param {number} report.affectedHouseholds
 * @param {number} report.hoursUnresolved - Derived from report timestamp
 * @param {boolean} report.nearCriticalFacility
 * @returns {object} Scoring result with total, category, and per-factor breakdown
 */
export function calculatePriorityScore(report) {
  const severity      = scoreSeverity(report.severity);
  const waterLoss     = scoreWaterLoss(report.waterLossRate);
  const households    = scoreAffectedHouseholds(report.affectedHouseholds);
  const timeUnresolved= scoreTimeUnresolved(report.hoursUnresolved);
  const criticalFac   = scoreCriticalFacility(report.nearCriticalFacility);

  const total = Math.min(
    100,
    Math.max(
      0,
      severity.points + waterLoss.points + households.points +
      timeUnresolved.points + criticalFac.points,
    ),
  );

  // Determine category
  let category = 'LOW';
  for (const [key, cat] of Object.entries(PRIORITY_CATEGORIES)) {
    if (total >= cat.min && total <= cat.max) {
      category = key;
      break;
    }
  }

  return {
    total: parseFloat(total.toFixed(1)),
    category,
    breakdown: {
      severity: { ...severity, maxPoints: 30, label: 'Leak Severity' },
      waterLoss: { ...waterLoss, maxPoints: 25, label: 'Water-Loss Rate' },
      households: { ...households, maxPoints: 20, label: 'Affected Households' },
      timeUnresolved: { ...timeUnresolved, maxPoints: 15, label: 'Time Unresolved' },
      criticalFacility: { ...criticalFac, maxPoints: 10, label: 'Critical Facility Nearby' },
    },
  };
}

/**
 * Derives hoursUnresolved from a report's createdAt ISO timestamp.
 */
export function deriveHoursUnresolved(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(0, (now - created) / (1000 * 60 * 60));
}

/**
 * Estimates daily water loss (litres/day) from flow rate (litres/hour).
 */
export function estimateDailyLoss(litresPerHour) {
  const lph = parseFloat(litresPerHour);
  if (isNaN(lph) || lph < 0) return 0;
  return lph * 24;
}

/**
 * Estimates water saved by a resolved report.
 * Uses flow rate × hours from reportedAt to resolvedAt.
 * Returns null if insufficient data.
 */
export function estimateWaterSaved(report) {
  if (!report.resolvedAt || !report.createdAt) return null;
  const lph = parseFloat(report.waterLossRate);
  if (isNaN(lph) || lph <= 0) return null;
  const hours = Math.max(
    0,
    (new Date(report.resolvedAt) - new Date(report.createdAt)) / (1000 * 60 * 60),
  );
  return parseFloat((lph * hours).toFixed(0));
}
