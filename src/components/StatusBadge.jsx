import React from 'react';
import { REPAIR_STATUSES } from '../engine/scoringEngine';

const ICONS = {
  REPORTED:    '📋',
  ASSIGNED:    '👤',
  IN_PROGRESS: '🔧',
  RESOLVED:    '✅',
};

export default function StatusBadge({ status }) {
  const config = REPAIR_STATUSES[status] || {};
  return (
    <span className={`status-badge ${status}`}>
      {ICONS[status]} {config.label || status}
    </span>
  );
}
