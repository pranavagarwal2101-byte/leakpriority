import React, { useMemo, useState } from 'react';
import { PRIORITY_CATEGORIES, REPAIR_STATUSES } from '../engine/scoringEngine';
import ScoreBar from './ScoreBar';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';
import PriorityChart from './PriorityChart';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({ report, onClick }) {
  const days = (report.hoursUnresolved / 24).toFixed(1);

  return (
    <tr onClick={() => onClick(report)} title="Click to view details">
      <td><span className="report-id">{report.id}</span></td>
      <td>
        <div className="location-text">{report.location}</div>
        <div className="location-zone">{report.zone}</div>
      </td>
      <td>
        <span className={`priority-badge ${report.severity}`}>
          {report.severity}
        </span>
      </td>
      <td>{report.waterLossRate} L/h</td>
      <td>{report.affectedHouseholds}</td>
      <td>
        {report.status === 'RESOLVED'
          ? '—'
          : days < 1
          ? `${report.hoursUnresolved.toFixed(0)} h`
          : `${days} d`}
      </td>
      <td>
        {report.nearCriticalFacility
          ? <span className="tag critical-facility">⚠ Yes</span>
          : <span className="tag">No</span>}
      </td>
      <td>
        <ScoreBar score={report.priorityScore} category={report.priorityCategory} />
      </td>
      <td>
        <PriorityBadge category={report.priorityCategory} />
      </td>
      <td>
        <StatusBadge status={report.status} />
      </td>
    </tr>
  );
}

function SortHeader({ field, label, currentField, currentDir, onSort }) {
  return (
    <span
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(field)}
    >
      {label}{' '}
      {currentField === field ? (currentDir === 'asc' ? '▲' : '▼') : ''}
    </span>
  );
}

// ─── Report Table ─────────────────────────────────────────────────────────────
function ReportTable({ reports, onSelectReport, title }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortField, setSortField] = useState('priorityScore');
  const [sortDir, setSortDir] = useState('desc');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const zones = useMemo(() => {
    const set = new Set();
    reports.forEach((r) => { if (r.zone) set.add(r.zone); });
    return Array.from(set).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    let r = [...reports];
    if (statusFilter !== 'ALL') r = r.filter((x) => x.status === statusFilter);
    if (categoryFilter !== 'ALL') r = r.filter((x) => x.priorityCategory === categoryFilter);
    if (zoneFilter !== 'ALL') r = r.filter((x) => x.zone === zoneFilter);
    r.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = typeof bv === 'string' ? bv.toLowerCase() : bv;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [reports, statusFilter, categoryFilter, zoneFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const headers = ['Report ID', 'Location', 'Zone', 'Severity', 'Flow Rate (L/h)', 'Households', 'Hours Unresolved', 'Near Critical Facility', 'Priority Score', 'Priority Category', 'Status', 'Assigned To'];
    const rows = filtered.map((r) => [
      r.id,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${(r.zone || '').replace(/"/g, '""')}"`,
      r.severity,
      r.waterLossRate,
      r.affectedHouseholds,
      r.hoursUnresolved,
      r.nearCriticalFacility ? 'Yes' : 'No',
      r.priorityScore,
      r.priorityCategory,
      r.status,
      `"${(r.assignedTo || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leakpriority-dispatch-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-card">
      <div className="table-card-header">
        <span className="table-card-title">{title || 'Leak Reports'} ({filtered.length})</span>
        <div className="table-filters">
          <select className="filter-select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
            <option value="ALL">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Priorities</option>
            {Object.entries(PRIORITY_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={exportCSV}
            title="Export filtered reports to CSV for field dispatch"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p>No reports match the current filters.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Location</th>
                <th>Severity</th>
                <th><SortHeader field="waterLossRate" label="Water Loss" currentField={sortField} currentDir={sortDir} onSort={toggleSort} /></th>
                <th><SortHeader field="affectedHouseholds" label="Households" currentField={sortField} currentDir={sortDir} onSort={toggleSort} /></th>
                <th><SortHeader field="hoursUnresolved" label="Unresolved" currentField={sortField} currentDir={sortDir} onSort={toggleSort} /></th>
                <th>Critical Facility</th>
                <th><SortHeader field="priorityScore" label="Score" currentField={sortField} currentDir={sortDir} onSort={toggleSort} /></th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <ReportRow key={r.id} report={r} onClick={onSelectReport} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ reports, stats, view, onSelectReport, onCreateReport }) {
  // Filter reports based on active view/filter
  const visibleReports = useMemo(() => {
    switch (view) {
      case 'critical': return reports.filter((r) => r.priorityCategory === 'CRITICAL' && r.status !== 'RESOLVED');
      case 'pending':  return reports.filter((r) => ['REPORTED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status));
      case 'resolved': return reports.filter((r) => r.status === 'RESOLVED');
      default:         return reports;
    }
  }, [reports, view]);

  const viewTitle = {
    dashboard: 'All Active Reports',
    all: 'All Reports',
    analytics: 'Analytics',
    critical: '🔴 Critical Leaks',
    pending: '🔧 Pending Repairs',
    resolved: '✅ Resolved Reports',
  }[view] || 'Reports';

  const dailyLoss = stats.estimatedDailyLossLitres
    ? (stats.estimatedDailyLossLitres / 1000).toFixed(1) + ' kL'
    : '—';

  const totalSaved = stats.estimatedWaterSavedLitres
    ? (stats.estimatedWaterSavedLitres / 1000).toFixed(1) + ' kL'
    : '—';

  if (view === 'analytics') {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">📈 Analytics</div>
          <div className="page-subtitle">Distribution and statistics of reported leaks.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PriorityChart reports={reports} />
          <div className="chart-card">
            <div className="card-title">Status Overview</div>
            <StatusChart reports={reports} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-title">Water Loss Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div className="detail-key">Est. Daily Loss (Active)</div>
                <div className="stat-value" style={{ fontSize: '1.6rem' }}>{dailyLoss}</div>
                <div className="text-muted">litres per day (estimated)</div>
              </div>
              <div>
                <div className="detail-key">Est. Water Saved (Resolved)</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: '#16a34a' }}>{totalSaved}</div>
                <div className="text-muted">since first report (estimated)</div>
              </div>
              <div>
                <div className="detail-key">Resolved Reports</div>
                <div className="stat-value" style={{ fontSize: '1.6rem' }}>{stats.resolved || 0}</div>
                <div className="text-muted">completed repairs</div>
              </div>
            </div>
            <div className="disclaimer-box" style={{ marginTop: 16 }}>
              ⚠️ <strong>Disclaimer:</strong> Water-loss and water-savings figures are rough estimates based on
              reported flow rates and time intervals. They have not been measured directly and should not be
              presented as verified data. Actual volumes may differ significantly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">
            {view === 'dashboard' ? '📊 Dashboard' : viewTitle}
          </div>
          <div className="page-subtitle">
            {view === 'dashboard'
              ? 'Active leak reports ranked by priority score. Highest urgency first.'
              : `Showing ${visibleReports.length} reports.`}
          </div>
        </div>
        <button className="btn-primary btn-sm" onClick={onCreateReport}>
          + Report Leak
        </button>
      </div>

      {/* Summary Cards — shown on main dashboard only */}
      {view === 'dashboard' && (
        <div className="stats-grid">
          <StatCard
            icon="📋"
            value={stats.total || 0}
            label="Total Reports"
            sub="All time"
            accent="info"
          />
          <StatCard
            icon="🚨"
            value={stats.critical || 0}
            label="Critical (Active)"
            sub="Score 80–100, not resolved"
            accent="critical"
          />
          <StatCard
            icon="🔧"
            value={stats.pending || 0}
            label="Pending Repairs"
            sub="Reported / Assigned / In Progress"
            accent="warning"
          />
          <StatCard
            icon="✅"
            value={stats.resolved || 0}
            label="Resolved"
            sub="Completed repairs"
            accent="success"
          />
          <StatCard
            icon="💧"
            value={dailyLoss}
            label="Est. Daily Loss"
            sub="Active leaks only (L/day est.)"
            accent="water"
          />
          <StatCard
            icon="🌊"
            value={totalSaved}
            label="Est. Water Saved"
            sub="From resolved reports (est.)"
            accent="success"
          />
        </div>
      )}

      {stats.critical > 0 && view === 'dashboard' && (
        <div className="alert-banner">
          🚨 <strong>{stats.critical} critical leak{stats.critical > 1 ? 's' : ''}</strong> require
          immediate attention. Review and assign repair teams as soon as possible.
        </div>
      )}

      <ReportTable
        reports={visibleReports}
        onSelectReport={onSelectReport}
        title={viewTitle}
      />
    </div>
  );
}

// ─── Status Chart (inline) ────────────────────────────────────────────────────
function StatusChart({ reports }) {
  const statusCounts = useMemo(() => {
    const counts = { REPORTED: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    reports.forEach((r) => { if (r.status in counts) counts[r.status]++; });
    return counts;
  }, [reports]);

  const max = Math.max(1, ...Object.values(statusCounts));
  const colors = {
    REPORTED: '#6b7280',
    ASSIGNED: '#2563eb',
    IN_PROGRESS: '#d97706',
    RESOLVED: '#16a34a',
  };
  const labels = {
    REPORTED: 'Reported',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Prog.',
    RESOLVED: 'Resolved',
  };

  return (
    <div className="chart-bar-group">
      {Object.entries(statusCounts).map(([status, count]) => (
        <div key={status} className="chart-col">
          <div className="chart-bar-wrap">
            <div
              className="chart-bar"
              style={{
                height: `${(count / max) * 100}%`,
                background: colors[status],
              }}
            />
          </div>
          <div className="chart-bar-label" style={{ color: colors[status] }}>{labels[status]}</div>
          <div className="chart-bar-count">{count}</div>
        </div>
      ))}
    </div>
  );
}
