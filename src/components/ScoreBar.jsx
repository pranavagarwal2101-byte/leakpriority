import React from 'react';
import { PRIORITY_CATEGORIES } from '../engine/scoringEngine';

export default function ScoreBar({ score, category }) {
  const catConfig = PRIORITY_CATEGORIES[category] || { color: '#94a3b8' };

  return (
    <div className="score-cell">
      <span className="score-value" style={{ color: catConfig.color }}>{score}</span>
      <div className="score-bar-bg">
        <div
          className="score-bar-fill"
          style={{
            width: `${score}%`,
            background: catConfig.color,
          }}
        />
      </div>
    </div>
  );
}
