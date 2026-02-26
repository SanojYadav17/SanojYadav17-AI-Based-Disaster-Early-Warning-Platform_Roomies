import React, { useState, useEffect } from 'react';
import { getActiveAlerts, getAlertHistory, resolveAlert } from '../services/api';

const DEMO_ALERTS = [
  { id: 1, title: '🔴 HIGH RISK — Flood Alert — Mumbai Coast', severity: 'critical', region_id: 'R001', message: 'Risk score: 78/100. Heavy rainfall detected. Evacuate low-lying areas.', status: 'active', created_at: new Date().toISOString() },
  { id: 2, title: '🟠 Medium Risk — Cyclone Warning — Chennai', severity: 'warning', region_id: 'R003', message: 'Risk score: 62/100. Wind speeds increasing. Prepare emergency supplies.', status: 'active', created_at: new Date().toISOString() },
  { id: 3, title: '🔴 HIGH RISK — Flood Alert — Assam Valley', severity: 'critical', region_id: 'R004', message: 'Risk score: 85/100. River levels critically high. Immediate evacuation.', status: 'active', created_at: new Date().toISOString() },
  { id: 4, title: '🟠 Medium Risk — Earthquake Watch — Uttarakhand', severity: 'warning', region_id: 'R008', message: 'Risk score: 45/100. Seismic activity detected. Stay alert.', status: 'resolved', created_at: new Date(Date.now() - 86400000).toISOString(), resolved_at: new Date().toISOString() },
];

export default function AlertsPanel() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [activeRes, histRes] = await Promise.all([getActiveAlerts(), getAlertHistory()]);
      setActiveAlerts(activeRes.data.alerts || []);
      setHistory(histRes.data.alerts || []);
    } catch (err) {
      setActiveAlerts(DEMO_ALERTS.filter(a => a.status === 'active'));
      setHistory(DEMO_ALERTS);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      fetchAlerts();
    } catch (err) {
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  const displayAlerts = tab === 'active' ? activeAlerts : history;

  return (
    <div>
      <h2 className="page-title">🚨 Alert Center</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className={`btn ${tab === 'active' ? 'btn-danger' : 'btn-primary'}`} onClick={() => setTab('active')}>
          🔴 Active ({activeAlerts.length})
        </button>
        <button className={`btn ${tab === 'history' ? 'btn-warning' : 'btn-primary'}`} onClick={() => setTab('history')}>
          📜 History ({history.length})
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : displayAlerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem' }}>✅</p>
          <p>No {tab} alerts. All clear!</p>
        </div>
      ) : (
        displayAlerts.map((alert, i) => (
          <div key={alert.id || i} className={`alert-item ${alert.severity || 'info'}`}>
            <div style={{ flex: 1 }}>
              <strong>{alert.title}</strong>
              <p style={{ color: '#94a3b8', margin: '0.3rem 0', fontSize: '0.9rem' }}>{alert.message}</p>
              <small style={{ color: '#64748b' }}>Region: {alert.region_id} | {new Date(alert.created_at).toLocaleString()}</small>
              {alert.resolved_at && <small style={{ color: '#22c55e', marginLeft: '1rem' }}>Resolved: {new Date(alert.resolved_at).toLocaleString()}</small>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`risk-badge ${alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low'}`}>
                {alert.severity}
              </span>
              {alert.status === 'active' && (
                <button className="btn btn-success" onClick={() => handleResolve(alert.id)}>✔ Resolve</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
