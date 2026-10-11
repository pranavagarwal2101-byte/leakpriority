/**
 * LeakPriority — API Client
 *
 * Provides the same interface as reportStore.js but backed by real AWS APIs.
 * To switch the frontend from localStorage to AWS:
 *   1. Set VITE_API_URL in .env.local to your API Gateway URL.
 *   2. In your components, import from '../api/apiClient' instead of '../store/reportStore'.
 *
 * This file is ready for Stage 4 integration.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/** Return all reports enriched with scores, sorted by priority (desc). */
export async function getAllReports() {
  return request('/reports');
}

/** Return a single report by id, enriched. */
export async function getReportById(id) {
  return request(`/reports/${encodeURIComponent(id)}`);
}

/** Add a new report. Returns the created report. */
export async function createReport(formData) {
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

/** Update the status of a report. Returns the updated report. */
export async function updateReportStatus(id, newStatus, extra = {}) {
  return request(`/reports/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus, ...extra }),
  });
}

/** Compute dashboard summary statistics */
export async function getDashboardStats() {
  return request('/stats');
}
