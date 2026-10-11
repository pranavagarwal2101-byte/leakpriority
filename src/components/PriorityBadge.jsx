import React from 'react';
import { PRIORITY_CATEGORIES } from '../engine/scoringEngine';

const ICONS = { CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };

export default function PriorityBadge({ category }) {
  const config = PRIORITY_CATEGORIES[category] || {};
  return (
    <span className={`priority-badge ${category}`}>
      {ICONS[category]} {config.label || category}
    </span>
  );
}
