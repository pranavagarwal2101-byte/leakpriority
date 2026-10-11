import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { getAllReports, getDashboardStats, resetToSampleData } from './services/reportService';
import Dashboard from './components/Dashboard';
import ReportDetailModal from './components/ReportDetailModal';
import CreateReportModal from './components/CreateReportModal';
import ToastContainer from './components/ToastContainer';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const r = await getAllReports();
      setReports(r);
      const s = await getDashboardStats(r);
      setStats(s);
      return r;
    } catch (err) {
      console.error('Failed to load reports:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getAllReports().then(async (r) => {
      if (!ignore) {
        setReports(r);
        const s = await getDashboardStats(r);
        if (!ignore) setStats(s);
      }
    }).catch(console.error);
    return () => { ignore = true; };
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleReportUpdated = useCallback(async () => {
    const fresh = await loadData();
    if (selectedReport) {
      const updated = fresh.find((r) => r.id === selectedReport.id);
      setSelectedReport(updated || null);
    }
  }, [loadData, selectedReport]);

  const handleReset = async () => {
    resetToSampleData();
    await loadData();
    addToast('Data reset to sample reports.', 'success');
  };

  const criticalCount = stats.critical || 0;

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <a className="header-brand" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">💧</div>
          LeakPriority
        </a>
        <span className="header-tagline">Smart Water Leak Prioritization</span>
        <div className="header-actions">
          <button className="btn-secondary btn-sm" onClick={handleReset} title="Reset to sample data">
            ↺ Reset Demo
          </button>
          <button className="btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            + Report Leak
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <span className="nav-label">Navigation</span>
        <button
          className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-item ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          🗂 All Reports
          {criticalCount > 0 && <span className="nav-badge">{criticalCount}</span>}
        </button>
        <button
          className={`nav-item ${view === 'analytics' ? 'active' : ''}`}
          onClick={() => setView('analytics')}
        >
          📈 Analytics
        </button>

        <span className="nav-label" style={{ marginTop: 12 }}>Quick Filters</span>
        <button className="nav-item" onClick={() => setView('critical')}>🔴 Critical</button>
        <button className="nav-item" onClick={() => setView('pending')}>🟡 Pending</button>
        <button className="nav-item" onClick={() => setView('resolved')}>✅ Resolved</button>

        <div className="sidebar-footer">
          LeakPriority v1.0 · MVP
          <br />Scores are decision-support estimates only.
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Dashboard
          reports={reports}
          stats={stats}
          view={view}
          onSelectReport={setSelectedReport}
          onCreateReport={() => setShowCreateModal(true)}
        />
      </main>

      {/* ── Modals ── */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={handleReportUpdated}
          onToast={addToast}
        />
      )}

      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadData();
            setShowCreateModal(false);
            addToast('Leak report created and scored.', 'success');
          }}
          onToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
