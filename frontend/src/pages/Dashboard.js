import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { getDashboardMetrics } from '../services/api';

const COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', None: '#64748b', Flood: '#3b82f6', Cyclone: '#8b5cf6', Earthquake: '#f59e0b', Heatwave: '#ef4444' };

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await getDashboardMetrics();
      setMetrics(res.data);
      setError(null);
    } catch (err) {
      setError('Backend not available. Start the server: uvicorn backend.main:app --reload');
      // Demo data fallback
      setMetrics({
        total_regions: 10, total_predictions: 245, active_alerts: 3, total_alerts_history: 42,
        risk_distribution: { Low: 150, Medium: 65, High: 30 },
        disaster_type_counts: { None: 150, Flood: 40, Cyclone: 25, Earthquake: 15, Heatwave: 15 },
        recent_predictions: [
          { region_id: 'R001', disaster_type: 'Flood', risk_score: 78, risk_level: 'High', timestamp: new Date().toISOString() },
          { region_id: 'R003', disaster_type: 'Cyclone', risk_score: 62, risk_level: 'Medium', timestamp: new Date().toISOString() },
          { region_id: 'R005', disaster_type: 'None', risk_score: 15, risk_level: 'Low', timestamp: new Date().toISOString() },
          { region_id: 'R004', disaster_type: 'Flood', risk_score: 85, risk_level: 'High', timestamp: new Date().toISOString() },
          { region_id: 'R007', disaster_type: 'Cyclone', risk_score: 55, risk_level: 'Medium', timestamp: new Date().toISOString() },
        ],
        recent_alerts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  const riskData = metrics ? Object.entries(metrics.risk_distribution).map(([name, value]) => ({ name, value })) : [];
  const disasterData = metrics ? Object.entries(metrics.disaster_type_counts).map(([name, value]) => ({ name, value })) : [];

  return (
    <div>
      <h2 className="page-title">📊 Dashboard Overview</h2>
      {error && <div className="card" style={{marginBottom: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.1)'}}><p>⚠️ {error} — Showing demo data</p></div>}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Monitored Regions</div>
          <div className="stat-value blue">{metrics?.total_regions || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Predictions</div>
          <div className="stat-value blue">{metrics?.total_predictions || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value red">{metrics?.active_alerts || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Alert History</div>
          <div className="stat-value orange">{metrics?.total_alerts_history || 0}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">📊 Risk Distribution</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                {riskData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#888'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-header">🌊 Disaster Types</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={disasterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {disasterData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#3b82f6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="card">
        <div className="card-header">🔮 Recent Predictions</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Disaster Type</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.recent_predictions || []).map((pred, i) => (
              <tr key={i}>
                <td>{pred.region_id}</td>
                <td>{pred.disaster_type}</td>
                <td><strong>{pred.risk_score}</strong>/100</td>
                <td><span className={`risk-badge ${(pred.risk_level || '').toLowerCase()}`}>{pred.risk_level}</span></td>
                <td>{new Date(pred.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
