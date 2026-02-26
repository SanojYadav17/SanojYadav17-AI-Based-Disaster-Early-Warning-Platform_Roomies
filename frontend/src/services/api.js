import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── API Functions ──────────────────────────────────────────

export const getHealth = () => api.get('/health');

export const getDashboardMetrics = () => api.get('/dashboard/metrics');

export const getRegions = () => api.get('/regions');

export const predictRisk = (data) => api.post('/predict-risk', data);

export const ingestData = (data) => api.post('/ingest-data', data);

export const getActiveAlerts = (limit = 50) => api.get(`/alerts/active?limit=${limit}`);

export const getAlertHistory = (regionId = null, limit = 100) => {
  let url = `/alerts/history?limit=${limit}`;
  if (regionId) url += `&region_id=${regionId}`;
  return api.get(url);
};

export const resolveAlert = (alertId) => api.post(`/alerts/${alertId}/resolve`);

export const generateAlert = (data) => api.post('/generate-alert', data);

export const getPredictions = (regionId = null, limit = 50) => {
  let url = `/predictions?limit=${limit}`;
  if (regionId) url += `&region_id=${regionId}`;
  return api.get(url);
};

export const getModels = () => api.get('/models');

export const retrainModel = () => api.post('/models/retrain');

export default api;
