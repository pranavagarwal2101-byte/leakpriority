import React from 'react';
import { PRIORITY_CATEGORIES } from '../engine/scoringEngine';
import PriorityBadge from './PriorityBadge';

const FACTOR_ICONS = {
  severity:         '⚡',
  waterLoss:        '💧',
  households:       '🏠',
  timeUnresolved:   '⏱',
  criticalFacility: '🏥',
};

export default function ScoreBreakdown({ report }) {
  const { scoreBreakdown, priorityScore, priorityCategory } = report;
  const catConfig = PRIORITY_CATEGORIES[priorityCategory] || { color: '#94a3b8' };

  if (!scoreBreakdown) return <div className="text-muted">Score data unavailable.</div>;

  // SVG ring parameters
  const R = 36;
  const circumference = 2 * Math.PI * R;
  const filled = (priorityScore / 100) * circumference;

  return (
    <div>
      <div className="score-breakdown-card">
        {/* Total score display */}
        <div className="total-score-display">
          <div className="total-score-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={R} fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="40" cy="40" r={R}
                fill="none"
                stroke={catConfig.color}
                strokeWidth="8"
                strokeDasharray={`${filled} ${circumference - filled}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="total-score-number">
              {priorityScore}
              <span>/ 100</span>
            </div>
          </div>
          <div className="total-score-info">
            <div className="total-score-label">Priority Score</div>
            <div style={{ marginBottom: 6 }}>
              <PriorityBadge category={priorityCategory} />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {PRIORITY_CATEGORIES[priorityCategory]?.min}–{PRIORITY_CATEGORIES[priorityCategory]?.max} point range
            </div>
          </div>
        </div>

        {/* Per-factor breakdown */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
          Score Breakdown — Contribution by Factor
        </div>
        <div className="factor-list">
          {Object.entries(scoreBreakdown).map(([key, factor]) => {
            const pct = (factor.points / factor.maxPoints) * 100;
            return (
              <div key={key}>
                <div className="factor-row">
                  <div className="factor-label">
                    {FACTOR_ICONS[key]} {factor.label}
                  </div>
                  <div className="factor-bar-bg">
                    <div
                      className="factor-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct > 66 ? catConfig.color : pct > 33 ? '#f59e0b' : '#94a3b8',
                      }}
                    />
                  </div>
                  <div className="factor-pts">
                    {factor.points} / {factor.maxPoints}
                  </div>
                </div>
                <div className="factor-note">{factor.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="alert-banner">
        📌 <strong>Note:</strong> The priority score is a decision-support estimate. The weights used are
        prototype values, not official engineering or municipal standards. Repair decisions should be
        made by qualified professionals using additional local knowledge and engineering judgment.
      </div>

      <div className="disclaimer-box">
        <strong>Scoring model (prototype):</strong><br />
        Leak severity (max 30 pts) · Water-loss rate (max 25 pts) · Affected households (max 20 pts) ·
        Time unresolved (max 15 pts) · Critical facility proximity (max 10 pts) · Total: 100 pts.<br /><br />
        Categories: Critical 80–100 · High 60–79 · Medium 35–59 · Low 0–34.
      </div>
    </div>
  );
}
