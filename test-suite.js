/**
 * Unit & Integration Test Suite for LeakPriority Core Logic
 *
 * Verifies:
 * 1. Scoring engine calculations, factor sub-scores, edge cases, and bounds (0-100).
 * 2. Water-loss daily estimates and resolved savings calculations.
 * 3. Status workflow transitions.
 * 4. Backend scoring parity (ensuring backend/functions/scoring.js matches src/engine/scoringEngine.js).
 */

import {
  calculatePriorityScore,
  deriveHoursUnresolved,
  estimateDailyLoss,
  estimateWaterSaved,
  SEVERITY_LEVELS,
  PRIORITY_CATEGORIES,
  REPAIR_STATUSES,
} from './src/engine/scoringEngine.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const backendScoring = require('./backend/functions/scoring.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message} (Expected ${expected}, got ${actual})`);
  }
}

console.log('\n--- 1. Testing Scoring Engine ---');

// Test Case 1: Max Score Cap at 100
const maxCase = calculatePriorityScore({
  severity: 'CRITICAL', // 30
  waterLossRate: 500,   // >=200 -> 25
  affectedHouseholds: 1000, // >=500 -> 20
  hoursUnresolved: 100, // >=72 -> 15
  nearCriticalFacility: true, // 10
});
assertEquals(maxCase.total, 100, 'Max values cap at exactly 100 total points');
assertEquals(maxCase.category, 'CRITICAL', 'Score of 100 assigns CRITICAL category');
assertEquals(maxCase.breakdown.severity.points, 30, 'Severity max points is 30');
assertEquals(maxCase.breakdown.waterLoss.points, 25, 'Water loss max points is 25');
assertEquals(maxCase.breakdown.households.points, 20, 'Households max points is 20');
assertEquals(maxCase.breakdown.timeUnresolved.points, 15, 'Time unresolved max points is 15');
assertEquals(maxCase.breakdown.criticalFacility.points, 10, 'Critical facility points is 10');

// Test Case 2: Minimum Zero Baseline
const minCase = calculatePriorityScore({
  severity: 'LOW',
  waterLossRate: 0,
  affectedHouseholds: 0,
  hoursUnresolved: 0,
  nearCriticalFacility: false,
});
assertEquals(minCase.total, 6, 'Low severity baseline starts at 6 points');
assertEquals(minCase.category, 'LOW', 'Baseline score assigns LOW category');

// Test Case 3: Category Boundaries
const test80 = calculatePriorityScore({ severity: 'CRITICAL', waterLossRate: 200, affectedHouseholds: 500, hoursUnresolved: 24, nearCriticalFacility: false });
assert(test80.total >= 80, 'High impact report enters CRITICAL threshold (>= 80)');

console.log('\n--- 2. Testing Water-Loss & Water-Saving Estimates ---');
assertEquals(estimateDailyLoss(100), 2400, '100 L/h equates to 2400 L/day');
assertEquals(estimateDailyLoss(0), 0, '0 L/h equates to 0 L/day');

const mockResolvedReport = {
  waterLossRate: 50,
  createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  resolvedAt: new Date().toISOString(),
};
const saved = estimateWaterSaved(mockResolvedReport);
assert(saved >= 490 && saved <= 510, `50 L/h over 10 hours estimates approx ~500 Litres saved (got ${saved})`);

console.log('\n--- 3. Testing Backend vs Frontend Scoring Parity ---');
const parityPayload = {
  severity: 'HIGH',
  waterLossRate: 95,
  affectedHouseholds: 230,
  hoursUnresolved: 36,
  nearCriticalFacility: true,
};
const feScore = calculatePriorityScore(parityPayload);
const beScore = backendScoring.calculatePriorityScore(parityPayload);
assertEquals(feScore.total, beScore.total, `Frontend total (${feScore.total}) matches backend total (${beScore.total})`);
assertEquals(feScore.category, beScore.category, `Frontend category (${feScore.category}) matches backend category (${beScore.category})`);

console.log('\n--- 4. Testing Workflow State Transitions ---');
assertEquals(REPAIR_STATUSES.REPORTED.next[0], 'ASSIGNED', 'REPORTED can transition to ASSIGNED');
assertEquals(REPAIR_STATUSES.ASSIGNED.next[0], 'IN_PROGRESS', 'ASSIGNED can transition to IN_PROGRESS');
assertEquals(REPAIR_STATUSES.IN_PROGRESS.next[0], 'RESOLVED', 'IN_PROGRESS can transition to RESOLVED');
assertEquals(REPAIR_STATUSES.RESOLVED.next.length, 0, 'RESOLVED has no further transitions');

console.log(`\n================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`================================\n`);

if (failed > 0) process.exit(1);
