import React, { useState, useEffect } from 'react';
import { getModels, retrainModel, getDashboardMetrics } from '../services/api';

export default function AdminPanel() {
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsRes, metricsRes] = await Promise.all([getModels(), getDashboardMetrics()]);
      setModels(modelsRes.data.models || []);
      setActiveModel(modelsRes.data.active);
      setMetrics(metricsRes.data);
    } catch (err) {
      // Demo data
      setModels([
        { version: 'v20260225_120000', model_type: 'ensemble', accuracy: 0.89, roc_auc: 0.94, f1: 0.87, training_samples: 8000, is_active: true, created_at: '2026-02-25T12:00:00' },
        { version: 'v20260220_100000', model_type: 'random_forest', accuracy: 0.85, roc_auc: 0.91, f1: 0.83, training_samples: 8000, is_active: false, created_at: '2026-02-20T10:00:00' },
      ]);
      setActiveModel({ version: 'v20260225_120000', model_type: 'ensemble', f1: 0.87 });
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const res = await retrainModel();
      setRetrainResult(res.data);
      fetchData();
    } catch (err) {
      setRetrainResult({ status: 'error', message: 'Retraining failed. Make sure the backend is running.' });
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">⚙️ Admin Panel</h2>

      {/* System Status */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Active Model</div>
          <div className="stat-value blue" style={{fontSize: '1.2rem'}}>{activeModel?.model_type || 'N/A'}</div>
          <small style={{color: '#94a3b8'}}>{activeModel?.version || ''}</small>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Model F1 Score</div>
          <div className="stat-value green">{activeModel?.f1 || 'N/A'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Regions</div>
          <div className="stat-value blue">{metrics?.total_regions || 10}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value orange">{metrics?.total_alerts_history || 0}</div>
        </div>
      </div>

      {/* Retrain Button */}
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">🔄 Model Retraining</div>
        <p style={{color: '#94a3b8', marginBottom: '1rem'}}>Trigger a full ML pipeline retraining with latest data.</p>
        <button className="btn btn-danger" onClick={handleRetrain} disabled={retraining}>
          {retraining ? '⏳ Retraining in progress...' : '🚀 Retrain Model'}
        </button>
        {retrainResult && (
          <div className="result-box" style={{marginTop: '1rem'}}>
            <p><strong>Status:</strong> {retrainResult.status}</p>
            {retrainResult.version && <p><strong>New Version:</strong> {retrainResult.version}</p>}
            {retrainResult.message && <p style={{color: '#f59e0b'}}>{retrainResult.message}</p>}
          </div>
        )}
      </div>

      {/* Model Versions Table */}
      <div className="card">
        <div className="card-header">📦 Model Versions</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Type</th>
              <th>Accuracy</th>
              <th>ROC-AUC</th>
              <th>F1</th>
              <th>Samples</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>No models found. Train a model first.</td></tr>
            ) : (
              models.map((m, i) => (
                <tr key={i}>
                  <td><code>{m.version}</code></td>
                  <td>{m.model_type}</td>
                  <td>{m.accuracy?.toFixed(4) || 'N/A'}</td>
                  <td>{m.roc_auc?.toFixed(4) || 'N/A'}</td>
                  <td><strong>{m.f1?.toFixed(4) || 'N/A'}</strong></td>
                  <td>{m.training_samples || 'N/A'}</td>
                  <td><span className={`risk-badge ${m.is_active ? 'low' : 'medium'}`}>{m.is_active ? '✅ Active' : 'Inactive'}</span></td>
                  <td>{m.created_at ? new Date(m.created_at).toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Configuration */}
      <div className="card" style={{marginTop: '1.5rem'}}>
        <div className="card-header">📋 System Configuration</div>
        <div className="result-box">
          <div className="result-row"><span className="result-label">Risk Bands</span><span className="result-value">🟢 0-40 | 🟠 41-70 | 🔴 71-100</span></div>
          <div className="result-row"><span className="result-label">Alert Channels</span><span className="result-value">Web Dashboard (Email/SMS simulated)</span></div>
          <div className="result-row"><span className="result-label">Rate Limit</span><span className="result-value">60 min per region</span></div>
          <div className="result-row"><span className="result-label">Data Refresh</span><span className="result-value">Every 15 minutes</span></div>
          <div className="result-row"><span className="result-label">Retrain Interval</span><span className="result-value">Every 24 hours</span></div>
        </div>
      </div>

      {/* Model Limitations */}
      <div className="card" style={{marginTop: '1.5rem'}}>
        <div className="card-header">⚠️ Model Limitations & Ethics</div>
        <div style={{color: '#94a3b8', lineHeight: 1.8}}>
          <p>• Predictions are based on historical patterns and may not capture unprecedented events.</p>
          <p>• Earthquake prediction has inherently lower accuracy due to the chaotic nature of seismic activity.</p>
          <p>• Risk scores should be used alongside expert judgment, not as the sole decision-making tool.</p>
          <p>• Model performance may vary across regions — regular bias audits are recommended.</p>
          <p>• Confidence scores indicate model certainty, not event certainty. Low confidence predictions should be treated with caution.</p>
          <p>• The system uses simulated sensor data for demonstration — production use requires real data integration.</p>
        </div>
      </div>
    </div>
  );
}
