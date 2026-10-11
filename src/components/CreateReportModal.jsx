import React, { useState } from 'react';
import { createReport } from '../services/reportService';
import { calculatePriorityScore, PRIORITY_CATEGORIES, SEVERITY_LEVELS } from '../engine/scoringEngine';


const ZONES = [
  'Zone A – Central',
  'Zone B – North',
  'Zone C – South',
  'Zone D – East',
  'Zone E – West',
  'Unspecified',
];

function validate(form) {
  const errors = {};
  if (!form.location.trim()) errors.location = 'Location is required.';
  if (!form.severity) errors.severity = 'Please select a severity level.';
  const lph = parseFloat(form.waterLossRate);
  if (isNaN(lph) || lph < 0) errors.waterLossRate = 'Enter a valid flow rate (≥ 0).';
  if (lph > 5000) errors.waterLossRate = 'Value seems too high. Please verify.';
  const hh = parseInt(form.affectedHouseholds, 10);
  if (isNaN(hh) || hh < 0) errors.affectedHouseholds = 'Enter a valid number of households (≥ 0).';
  if (form.nearCriticalFacility && !form.criticalFacilityName.trim()) {
    errors.criticalFacilityName = 'Please specify the critical facility name.';
  }
  if (!form.reportedBy.trim()) errors.reportedBy = 'Please enter who is reporting this leak.';
  return errors;
}

export default function CreateReportModal({ onClose, onCreated, onToast }) {
  const [form, setForm] = useState({
    location: '',
    zone: 'Zone A – Central',
    severity: '',
    waterLossRate: '',
    affectedHouseholds: '',
    nearCriticalFacility: false,
    criticalFacilityName: '',
    reportedBy: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function computePreview() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const scoring = calculatePriorityScore({
      severity: form.severity,
      waterLossRate: parseFloat(form.waterLossRate) || 0,
      affectedHouseholds: parseInt(form.affectedHouseholds, 10) || 0,
      hoursUnresolved: 0, // new report = 0 hours
      nearCriticalFacility: form.nearCriticalFacility,
    });
    setPreview({ scoring, catConfig: PRIORITY_CATEGORIES[scoring.category] });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await createReport(form);
      onCreated();
    } catch (err) {
      onToast(`Error creating report: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">🆕 Report a Water Leak</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Score preview */}
            {preview && (
              <div
                style={{
                  background: preview.catConfig?.bg || '#f8fafc',
                  border: `1px solid ${preview.catConfig?.color || '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 800, color: preview.catConfig?.color }}>
                  {preview.scoring.total}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Estimated priority score</div>
                  <span className={`priority-badge ${preview.scoring.category}`}>
                    {preview.catConfig?.label}
                  </span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Preview only — time factor starts at 0.
                </div>
              </div>
            )}

            <div className="form-grid">
              {/* Location */}
              <div className="form-group full-width">
                <label className="form-label">Location <span className="required">*</span></label>
                <input
                  className={`form-input ${errors.location ? 'error' : ''}`}
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. Junction of MG Road & Park Avenue"
                />
                {errors.location && <span className="form-error">{errors.location}</span>}
              </div>

              {/* Zone */}
              <div className="form-group">
                <label className="form-label">Zone</label>
                <select className="form-select" value={form.zone} onChange={(e) => set('zone', e.target.value)}>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              {/* Reported By */}
              <div className="form-group">
                <label className="form-label">Reported By <span className="required">*</span></label>
                <input
                  className={`form-input ${errors.reportedBy ? 'error' : ''}`}
                  value={form.reportedBy}
                  onChange={(e) => set('reportedBy', e.target.value)}
                  placeholder="Inspector name or team"
                />
                {errors.reportedBy && <span className="form-error">{errors.reportedBy}</span>}
              </div>

              {/* Severity */}
              <div className="form-group">
                <label className="form-label">Leak Severity <span className="required">*</span></label>
                <select
                  className={`form-select ${errors.severity ? 'error' : ''}`}
                  value={form.severity}
                  onChange={(e) => set('severity', e.target.value)}
                >
                  <option value="">— Select severity —</option>
                  {Object.entries(SEVERITY_LEVELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — {v.description}</option>
                  ))}
                </select>
                {errors.severity && <span className="form-error">{errors.severity}</span>}
              </div>

              {/* Water Loss Rate */}
              <div className="form-group">
                <label className="form-label">Estimated Flow Rate (L/h) <span className="required">*</span></label>
                <input
                  className={`form-input ${errors.waterLossRate ? 'error' : ''}`}
                  type="number"
                  min="0"
                  max="5000"
                  step="0.1"
                  value={form.waterLossRate}
                  onChange={(e) => set('waterLossRate', e.target.value)}
                  placeholder="e.g. 50"
                />
                {errors.waterLossRate
                  ? <span className="form-error">{errors.waterLossRate}</span>
                  : <span className="form-hint">Litres per hour. Full scale = 200+ L/h (max 25 pts).</span>}
              </div>

              {/* Affected Households */}
              <div className="form-group">
                <label className="form-label">Affected Households <span className="required">*</span></label>
                <input
                  className={`form-input ${errors.affectedHouseholds ? 'error' : ''}`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.affectedHouseholds}
                  onChange={(e) => set('affectedHouseholds', e.target.value)}
                  placeholder="e.g. 120"
                />
                {errors.affectedHouseholds
                  ? <span className="form-error">{errors.affectedHouseholds}</span>
                  : <span className="form-hint">Households without water or with affected supply. Max scale = 500+.</span>}
              </div>

              {/* Critical Facility */}
              <div className="form-group full-width">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.nearCriticalFacility}
                    onChange={(e) => set('nearCriticalFacility', e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>
                      Near a Critical Facility (+10 pts)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Hospital, fire station, school, water treatment plant, etc.
                    </div>
                  </div>
                </label>
              </div>

              {form.nearCriticalFacility && (
                <div className="form-group full-width">
                  <label className="form-label">Facility Name <span className="required">*</span></label>
                  <input
                    className={`form-input ${errors.criticalFacilityName ? 'error' : ''}`}
                    value={form.criticalFacilityName}
                    onChange={(e) => set('criticalFacilityName', e.target.value)}
                    placeholder="e.g. City General Hospital"
                  />
                  {errors.criticalFacilityName && <span className="form-error">{errors.criticalFacilityName}</span>}
                </div>
              )}

              {/* Notes */}
              <div className="form-group full-width">
                <label className="form-label">Field Notes (optional)</label>
                <textarea
                  className="form-textarea"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Describe what was observed: visible flow, road damage, smell, etc."
                />
              </div>
            </div>

            <div className="disclaimer-box">
              ⚠️ Flow rate and household estimates are used to calculate a priority score (0–100) that
              supports maintenance decision-making. The score is a tool, not a substitute for
              on-site professional assessment.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={computePreview}>
              👁 Preview Score
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : '✅ Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
