/**
 * LeakPriority — Scoring Engine (Node.js / Lambda)
 *
 * Shared scoring logic used by all Lambda functions.
 * Mirrors the frontend engine to ensure consistency.
 *
 * These weights are prototype design choices, not official standards.
 */

const SEVERITY_LEVELS = {
  CRITICAL: 30,
  HIGH:     22,
  MEDIUM:   14,
  LOW:       6,
};

const PRIORITY_CATEGORIES = [
  { key: 'CRITICAL', min: 80, max: 100 },
  { key: 'HIGH',     min: 60, max: 79  },
  { key: 'MEDIUM',   min: 35, max: 59  },
  { key: 'LOW',      min:  0, max: 34  },
];

function scoreSeverity(severityKey) {
  return SEVERITY_LEVELS[severityKey] ?? 0;
}

function scoreWaterLoss(lph) {
  const v = parseFloat(lph);
  if (isNaN(v) || v < 0) return 0;
  return parseFloat((Math.min(v / 200, 1) * 25).toFixed(1));
}

function scoreAffectedHouseholds(count) {
  const n = parseInt(count, 10);
  if (isNaN(n) || n < 0) return 0;
  return parseFloat((Math.min(n / 500, 1) * 20).toFixed(1));
}

function scoreTimeUnresolved(hours) {
  const h = parseFloat(hours);
  if (isNaN(h) || h < 0) return 0;
  return parseFloat((Math.min(h / 72, 1) * 15).toFixed(1));
}

function scoreCriticalFacility(flag) {
  return flag ? 10 : 0;
}

function getCategory(total) {
  for (const cat of PRIORITY_CATEGORIES) {
    if (total >= cat.min && total <= cat.max) return cat.key;
  }
  return 'LOW';
}

function calculatePriorityScore({ severity, waterLossRate, affectedHouseholds, hoursUnresolved, nearCriticalFacility }) {
  const s  = scoreSeverity(severity);
  const w  = scoreWaterLoss(waterLossRate);
  const hh = scoreAffectedHouseholds(affectedHouseholds);
  const t  = scoreTimeUnresolved(hoursUnresolved);
  const cf = scoreCriticalFacility(nearCriticalFacility);
  const total = parseFloat(Math.min(100, Math.max(0, s + w + hh + t + cf)).toFixed(1));
  return { total, category: getCategory(total) };
}

function deriveHoursUnresolved(createdAt) {
  return Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
}

module.exports = { calculatePriorityScore, deriveHoursUnresolved, SEVERITY_LEVELS, PRIORITY_CATEGORIES };
