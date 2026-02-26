import React, { useState, useEffect } from 'react';
import { predictRisk } from '../services/api';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & DATA
═══════════════════════════════════════════════════════════════ */

const REGIONS = [
  { id: 'R001', name: 'Mumbai Coast', lat: 19.0760, lng: 72.8777, population: 1250000 },
  { id: 'R002', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, population: 2500000 },
  { id: 'R003', name: 'Chennai', lat: 13.0827, lng: 80.2707, population: 890000 },
  { id: 'R004', name: 'Assam Valley', lat: 26.1445, lng: 91.7362, population: 560000 },
  { id: 'R005', name: 'Rajasthan Desert', lat: 26.9124, lng: 75.7873, population: 320000 },
  { id: 'R006', name: 'Kerala Coast', lat: 9.9312, lng: 76.2673, population: 780000 },
  { id: 'R007', name: 'Gujarat Coast', lat: 21.1702, lng: 72.8311, population: 920000 },
  { id: 'R008', name: 'Uttarakhand Hills', lat: 30.0668, lng: 79.0193, population: 450000 },
  { id: 'R009', name: 'Odisha Coast', lat: 20.2961, lng: 85.8245, population: 680000 },
  { id: 'R010', name: 'Andhra Pradesh', lat: 15.9129, lng: 79.7400, population: 750000 },
];

const DEFAULT_VALUES = {
  region_id: 'R001', temperature_c: 32, rainfall_mm: 80, humidity_pct: 75,
  wind_speed_kmh: 25, pressure_hpa: 1005, river_level_m: 4.5,
  seismic_signal: 0.2, rainfall_gauge_mm: 78, elevation: 14,
  flood_prone: 1, cyclone_prone: 1, earthquake_zone: 3,
};

const PRESETS = [
  { key: 'flood', label: 'Flood', icon: 'fa-solid fa-house-flood-water', color: '#3b82f6', desc: 'Heavy rainfall + high river' },
  { key: 'cyclone', label: 'Cyclone', icon: 'fa-solid fa-wind', color: '#8b5cf6', desc: 'High wind + low pressure' },
  { key: 'earthquake', label: 'Earthquake', icon: 'fa-solid fa-house-crack', color: '#f59e0b', desc: 'Seismic activity' },
  { key: 'heatwave', label: 'Heatwave', icon: 'fa-solid fa-temperature-arrow-up', color: '#ef4444', desc: 'Extreme temperature' },
  { key: 'safe', label: 'Safe', icon: 'fa-solid fa-shield-halved', color: '#10b981', desc: 'Normal conditions' },
];

const PRESET_DATA = {
  flood: { ...DEFAULT_VALUES, rainfall_mm: 160, river_level_m: 7.2, humidity_pct: 95, region_id: 'R001' },
  cyclone: { ...DEFAULT_VALUES, wind_speed_kmh: 130, pressure_hpa: 970, rainfall_mm: 100, region_id: 'R009' },
  earthquake: { ...DEFAULT_VALUES, seismic_signal: 3.5, earthquake_zone: 5, region_id: 'R004' },
  heatwave: { ...DEFAULT_VALUES, temperature_c: 47, humidity_pct: 20, rainfall_mm: 0, region_id: 'R005' },
  safe: { ...DEFAULT_VALUES, temperature_c: 28, rainfall_mm: 5, wind_speed_kmh: 8, river_level_m: 2.0, seismic_signal: 0.05 },
};

const FIELD_CONFIG = {
  temperature_c: { label: 'Temperature', unit: '°C', icon: 'fa-solid fa-temperature-half', warning: 40, danger: 45, color: '#ef4444' },
  rainfall_mm: { label: 'Rainfall', unit: 'mm', icon: 'fa-solid fa-cloud-rain', warning: 100, danger: 150, color: '#3b82f6' },
  humidity_pct: { label: 'Humidity', unit: '%', icon: 'fa-solid fa-droplet', warning: 85, danger: 95, color: '#06b6d4' },
  wind_speed_kmh: { label: 'Wind Speed', unit: 'km/h', icon: 'fa-solid fa-wind', warning: 80, danger: 120, color: '#8b5cf6' },
  pressure_hpa: { label: 'Pressure', unit: 'hPa', icon: 'fa-solid fa-gauge-high', warning: 980, danger: 960, invertWarning: true, color: '#f59e0b' },
  river_level_m: { label: 'River Level', unit: 'm', icon: 'fa-solid fa-water', warning: 5, danger: 7, color: '#0ea5e9' },
  seismic_signal: { label: 'Seismic', unit: 'mag', icon: 'fa-solid fa-wave-square', warning: 2, danger: 4, color: '#f97316' },
  elevation: { label: 'Elevation', unit: 'm', icon: 'fa-solid fa-mountain', color: '#84cc16' },
};

const DISASTER_CONFIG = {
  Flood: { icon: 'fa-solid fa-house-flood-water', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  Cyclone: { icon: 'fa-solid fa-wind', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  Earthquake: { icon: 'fa-solid fa-house-crack', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  Heatwave: { icon: 'fa-solid fa-sun', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  Drought: { icon: 'fa-solid fa-sun-plant-wilt', color: '#d97706', bg: 'rgba(217,119,6,0.15)' },
  Landslide: { icon: 'fa-solid fa-hill-rockslide', color: '#78716c', bg: 'rgba(120,113,108,0.15)' },
  None: { icon: 'fa-solid fa-shield-halved', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const RISK_TIPS = {
  Flood: ['Move to higher ground immediately', 'Avoid flood waters', 'Disconnect electrical appliances', 'Keep emergency kit ready'],
  Cyclone: ['Stay indoors away from windows', 'Secure loose objects', 'Stock up water and food', 'Keep flashlights ready'],
  Earthquake: ['Drop, Cover, Hold On', 'Stay away from windows', 'Move to open area if outside', 'Prepare for aftershocks'],
  Heatwave: ['Stay hydrated', 'Avoid outdoor activities', 'Wear light clothing', 'Check on elderly people'],
};

const RISK_COLOR = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };

export default function PredictPage() {
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [activePreset, setActivePreset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('result');

  useEffect(() => {
    const saved = localStorage.getItem('prediction_history');
    if (saved) {
      try { setPredictionHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'region_id' || name === 'flood_prone' || name === 'cyclone_prone' || name === 'earthquake_zone') {
      setForm(prev => ({ ...prev, [name]: isNaN(value) ? value : Number(value) }));
      setActivePreset(null);
      return;
    }
    if (value === '' || value === '-') {
      setForm(prev => ({ ...prev, [name]: value }));
      setActivePreset(null);
      return;
    }
    if (!/^-?\d*\.?\d*$/.test(value)) return;
    if (value.endsWith('.')) {
      setForm(prev => ({ ...prev, [name]: value }));
    } else {
      setForm(prev => ({ ...prev, [name]: parseFloat(value) }));
    }
    setActivePreset(null);
  };

  const getFieldStatus = (field) => {
    const config = FIELD_CONFIG[field];
    if (!config) return 'normal';
    const value = parseFloat(form[field]);
    if (isNaN(value)) return 'normal';
    if (config.danger && value >= config.danger) return 'danger';
    if (config.warning && value >= config.warning) return 'warning';
    return 'normal';
  };

  const generateRiskFactors = () => {
    const factors = [];
    if (form.rainfall_mm > 80) factors.push({ label: 'Heavy Rainfall', value: form.rainfall_mm, unit: 'mm', severity: form.rainfall_mm > 150 ? 'high' : 'medium', icon: 'fa-cloud-rain' });
    if (form.wind_speed_kmh > 60) factors.push({ label: 'High Wind Speed', value: form.wind_speed_kmh, unit: 'km/h', severity: form.wind_speed_kmh > 100 ? 'high' : 'medium', icon: 'fa-wind' });
    if (form.river_level_m > 4) factors.push({ label: 'Elevated River Level', value: form.river_level_m, unit: 'm', severity: form.river_level_m > 6 ? 'high' : 'medium', icon: 'fa-water' });
    if (form.seismic_signal > 1.5) factors.push({ label: 'Seismic Activity', value: form.seismic_signal, unit: '', severity: form.seismic_signal > 3 ? 'high' : 'medium', icon: 'fa-house-crack' });
    if (form.temperature_c > 38) factors.push({ label: 'Extreme Heat', value: form.temperature_c, unit: '°C', severity: form.temperature_c > 45 ? 'high' : 'medium', icon: 'fa-temperature-high' });
    if (form.humidity_pct > 85) factors.push({ label: 'High Humidity', value: form.humidity_pct, unit: '%', severity: 'low', icon: 'fa-droplet' });
    if (form.pressure_hpa < 1000) factors.push({ label: 'Low Pressure', value: form.pressure_hpa, unit: 'hPa', severity: form.pressure_hpa < 980 ? 'high' : 'medium', icon: 'fa-gauge' });
    return factors;
  };

  const savePrediction = (result) => {
    const regionObj = REGIONS.find(r => r.id === form.region_id);
    const prediction = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      form: { ...form },
      region_name: regionObj?.name || form.region_id,
      result: { ...result }
    };
    const newHistory = [prediction, ...predictionHistory].slice(0, 50);
    setPredictionHistory(newHistory);
    localStorage.setItem('prediction_history', JSON.stringify(newHistory));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const regionObj = REGIONS.find(r => r.id === form.region_id);
      const payload = { ...form, region_name: regionObj ? regionObj.name : form.region_id };
      const res = await predictRisk(payload);
      setResult(res.data);
      savePrediction(res.data);
    } catch (err) {
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
      const fallbackResult = {
        disaster_type: disaster, final_risk_score: score, risk_level: level,
        recommended_action: action, confidence: score / 100, model_version: 'demo_fallback',
        class_probabilities: { [disaster]: score / 100 },
        rule_alerts: score > 70 ? ['Extreme conditions detected'] : [],
      };
      setResult(fallbackResult);
      savePrediction(fallbackResult);
      setError('Backend not available. Showing demo prediction.');
    } finally { setLoading(false); }
  };

  const setPreset = (key) => {
    setForm(PRESET_DATA[key] || DEFAULT_VALUES);
    setActivePreset(key);
    setResult(null);
    setError(null);
  };

  const clearHistory = () => {
    setPredictionHistory([]);
    localStorage.removeItem('prediction_history');
  };

  const loadFromHistory = (item) => {
    setForm(item.form);
    setResult(item.result);
    setShowHistory(false);
  };

  const exportReport = () => {
    if (!result) return;
    const regionObj = REGIONS.find(r => r.id === form.region_id);
    const report = `
================================================================================
                    DISASTER RISK PREDICTION REPORT
================================================================================
Generated: ${new Date().toLocaleString()}
Region: ${regionObj?.name || form.region_id}
Population: ${regionObj?.population?.toLocaleString() || 'N/A'}

--------------------------------------------------------------------------------
                           INPUT PARAMETERS
--------------------------------------------------------------------------------
Temperature:      ${form.temperature_c}°C
Rainfall:         ${form.rainfall_mm} mm
Humidity:         ${form.humidity_pct}%
Wind Speed:       ${form.wind_speed_kmh} km/h
Pressure:         ${form.pressure_hpa} hPa
River Level:      ${form.river_level_m} m
Seismic Signal:   ${form.seismic_signal}
Elevation:        ${form.elevation} m
Flood Prone:      ${form.flood_prone ? 'Yes' : 'No'}
Cyclone Prone:    ${form.cyclone_prone ? 'Yes' : 'No'}
Earthquake Zone:  Zone ${form.earthquake_zone}

--------------------------------------------------------------------------------
                          PREDICTION RESULTS
--------------------------------------------------------------------------------
Disaster Type:       ${result.disaster_type}
Risk Score:          ${result.final_risk_score || result.risk_score}/100
Risk Level:          ${result.risk_level}
Confidence:          ${((result.confidence || 0) * 100).toFixed(1)}%
Recommended Action:  ${result.recommended_action}
Model Version:       ${result.model_version}

--------------------------------------------------------------------------------
                           SAFETY GUIDELINES
--------------------------------------------------------------------------------
${RISK_TIPS[result.disaster_type]?.map((tip, i) => `${i + 1}. ${tip}`).join('\n') || 'Follow local authority guidelines.'}

================================================================================
       This report was generated by the AI Disaster Prediction System.
                    For emergencies, contact local authorities.
================================================================================
`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disaster_report_${regionObj?.name?.replace(/\s+/g, '_') || form.region_id}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const riskScore = result?.final_risk_score || result?.risk_score || 0;
  const riskLevel = (result?.risk_level || 'low').toLowerCase();
  const disasterConfig = DISASTER_CONFIG[result?.disaster_type] || DISASTER_CONFIG['None'];
  const riskFactors = generateRiskFactors();
  const regionObj = REGIONS.find(r => r.id === form.region_id);

  const styles = {
    presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
    presetCard: { padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    presetCardActive: { borderColor: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)', boxShadow: '0 0 0 2px rgba(59,130,246,0.2)' },
    presetIcon: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' },
    regionInfo: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(59,130,246,0.15)' },
    fieldWithStatus: { position: 'relative' },
    fieldIndicator: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' },
    tabsContainer: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' },
    tab: { padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', transition: 'all 0.2s ease', border: 'none', background: 'transparent' },
    tabActive: { color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', borderBottom: '2px solid var(--accent-blue)' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
    statCard: { padding: '1rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' },
    riskFactorCard: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid var(--border-color)' },
    tipCard: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', marginBottom: '0.5rem', border: '1px solid rgba(34,197,94,0.2)' },
    actionButtons: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' },
    historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
    modalContent: { background: 'var(--card-bg)', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--border-color)' },
    modalBody: { padding: '1.25rem', overflowY: 'auto', flex: 1 },
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem'}}>
        <div>
          <h2 className="page-title">
            <span className="page-title-icon purple"><i className="fa-solid fa-wand-magic-sparkles"></i></span>
            AI Disaster Risk Prediction
          </h2>
          <p className="page-description">Advanced ML-powered disaster risk assessment with real-time sensor data analysis.</p>
        </div>
        <div style={{display:'flex', gap:'0.75rem'}}>
          <button className="btn btn-ghost" onClick={() => setShowHistory(true)} style={{position:'relative'}}>
            <i className="fa-solid fa-clock-rotate-left"></i> History
            {predictionHistory.length > 0 && (
              <span style={{position:'absolute', top:'-6px', right:'-6px', background:'var(--accent-blue)', color:'white', borderRadius:'50%', width:'18px', height:'18px', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center'}}>{predictionHistory.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Presets */}
      <div style={styles.presetGrid}>
        {PRESETS.map(p => (
          <div
            key={p.key}
            style={{...styles.presetCard, ...(activePreset === p.key ? styles.presetCardActive : {})}}
            onClick={() => setPreset(p.key)}
            onMouseEnter={e => { if (activePreset !== p.key) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={e => { if (activePreset !== p.key) { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}}
          >
            <div style={{...styles.presetIcon, background: `${p.color}15`, color: p.color}}>
              <i className={p.icon}></i>
            </div>
            <div>
              <div style={{fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)'}}>{p.label}</div>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'2px'}}>{p.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Region Info */}
      {regionObj && (
        <div style={styles.regionInfo}>
          <div style={{...styles.presetIcon, background:'rgba(59,130,246,0.15)', color:'var(--accent-blue)', width:'44px', height:'44px', fontSize:'1.2rem'}}>
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600, fontSize:'1rem', color:'var(--text-primary)'}}>{regionObj.name}</div>
            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', display:'flex', gap:'1.5rem', marginTop:'4px'}}>
              <span><i className="fa-solid fa-users" style={{marginRight:'4px'}}></i>{regionObj.population?.toLocaleString()} population</span>
              <span><i className="fa-solid fa-map-pin" style={{marginRight:'4px'}}></i>{regionObj.lat?.toFixed(4)}, {regionObj.lng?.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="card animate-in">
        <div className="card-header">
          <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
            <span className="card-header-icon" style={{background:'rgba(59,130,246,0.12)', color:'var(--accent-blue)'}}><i className="fa-solid fa-sliders"></i></span>
            Weather &amp; Environmental Data
          </div>
          <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}><i className="fa-solid fa-circle-info" style={{marginRight:'4px'}}></i>Fields with thresholds show warning indicators</span>
        </div>
        <form onSubmit={handlePredict}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Region</label>
              <select name="region_id" value={form.region_id} onChange={handleChange} className="form-select">
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">Temperature (°C)</label>
              <input type="text" inputMode="decimal" name="temperature_c" value={form.temperature_c} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('temperature_c') === 'danger' ? '#ef4444' : getFieldStatus('temperature_c') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('temperature_c') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('temperature_c') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('temperature_c') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">Rainfall (mm)</label>
              <input type="text" inputMode="decimal" name="rainfall_mm" value={form.rainfall_mm} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('rainfall_mm') === 'danger' ? '#ef4444' : getFieldStatus('rainfall_mm') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('rainfall_mm') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('rainfall_mm') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('rainfall_mm') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
            <div className="form-group">
              <label className="form-label">Humidity (%)</label>
              <input type="text" inputMode="decimal" name="humidity_pct" value={form.humidity_pct} onChange={handleChange} className="form-input" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">Wind Speed (km/h)</label>
              <input type="text" inputMode="decimal" name="wind_speed_kmh" value={form.wind_speed_kmh} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('wind_speed_kmh') === 'danger' ? '#ef4444' : getFieldStatus('wind_speed_kmh') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('wind_speed_kmh') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('wind_speed_kmh') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('wind_speed_kmh') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">Pressure (hPa)</label>
              <input type="text" inputMode="decimal" name="pressure_hpa" value={form.pressure_hpa} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('pressure_hpa') === 'danger' ? '#ef4444' : getFieldStatus('pressure_hpa') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('pressure_hpa') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('pressure_hpa') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('pressure_hpa') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">River Level (m)</label>
              <input type="text" inputMode="decimal" name="river_level_m" value={form.river_level_m} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('river_level_m') === 'danger' ? '#ef4444' : getFieldStatus('river_level_m') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('river_level_m') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('river_level_m') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('river_level_m') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
            <div className="form-group" style={styles.fieldWithStatus}>
              <label className="form-label">Seismic Signal</label>
              <input type="text" inputMode="decimal" name="seismic_signal" value={form.seismic_signal} onChange={handleChange} className="form-input" style={{paddingRight: '2rem', borderColor: getFieldStatus('seismic_signal') === 'danger' ? '#ef4444' : getFieldStatus('seismic_signal') === 'warning' ? '#f59e0b' : undefined}} />
              {getFieldStatus('seismic_signal') !== 'normal' && <span style={{...styles.fieldIndicator, color: getFieldStatus('seismic_signal') === 'danger' ? '#ef4444' : '#f59e0b'}}><i className={`fa-solid ${getFieldStatus('seismic_signal') === 'danger' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}`}></i></span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Elevation (m)</label>
              <input type="text" inputMode="decimal" name="elevation" value={form.elevation} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Flood Prone Zone</label>
              <select name="flood_prone" value={form.flood_prone} onChange={handleChange} className="form-select">
                <option value={1}>Yes - High Risk Area</option><option value={0}>No - Normal Area</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cyclone Prone Zone</label>
              <select name="cyclone_prone" value={form.cyclone_prone} onChange={handleChange} className="form-select">
                <option value={1}>Yes - Coastal Area</option><option value={0}>No - Inland Area</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Earthquake Zone</label>
              <select name="earthquake_zone" value={form.earthquake_zone} onChange={handleChange} className="form-select">
                {[1,2,3,4,5].map(z => <option key={z} value={z}>Zone {z} {z >= 4 ? '(High Risk)' : z >= 3 ? '(Moderate)' : '(Low)'}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:'1.25rem', display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap'}}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{minWidth:'180px'}}>
              {loading ? (
                <><span className="spinner" style={{width:16,height:16,borderWidth:2,marginRight:6}}></span> Analyzing...</>
              ) : (
                <><i className="fa-solid fa-brain"></i> Run AI Prediction</>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setForm(DEFAULT_VALUES); setResult(null); setActivePreset(null); }}>
              <i className="fa-solid fa-rotate-left"></i> Reset
            </button>
            {riskFactors.length > 0 && (
              <span style={{fontSize:'0.8rem', color:'var(--text-muted)', marginLeft:'auto'}}>
                <i className="fa-solid fa-exclamation-triangle" style={{color:'#f59e0b', marginRight:'6px'}}></i>
                {riskFactors.length} risk factor{riskFactors.length !== 1 ? 's' : ''} detected
              </span>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="alert-banner warning" style={{marginTop:'1rem'}}>
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card animate-in" style={{marginTop: '1.5rem'}}>
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
              <span className="card-header-icon" style={{background: `${disasterConfig.color}20`, color: disasterConfig.color}}>
                <i className={disasterConfig.icon}></i>
              </span>
              <span style={{fontWeight:600}}>Prediction Analysis</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
              <span className={`risk-badge ${riskLevel}`}>{result.risk_level}</span>
              <button className="btn btn-ghost" onClick={exportReport} style={{fontSize:'0.8rem', padding:'0.4rem 0.75rem'}}>
                <i className="fa-solid fa-download"></i> Export
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabsContainer}>
            {[
              { key: 'result', label: 'Overview', icon: 'fa-chart-pie' },
              { key: 'factors', label: 'Risk Factors', icon: 'fa-list-check' },
              { key: 'tips', label: 'Safety Tips', icon: 'fa-shield-halved' }
            ].map(t => (
              <button key={t.key} style={{...styles.tab, ...(activeTab === t.key ? styles.tabActive : {})}} onClick={() => setActiveTab(t.key)}>
                <i className={`fa-solid ${t.icon}`} style={{marginRight:'6px'}}></i>{t.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'result' && (
            <>
              {/* Stats Grid */}
              <div style={styles.statsGrid}>
                <div style={{...styles.statCard, borderColor: disasterConfig.color + '40'}}>
                  <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>Risk Score</div>
                  <div style={{fontSize:'2rem', fontWeight:700, color: RISK_COLOR[result.risk_level]}}>{riskScore}</div>
                  <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>out of 100</div>
                </div>
                <div style={{...styles.statCard, borderColor: disasterConfig.color + '40'}}>
                  <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>Disaster Type</div>
                  <div style={{fontSize:'1.1rem', fontWeight:600, color:'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}>
                    <i className={disasterConfig.icon} style={{color: disasterConfig.color}}></i>
                    {result.disaster_type}
                  </div>
                </div>
                <div style={{...styles.statCard, borderColor: disasterConfig.color + '40'}}>
                  <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>Confidence</div>
                  <div style={{fontSize:'1.5rem', fontWeight:700, color:'var(--accent-blue)'}}>{((result.confidence || 0) * 100).toFixed(1)}%</div>
                </div>
                <div style={{...styles.statCard, borderColor: disasterConfig.color + '40'}}>
                  <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>Action</div>
                  <div style={{fontSize:'1rem', fontWeight:600, color: RISK_COLOR[result.risk_level]}}>{result.recommended_action}</div>
                </div>
              </div>

              {/* Risk Gauge */}
              <div style={{display:'flex', justifyContent:'center', marginBottom:'1.5rem'}}>
                <div className={`risk-circle ${riskLevel}`} style={{'--score-pct': `${riskScore}%`}}>
                  <div className="risk-circle-inner">
                    <div className="risk-circle-score" style={{color: RISK_COLOR[result.risk_level]}}>{riskScore}</div>
                    <div className="risk-circle-label">Risk Score</div>
                  </div>
                </div>
              </div>

              <div className="risk-meter" style={{marginBottom:'1.25rem'}}>
                <div className={`risk-meter-fill ${riskLevel}`} style={{width: `${riskScore}%`}}></div>
              </div>

              {/* Class Probabilities */}
              {result.class_probabilities && Object.keys(result.class_probabilities).length > 0 && (
                <div style={{marginTop:'1.25rem'}}>
                  <div style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.6rem'}}>
                    <i className="fa-solid fa-chart-bar" style={{marginRight:6}}></i>Probability Distribution
                  </div>
                  <div className="prob-bar-container">
                    {Object.entries(result.class_probabilities).sort((a,b) => b[1] - a[1]).map(([cls, prob]) => (
                      <div key={cls} className="prob-bar-row">
                        <span className="prob-bar-label"><i className={DISASTER_CONFIG[cls]?.icon || 'fa-solid fa-circle'} style={{marginRight:'6px', color: DISASTER_CONFIG[cls]?.color}}></i>{cls}</span>
                        <div className="prob-bar-track">
                          <div className="prob-bar-fill" style={{width: `${Math.max(2, prob * 100)}%`, background: DISASTER_CONFIG[cls]?.color || 'var(--accent-blue)'}}></div>
                        </div>
                        <span className="prob-bar-value">{(prob * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Risk Factors Tab */}
          {activeTab === 'factors' && (
            <div>
              {riskFactors.length > 0 ? (
                <>
                  <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1rem'}}>
                    The following environmental factors are contributing to the elevated risk level:
                  </p>
                  {riskFactors.map((f, i) => (
                    <div key={i} style={{...styles.riskFactorCard, borderColor: f.severity === 'high' ? '#ef444440' : f.severity === 'medium' ? '#f59e0b40' : '#22c55e40', background: f.severity === 'high' ? 'rgba(239,68,68,0.05)' : f.severity === 'medium' ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.05)'}}>
                      <div style={{width:'40px', height:'40px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', background: f.severity === 'high' ? 'rgba(239,68,68,0.15)' : f.severity === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#22c55e'}}>
                        <i className={`fa-solid ${f.icon}`}></i>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)'}}>{f.label}</div>
                        <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Current: {f.value}{f.unit} • Severity: <span style={{textTransform:'capitalize', color: f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#22c55e'}}>{f.severity}</span></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-check-circle" style={{fontSize:'2rem', color:'#22c55e', marginBottom:'0.75rem', display:'block'}}></i>
                  <p>No significant risk factors detected in current conditions.</p>
                </div>
              )}
            </div>
          )}

          {/* Safety Tips Tab */}
          {activeTab === 'tips' && (
            <div>
              <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1rem'}}>
                <i className="fa-solid fa-shield-halved" style={{marginRight:'6px', color:'#22c55e'}}></i>
                Safety guidelines for <strong>{result.disaster_type || 'general'}</strong> situations:
              </p>
              {(RISK_TIPS[result.disaster_type] || RISK_TIPS['None']).map((tip, i) => (
                <div key={i} style={styles.tipCard}>
                  <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'rgba(34,197,94,0.2)', color:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:600, flexShrink:0}}>{i + 1}</div>
                  <div style={{fontSize:'0.85rem', color:'var(--text-primary)'}}>{tip}</div>
                </div>
              ))}
            </div>
          )}

          {/* Rule Alerts */}
          {result.rule_alerts && result.rule_alerts.length > 0 && (
            <div className="alert-banner warning" style={{marginTop:'1rem'}}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>Safety Threshold Alerts</strong>
                {result.rule_alerts.map((alert, i) => (
                  <p key={i} style={{marginTop:2, fontSize:'0.85rem', opacity:0.9}}>- {alert}</p>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button className="btn btn-primary" onClick={exportReport}>
              <i className="fa-solid fa-file-export"></i> Export Full Report
            </button>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              <i className="fa-solid fa-print"></i> Print
            </button>
            <button className="btn btn-ghost" onClick={() => { setResult(null); window.scrollTo({top:0, behavior:'smooth'}); }}>
              <i className="fa-solid fa-plus"></i> New Prediction
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div style={styles.modal} onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <i className="fa-solid fa-clock-rotate-left" style={{color:'var(--accent-blue)'}}></i>
                Prediction History
              </h3>
              <div style={{display:'flex', gap:'0.5rem'}}>
                {predictionHistory.length > 0 && (
                  <button className="btn btn-ghost" onClick={clearHistory} style={{fontSize:'0.8rem', color:'#ef4444'}}>
                    <i className="fa-solid fa-trash"></i> Clear All
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} style={{background:'none', border:'none', fontSize:'1.25rem', cursor:'pointer', color:'var(--text-secondary)'}}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div style={styles.modalBody}>
              {predictionHistory.length === 0 ? (
                <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-inbox" style={{fontSize:'2rem', marginBottom:'0.75rem', display:'block'}}></i>
                  <p>No prediction history yet.</p>
                  <p style={{fontSize:'0.85rem'}}>Your predictions will appear here for quick reference.</p>
                </div>
              ) : (
                predictionHistory.map((item, i) => (
                  <div
                    key={item.id}
                    style={styles.historyItem}
                    onClick={() => loadFromHistory(item)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--card-bg)'; }}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                      <div style={{width:'40px', height:'40px', borderRadius:'10px', background: `${DISASTER_CONFIG[item.result.disaster_type]?.color || '#64748b'}15`, color: DISASTER_CONFIG[item.result.disaster_type]?.color || '#64748b', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <i className={DISASTER_CONFIG[item.result.disaster_type]?.icon || 'fa-solid fa-circle'}></i>
                      </div>
                      <div>
                        <div style={{fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)'}}>{item.region_name}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{new Date(item.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontWeight:700, fontSize:'1.1rem', color: RISK_COLOR[item.result.risk_level]}}>{item.result.final_risk_score || item.result.risk_score}</div>
                        <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>Risk Score</div>
                      </div>
                      <span className={`risk-badge ${(item.result.risk_level || '').toLowerCase()}`}>{item.result.risk_level}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
