import React, { useState } from 'react';
import { predictRisk } from '../services/api';

const REGIONS = [
  { id: 'R001', name: 'Mumbai Coast' }, { id: 'R002', name: 'Delhi NCR' },
  { id: 'R003', name: 'Chennai' }, { id: 'R004', name: 'Assam Valley' },
  { id: 'R005', name: 'Rajasthan Desert' }, { id: 'R006', name: 'Kerala Coast' },
  { id: 'R007', name: 'Gujarat Coast' }, { id: 'R008', name: 'Uttarakhand Hills' },
  { id: 'R009', name: 'Odisha Coast' }, { id: 'R010', name: 'Andhra Pradesh' },
];

const DEFAULT_VALUES = {
  region_id: 'R001', temperature_c: 32, rainfall_mm: 80, humidity_pct: 75,
  wind_speed_kmh: 25, pressure_hpa: 1005, river_level_m: 4.5,
  seismic_signal: 0.2, rainfall_gauge_mm: 78, elevation: 14,
  flood_prone: 1, cyclone_prone: 1, earthquake_zone: 3,
};

export default function PredictPage() {
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: isNaN(value) ? value : Number(value) }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predictRisk(form);
      setResult(res.data);
    } catch (err) {
      // Fallback demo result
      const score = Math.min(100, Math.floor(
        form.rainfall_mm * 0.3 + form.wind_speed_kmh * 0.2 +
        (form.river_level_m > 5 ? 30 : 0) + (form.temperature_c > 40 ? 20 : 0) +
        (form.seismic_signal > 1.5 ? 25 : 0)
      ));
      let disaster = 'None', level = 'Low', action = 'Monitor';
      if (form.rainfall_mm > 100 && form.river_level_m > 5) { disaster = 'Flood'; level = 'High'; action = 'Evacuate'; }
      else if (form.wind_speed_kmh > 80) { disaster = 'Cyclone'; level = 'High'; action = 'Evacuate'; }
      else if (form.seismic_signal > 2) { disaster = 'Earthquake'; level = 'Medium'; action = 'Prepare'; }
      else if (form.temperature_c > 42) { disaster = 'Heatwave'; level = 'Medium'; action = 'Prepare'; }
      else if (form.rainfall_mm > 60) { disaster = 'Flood'; level = 'Medium'; action = 'Prepare'; }

      setResult({
        disaster_type: disaster, final_risk_score: score, risk_level: level,
        recommended_action: action, confidence: score / 100, model_version: 'demo_fallback',
        risk_emoji: level === 'Low' ? '🟢' : level === 'Medium' ? '🟠' : '🔴',
        class_probabilities: { [disaster]: score / 100 },
        rule_alerts: score > 70 ? ['Extreme conditions detected'] : [],
      });
      setError('Backend not available — showing demo prediction.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (preset) => {
    const presets = {
      flood: { ...DEFAULT_VALUES, rainfall_mm: 160, river_level_m: 7.2, humidity_pct: 95, region_id: 'R001' },
      cyclone: { ...DEFAULT_VALUES, wind_speed_kmh: 130, pressure_hpa: 970, rainfall_mm: 100, region_id: 'R009' },
      earthquake: { ...DEFAULT_VALUES, seismic_signal: 3.5, earthquake_zone: 5, region_id: 'R004' },
      heatwave: { ...DEFAULT_VALUES, temperature_c: 47, humidity_pct: 20, rainfall_mm: 0, region_id: 'R005' },
      safe: { ...DEFAULT_VALUES, temperature_c: 28, rainfall_mm: 5, wind_speed_kmh: 8, river_level_m: 2.0, seismic_signal: 0.05 },
    };
    setForm(presets[preset] || DEFAULT_VALUES);
    setResult(null);
  };

  return (
    <div>
      <h2 className="page-title">🔮 Disaster Risk Prediction</h2>

      {/* Presets */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setPreset('flood')}>🌊 Flood Scenario</button>
        <button className="btn btn-primary" onClick={() => setPreset('cyclone')}>🌀 Cyclone Scenario</button>
        <button className="btn btn-primary" onClick={() => setPreset('earthquake')}>🌍 Earthquake Scenario</button>
        <button className="btn btn-warning" onClick={() => setPreset('heatwave')}>🔥 Heatwave Scenario</button>
        <button className="btn btn-success" onClick={() => setPreset('safe')}>✅ Safe Conditions</button>
      </div>

      <div className="card">
        <div className="card-header">📝 Enter Weather & Sensor Data</div>
        <form onSubmit={handlePredict}>
          <div className="form-row">
            <div className="form-group">
              <label>Region</label>
              <select name="region_id" value={form.region_id} onChange={handleChange} className="form-select">
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Temperature (°C)</label>
              <input type="number" name="temperature_c" value={form.temperature_c} onChange={handleChange} className="form-input" step="0.1" />
            </div>
            <div className="form-group">
              <label>Rainfall (mm)</label>
              <input type="number" name="rainfall_mm" value={form.rainfall_mm} onChange={handleChange} className="form-input" step="0.1" min="0" />
            </div>
            <div className="form-group">
              <label>Humidity (%)</label>
              <input type="number" name="humidity_pct" value={form.humidity_pct} onChange={handleChange} className="form-input" step="0.1" min="0" max="100" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Wind Speed (km/h)</label>
              <input type="number" name="wind_speed_kmh" value={form.wind_speed_kmh} onChange={handleChange} className="form-input" step="0.1" min="0" />
            </div>
            <div className="form-group">
              <label>Pressure (hPa)</label>
              <input type="number" name="pressure_hpa" value={form.pressure_hpa} onChange={handleChange} className="form-input" step="0.1" />
            </div>
            <div className="form-group">
              <label>River Level (m)</label>
              <input type="number" name="river_level_m" value={form.river_level_m} onChange={handleChange} className="form-input" step="0.1" min="0" />
            </div>
            <div className="form-group">
              <label>Seismic Signal</label>
              <input type="number" name="seismic_signal" value={form.seismic_signal} onChange={handleChange} className="form-input" step="0.01" min="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Elevation (m)</label>
              <input type="number" name="elevation" value={form.elevation} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Flood Prone</label>
              <select name="flood_prone" value={form.flood_prone} onChange={handleChange} className="form-select">
                <option value={1}>Yes</option><option value={0}>No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cyclone Prone</label>
              <select name="cyclone_prone" value={form.cyclone_prone} onChange={handleChange} className="form-select">
                <option value={1}>Yes</option><option value={0}>No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Earthquake Zone</label>
              <select name="earthquake_zone" value={form.earthquake_zone} onChange={handleChange} className="form-select">
                {[1,2,3,4,5].map(z => <option key={z} value={z}>Zone {z}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{marginTop: '1rem'}}>
            {loading ? '⏳ Predicting...' : '🔮 Predict Disaster Risk'}
          </button>
        </form>
      </div>

      {error && <div className="card" style={{marginTop: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.1)'}}><p>⚠️ {error}</p></div>}

      {/* Result */}
      {result && (
        <div className="card" style={{marginTop: '1.5rem'}}>
          <div className="card-header" style={{fontSize: '1.4rem'}}>
            {result.risk_emoji || '📊'} Prediction Result
          </div>
          <div className="result-box">
            <div className="result-row"><span className="result-label">Disaster Type</span><span className="result-value" style={{fontSize: '1.2rem'}}>{result.disaster_type}</span></div>
            <div className="result-row"><span className="result-label">Risk Score</span><span className="result-value" style={{fontSize: '1.5rem', color: result.risk_level === 'High' ? '#ef4444' : result.risk_level === 'Medium' ? '#f59e0b' : '#22c55e'}}>{result.final_risk_score || result.risk_score}/100</span></div>
            <div className="risk-meter"><div className={`risk-meter-fill ${(result.risk_level || '').toLowerCase()}`} style={{width: `${result.final_risk_score || result.risk_score}%`}}></div></div>
            <div className="result-row"><span className="result-label">Risk Level</span><span className={`risk-badge ${(result.risk_level || '').toLowerCase()}`}>{result.risk_level}</span></div>
            <div className="result-row"><span className="result-label">Recommended Action</span><span className="result-value">{result.recommended_action}</span></div>
            <div className="result-row"><span className="result-label">Confidence</span><span className="result-value">{((result.confidence || 0) * 100).toFixed(1)}%</span></div>
            <div className="result-row"><span className="result-label">Model Version</span><span className="result-value">{result.model_version}</span></div>

            {/* Class Probabilities */}
            {result.class_probabilities && (
              <div style={{marginTop: '1rem'}}>
                <strong>Class Probabilities:</strong>
                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap'}}>
                  {Object.entries(result.class_probabilities).map(([cls, prob]) => (
                    <span key={cls} className="risk-badge low" style={{background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid #3b82f6'}}>
                      {cls}: {(prob * 100).toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rule Alerts */}
            {result.rule_alerts && result.rule_alerts.length > 0 && (
              <div style={{marginTop: '1rem'}}>
                <strong>⚠️ Safety Threshold Alerts:</strong>
                {result.rule_alerts.map((alert, i) => (
                  <p key={i} style={{color: '#f59e0b', fontSize: '0.9rem', marginTop: '0.3rem'}}>• {alert}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
