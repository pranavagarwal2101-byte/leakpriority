import React, { useState } from 'react';
import { updateReportStatus } from '../services/reportService';
import { REPAIR_STATUSES as STATUS_DEFS, estimateWaterSaved } from '../engine/scoringEngine';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';
import ScoreBreakdown from './ScoreBreakdown';

const STATUS_ORDER = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

function fmt(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ReportDetailModal({ report, onClose, onUpdated, onToast }) {
  const [assignedTo, setAssignedTo] = useState(report.assignedTo || '');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const nextStatuses = STATUS_DEFS[report.status]?.next || [];
  const currentStepIndex = STATUS_ORDER.indexOf(report.status);

  async function handleStatusChange(newStatus) {
    if (updating) return;
    setUpdating(true);
    try {
      await updateReportStatus(report.id, newStatus, assignedTo ? { assignedTo } : {});
      onUpdated();
      onToast(`Status updated to "${STATUS_DEFS[newStatus]?.label}".`, 'success');
    } catch (e) {
      onToast(`Error: ${e.message}`, 'error');
    } finally {
      setUpdating(false);
    }
  }

  const waterSaved = estimateWaterSaved(report);
  const dailyLoss = (parseFloat(report.waterLossRate) || 0) * 24;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="modal-title">{report.id}</span>
              <PriorityBadge category={report.priorityCategory} />
              <StatusBadge status={report.status} />
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
              📍 {report.location} · {report.zone}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
          {['details', 'score', 'status'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#0ea5e9' : '#64748b',
                borderBottom: activeTab === tab ? '2px solid #0ea5e9' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'score' ? '📊 Score' : tab === 'status' ? '🔧 Status' : '📋 Details'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-key">Report ID</div>
                  <div className="detail-val">{report.id}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Reported By</div>
                  <div className="detail-val">{report.reportedBy || '—'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Severity</div>
                  <div className="detail-val">
                    <span className={`priority-badge ${report.severity}`}>{report.severity}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Water-Loss Rate</div>
                  <div className="detail-val">{report.waterLossRate} L/h ≈ {dailyLoss.toLocaleString()} L/day (est.)</div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Affected Households</div>
                  <div className="detail-val">{report.affectedHouseholds}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Near Critical Facility</div>
                  <div className="detail-val">
                    {report.nearCriticalFacility
                      ? <span className="tag critical-facility">⚠ Yes — {report.criticalFacilityName}</span>
                      : 'No'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">First Reported</div>
                  <div className="detail-val">{fmt(report.createdAt)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-key">Time Unresolved</div>
                  <div className="detail-val">
                    {report.status === 'RESOLVED'
                      ? '—'
                      : `${report.hoursUnresolved.toFixed(1)} h (${(report.hoursUnresolved / 24).toFixed(1)} days)`}
                  </div>
                </div>
                {report.assignedTo && (
                  <div className="detail-item">
                    <div className="detail-key">Assigned To</div>
                    <div className="detail-val">{report.assignedTo}</div>
                  </div>
                )}
                {report.assignedAt && (
                  <div className="detail-item">
                    <div className="detail-key">Assigned At</div>
                    <div className="detail-val">{fmt(report.assignedAt)}</div>
                  </div>
                )}
                {report.startedAt && (
                  <div className="detail-item">
                    <div className="detail-key">Work Started</div>
                    <div className="detail-val">{fmt(report.startedAt)}</div>
                  </div>
                )}
                {report.resolvedAt && (
                  <div className="detail-item">
                    <div className="detail-key">Resolved At</div>
                    <div className="detail-val">{fmt(report.resolvedAt)}</div>
                  </div>
                )}
              </div>

              {report.notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                  <div className="detail-key" style={{ marginBottom: 4 }}>Field Notes</div>
                  <div style={{ fontSize: '0.875rem', color: '#334155' }}>{report.notes}</div>
                </div>
              )}

              {/* Water saved (resolved reports) */}
              {report.status === 'RESOLVED' && waterSaved != null && (
                <div className="savings-notice">
                  🌊 <strong>Estimated water saved by this repair: {waterSaved.toLocaleString()} litres</strong>
                  <br />
                  Calculated as: {report.waterLossRate} L/h × {report.hoursUnresolved.toFixed(1)} h from report to repair.
                  <div className="disclaimer-box" style={{ margin: '8px 0 0', color: '#065f46', background: 'rgba(255,255,255,.5)' }}>
                    This is a rough estimate based on the reported flow rate and elapsed time. It has not been
                    measured and should not be quoted as a verified figure.
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SCORE TAB ── */}
          {activeTab === 'score' && (
            <ScoreBreakdown report={report} />
          )}

          {/* ── STATUS TAB ── */}
          {activeTab === 'status' && (
            <StatusPanel
              report={report}
              assignedTo={assignedTo}
              setAssignedTo={setAssignedTo}
              nextStatuses={nextStatuses}
              currentStepIndex={currentStepIndex}
              onStatusChange={handleStatusChange}
              updating={updating}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Panel ─────────────────────────────────────────────────────────────
function StatusPanel({ report, assignedTo, setAssignedTo, nextStatuses, currentStepIndex, onStatusChange, updating }) {
  const statusLabels = { REPORTED: 'Reported', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved' };

  return (
    <div>
      {/* Stepper */}
      <div className="status-stepper">
        {['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`stepper-step ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : ''}`}
            >
              <div className="stepper-dot" />
              {statusLabels[s]}
            </div>
            {i < 3 && (
              <div className={`stepper-line ${i < currentStepIndex ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <div className="detail-item">
          <div className="detail-key">Current Status</div>
          <div className="detail-val">
            <span className={`status-badge ${report.status}`}>{statusLabels[report.status]}</span>
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-key">Assigned To</div>
          <div className="detail-val">{report.assignedTo || '—'}</div>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <>
          <div className="section-divider" />
          {nextStatuses.includes('ASSIGNED') && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Assign To (Team / Person)</label>
              <input
                className="form-input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="e.g. Team Alpha, John Doe"
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {nextStatuses.map((ns) => (
              <button
                key={ns}
                className="btn-primary btn-sm"
                onClick={() => onStatusChange(ns)}
                disabled={updating}
              >
                {updating ? '…' : `→ Mark as ${statusLabels[ns]}`}
              </button>
            ))}
          </div>
          <div className="disclaimer-box" style={{ marginTop: 14 }}>
            Status changes are recorded with a timestamp. This system is a decision-support tool;
            actual repair decisions should be made by qualified maintenance professionals.
          </div>
        </>
      )}

      {nextStatuses.length === 0 && (
        <div className="savings-notice">
          ✅ This report has been resolved. No further status changes are required.
        </div>
      )}
    </div>
  );
}
