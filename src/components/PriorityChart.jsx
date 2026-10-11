import React, { useMemo } from 'react';
import { PRIORITY_CATEGORIES } from '../engine/scoringEngine';

const CATEGORY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH:     '#ea580c',
  MEDIUM:   '#ca8a04',
  LOW:      '#16a34a',
};

export default function PriorityChart({ reports }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    reports.forEach((r) => {
      if (r.priorityCategory in c) c[r.priorityCategory]++;
    });
    return c;
  }, [reports]);

  const max = Math.max(1, ...Object.values(counts));
  const total = reports.length || 1;

  return (
    <div className="chart-card">
      <div className="card-title">Priority Distribution</div>
      <div className="chart-bar-group">
        {Object.entries(PRIORITY_CATEGORIES).map(([key, cat]) => (
          <div key={key} className="chart-col">
            <div className="chart-bar-wrap">
              <div
                className="chart-bar"
                style={{
                  height: `${(counts[key] / max) * 100}%`,
                  background: CATEGORY_COLORS[key],
                }}
              />
            </div>
            <div className="chart-bar-label" style={{ color: CATEGORY_COLORS[key] }}>{cat.label}</div>
            <div className="chart-bar-count">
              {counts[key]} ({Math.round((counts[key] / total) * 100)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Legend / Score Range */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(PRIORITY_CATEGORIES).map(([key, cat]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[key], display: 'inline-block' }} />
            {cat.label} ({cat.min}–{cat.max})
          </div>
        ))}
      </div>
    </div>
  );
}
