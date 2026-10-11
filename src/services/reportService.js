/**
 * LeakPriority — Unified Report Service
 *
 * Provides a clean adapter layer that dynamically routes data operations:
 * - If VITE_API_URL is configured: dispatches HTTP requests via apiClient.js (AWS Cloud Mode).
 * - If VITE_API_URL is empty: uses in-browser localStorage via reportStore.js (Local Prototype Mode).
 *
 * All functions return Promises to ensure uniform asynchronous handling across UI components.
 */

import * as localStore from '../store/reportStore';
import * as cloudApi from '../api/apiClient';

const isCloudMode = Boolean(import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '');

export const activeMode = isCloudMode ? 'cloud' : 'local';

/**
 * Fetch all reports enriched with real-time scoring.
 * @returns {Promise<Array>}
 */
export async function getAllReports() {
  if (isCloudMode) {
    return cloudApi.getAllReports();
  }
  return Promise.resolve(localStore.getAllReports());
}

/**
 * Fetch a single report by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReportById(id) {
  if (isCloudMode) {
    return cloudApi.getReportById(id);
  }
  return Promise.resolve(localStore.getReportById(id));
}

/**
 * Create and score a new leak report.
 * @param {object} formData
 * @returns {Promise<object>}
 */
export async function createReport(formData) {
  if (isCloudMode) {
    return cloudApi.createReport(formData);
  }
  return Promise.resolve(localStore.createReport(formData));
}

/**
 * Update the repair status and assignment of a leak report.
 * @param {string} id
 * @param {string} newStatus
 * @param {object} extra
 * @returns {Promise<object>}
 */
export async function updateReportStatus(id, newStatus, extra = {}) {
  if (isCloudMode) {
    return cloudApi.updateReportStatus(id, newStatus, extra);
  }
  return Promise.resolve(localStore.updateReportStatus(id, newStatus, extra));
}

/**
 * Compute dashboard statistics.
 * @param {Array} [reports] - Optional in-memory reports list for local mode computation
 * @returns {Promise<object>}
 */
export async function getDashboardStats(reports) {
  if (isCloudMode) {
    return cloudApi.getDashboardStats();
  }
  const data = reports || localStore.getAllReports();
  return Promise.resolve(localStore.getDashboardStats(data));
}

/**
 * Reset local demonstration data.
 */
export function resetToSampleData() {
  if (!isCloudMode) {
    localStore.resetToSampleData();
  }
}
