import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardMetrics } from '../services/api';

const COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', None: '#64748b', 'No Disaster': '#64748b', Flood: '#3b82f6', Cyclone: '#8b5cf6', Earthquake: '#f59e0b', Heatwave: '#ef4444', Drought: '#d97706', Tsunami: '#0ea5e9', Wildfire: '#f97316', Landslide: '#a3734c' };

/* Region name map - always available */
const REGION_NAMES = {
  'R001': 'Mumbai Coast', 'R002': 'Delhi NCR', 'R003': 'Chennai',
  'R004': 'Assam Valley', 'R005': 'Rajasthan Desert', 'R006': 'Kerala Coast',
  'R007': 'Gujarat Coast', 'R008': 'Uttarakhand Hills', 'R009': 'Odisha Coast', 'R010': 'Andhra Pradesh',
  'r001': 'Mumbai Coast', 'r002': 'Delhi NCR', 'r003': 'Chennai',
  'r004': 'Assam Valley', 'r005': 'Rajasthan Desert', 'r006': 'Kerala Coast',
  'r007': 'Gujarat Coast', 'r008': 'Uttarakhand Hills', 'r009': 'Odisha Coast', 'r010': 'Andhra Pradesh'
};

/* Helper function to get region name */
const getRegionName = (regionId, regionNameFromApi, regionsArray) => {
  if (regionNameFromApi && regionNameFromApi !== regionId) return regionNameFromApi;
  if (regionsArray) {
    const found = regionsArray.find(r => r.id === regionId);
    if (found?.name) return found.name;
  }
  return REGION_NAMES[regionId] || REGION_NAMES[regionId?.toUpperCase()] || regionId || 'Unknown';
};
const DISASTER_ICONS = { Flood: 'fa-solid fa-water', Cyclone: 'fa-solid fa-hurricane', Earthquake: 'fa-solid fa-house-crack', Heatwave: 'fa-solid fa-temperature-arrow-up', 'No Disaster': 'fa-solid fa-shield-halved', Drought: 'fa-solid fa-sun', Tsunami: 'fa-solid fa-water', Wildfire: 'fa-solid fa-fire', Landslide: 'fa-solid fa-hill-rockslide' };
const STAT_ICONS = { regions: 'fa-solid fa-map-location-dot', predictions: 'fa-solid fa-brain', alerts: 'fa-solid fa-triangle-exclamation', history: 'fa-solid fa-clock-rotate-left' };

/* Animated counter hook */
function useCounter(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    ref.current = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(ref.current); }
      else setCount(start);
    }, 16);
    return () => clearInterval(ref.current);
  }, [target, duration]);
  return count;
}

function StatCard({ label, value, icon, color, delay, pct, onClick }) {
  const animatedVal = useCounter(value);
  return (
    <div className={`card stat-card animate-in animate-in-delay-${delay}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      onMouseEnter={e => { if(onClick) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'; } }}
      onMouseLeave={e => { if(onClick) { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=''; } }}
    >
      <div className="stat-card-inner">
        <div className="stat-info">
          <div className="stat-label">{label}</div>
          <div className={`stat-value ${color}`}>{animatedVal.toLocaleString()}</div>
        </div>
        <div className={`stat-icon ${color}`}>
          <i className={icon}></i>
        </div>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${pct || 75}%`, background: `var(--accent-${color})` }}></div>
      </div>
      {onClick && <div style={{textAlign:'right', marginTop:4}}><span style={{fontSize:'0.65rem', color:'var(--text-muted)', opacity:0.6}}>Click to view <i className="fa-solid fa-arrow-right" style={{fontSize:'0.55rem'}}></i></span></div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.82rem', backdropFilter: 'blur(8px)' }}>
      <p style={{ color: '#e8edf5', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#7b8fad' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
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
      setError('Backend not available — showing demo data');
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

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p className="loading-text">Loading dashboard data...</p>
    </div>
  );

  /* Ensure all 3 risk levels always appear — give zero-value items a tiny display slice */
  const RISK_LEVELS = ['Low', 'Medium', 'High'];
  const rawRisk = metrics ? metrics.risk_distribution : {};
  const totalRisk = RISK_LEVELS.reduce((sum, k) => sum + (rawRisk[k] || 0), 0) || 1;
  const MIN_SLICE = Math.max(1, totalRisk * 0.03); // 3% of total as minimum visible slice
  const riskData = RISK_LEVELS.map(name => {
    const real = rawRisk[name] || 0;
    return { name, value: real, displayValue: real === 0 ? MIN_SLICE : real, realPercent: ((real / totalRisk) * 100).toFixed(0) };
  });

  const disasterData = metrics ? Object.entries(metrics.disaster_type_counts)
    .map(([name, value]) => {
      const cleanName = (!name || name === 'null' || name === 'None' || name === 'undefined') ? 'No Disaster' : name;
      return { name: cleanName, value, color: COLORS[cleanName] || '#3b82f6', icon: DISASTER_ICONS[cleanName] || 'fa-solid fa-circle-exclamation' };
    })
    .reduce((acc, item) => {
      const existing = acc.find(d => d.name === item.name);
      if (existing) existing.value += item.value;
      else acc.push(item);
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    : [];
  const maxDisasterVal = Math.max(...disasterData.map(d => d.value), 1);

  /* Custom label renderer — positions labels outside the ring without overlapping */
  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, payload }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 28;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const realPct = payload.realPercent;
    return (
      <text x={x} y={y} fill={COLORS[name] || '#ccc'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
        style={{ fontSize: '0.8rem', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
        {name} {realPct}%
      </text>
    );
  };

  /* Custom tooltip that shows real value, not the inflated display value */
  const RiskTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.82rem', backdropFilter: 'blur(8px)' }}>
        <p style={{ color: COLORS[d.name], fontWeight: 600, marginBottom: 4 }}>{d.name} Risk</p>
        <p style={{ color: '#e8edf5' }}>Count: <strong>{d.value}</strong></p>
        <p style={{ color: '#7b8fad' }}>Share: <strong>{d.realPercent}%</strong></p>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <span className="page-title-icon blue"><i className="fa-solid fa-chart-line"></i></span>
          Dashboard Overview
        </h2>
        <p className="page-description">Real-time monitoring of disaster risks, predictions, and active alerts across all regions.</p>
      </div>

      {error && (
        <div className="alert-banner warning">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard label="Monitored Regions" value={metrics?.total_regions || 0} icon={STAT_ICONS.regions} color="blue" delay={1} pct={100} onClick={() => navigate('/map')} />
        <StatCard label="Total Predictions" value={metrics?.total_predictions || 0} icon={STAT_ICONS.predictions} color="purple" delay={2} pct={80} onClick={() => navigate('/predict')} />
        <StatCard label="Active Alerts" value={metrics?.active_alerts || 0} icon={STAT_ICONS.alerts} color="red" delay={3} pct={Math.min(100, (metrics?.active_alerts || 0) * 15)} onClick={() => navigate('/alerts')} />
        <StatCard label="Alert History" value={metrics?.total_alerts_history || 0} icon={STAT_ICONS.history} color="orange" delay={4} pct={60} onClick={() => navigate('/alerts')} />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card animate-in" style={{animationDelay: '0.3s'}}>
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
              <span className="card-header-icon" style={{background:'rgba(59,130,246,0.12)', color:'var(--accent-blue)'}}><i className="fa-solid fa-chart-pie"></i></span>
              Risk Distribution
            </div>
            <span className="chip">{totalRisk} total</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="displayValue" stroke="none"
                label={renderPieLabel}
                labelLine={({ points, payload }) => {
                  return (
                    <path d={`M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`}
                      stroke="rgba(200,220,255,0.3)" strokeWidth={1} fill="none" />
                  );
                }}
                isAnimationActive={true}>
                {riskData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || '#888'}
                    fillOpacity={entry.value === 0 ? 0.3 : 1}
                    strokeWidth={entry.value === 0 ? 1 : 0}
                    stroke={entry.value === 0 ? COLORS[entry.name] : 'none'} />
                ))}
              </Pie>
              <Tooltip content={<RiskTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem'}}>
            {riskData.map(d => (
              <div key={d.name} style={{display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', color:'var(--text-secondary)'}}>
                <span style={{width:10, height:10, borderRadius:3, background: COLORS[d.name]}}></span>
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>

        <div className="card animate-in" style={{animationDelay: '0.4s'}}>
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
              <span className="card-header-icon" style={{background:'rgba(139,92,246,0.12)', color:'var(--accent-purple)'}}><i className="fa-solid fa-bolt"></i></span>
              Disaster Types
            </div>
            <span className="chip">{disasterData.reduce((s,d)=>s+d.value,0)} events</span>
          </div>
          <div style={{padding: '0.5rem 0', display:'flex', flexDirection:'column', gap:'0.7rem'}}>
            {disasterData.length === 0 && (
              <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)'}}>
                <i className="fa-solid fa-chart-bar" style={{fontSize:'2rem', marginBottom:8, opacity:0.3}}></i>
                <p>No disaster data yet</p>
              </div>
            )}
            {disasterData.map((d, i) => {
              const pct = Math.max(5, (d.value / maxDisasterVal) * 100);
              return (
                <div key={d.name} style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.4rem 0', animation: `fadeSlideUp 0.4s ease ${i * 0.08}s both`}}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${d.color}18`, color: d.color,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', flexShrink: 0
                  }}>
                    <i className={d.icon}></i>
                  </div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                      <span style={{fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)'}}>{d.name}</span>
                      <span style={{fontSize:'0.82rem', fontWeight:700, color: d.color}}>{d.value}</span>
                    </div>
                    <div style={{width:'100%', height:8, background:'rgba(100,150,255,0.06)', borderRadius:6, overflow:'hidden'}}>
                      <div style={{
                        height:'100%', width:`${pct}%`, borderRadius:6,
                        background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
                        boxShadow: `0 0 8px ${d.color}40`,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
                      }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Predictions — Card-based Professional Layout */}
      <div className="card animate-in" style={{animationDelay: '0.5s'}}>
        <div className="card-header">
          <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
            <span className="card-header-icon" style={{background:'rgba(6,182,212,0.12)', color:'var(--accent-cyan)'}}><i className="fa-solid fa-list-check"></i></span>
            Recent Predictions
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
            <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{(metrics?.recent_predictions || []).length} results</span>
            <span className="chip"><i className="fa-solid fa-rotate" style={{marginRight:4, fontSize:'0.65rem'}}></i> Auto-refresh 30s</span>
          </div>
        </div>

        {(!metrics?.recent_predictions || metrics.recent_predictions.length === 0) ? (
          <div style={{textAlign:'center', padding:'3rem 1rem', color:'var(--text-muted)'}}>
            <i className="fa-solid fa-magnifying-glass-chart" style={{fontSize:'2.5rem', marginBottom:12, opacity:0.25, display:'block'}}></i>
            <p style={{fontWeight:600, fontSize:'1rem', marginBottom:4}}>No Predictions Yet</p>
            <p style={{fontSize:'0.82rem'}}>Go to the <strong>Predict</strong> page and run your first disaster prediction.</p>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'0.6rem', padding:'0.25rem 0'}}>
            {(metrics?.recent_predictions || []).map((pred, i) => {
              const dtype = (!pred.disaster_type || pred.disaster_type === 'null' || pred.disaster_type === 'None') ? 'No Disaster' : pred.disaster_type;
              const dtypeColor = COLORS[dtype] || '#3b82f6';
              const dtypeIcon = DISASTER_ICONS[dtype] || 'fa-solid fa-circle-question';
              const riskColor = pred.risk_score >= 70 ? '#ef4444' : pred.risk_score >= 40 ? '#f59e0b' : '#10b981';
              const riskGlow = pred.risk_score >= 70 ? 'rgba(239,68,68,0.15)' : pred.risk_score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
              const timeStr = new Date(pred.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });

              /* Region name: use helper function for reliable lookup */
              const regionId = pred.region_id || '';
              const regionName = getRegionName(regionId, pred.region_name, metrics?.regions);

              return (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:'1rem', padding:'0.85rem 1rem',
                  background: 'rgba(100,150,255,0.03)', borderRadius: 12,
                  border: '1px solid rgba(100,150,255,0.06)',
                  transition: 'all 0.25s ease',
                  animation: `fadeSlideUp 0.4s ease ${i * 0.06}s both`,
                  cursor: 'default'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,150,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(100,150,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,150,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(100,150,255,0.06)'; }}
                >
                  {/* Serial Number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(100,150,255,0.08)', color:'var(--text-muted)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.72rem', fontWeight:700, flexShrink:0
                  }}>
                    {i + 1}
                  </div>

                  {/* Region — Shows Location Name + ID */}
                  <div style={{minWidth: 140, flexShrink:0}}>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.5px'}}>Location</div>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <div style={{
                        width:28, height:28, borderRadius:8,
                        background: 'rgba(59,130,246,0.12)', color:'var(--accent-blue)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.7rem', flexShrink:0
                      }}>
                        <i className="fa-solid fa-map-marker-alt"></i>
                      </div>
                      <div>
                        <div style={{fontWeight:700, fontSize:'0.86rem', color:'var(--text-primary)', lineHeight:1.2}}>{regionName}</div>
                        <div style={{fontSize:'0.65rem', color:'var(--text-muted)', marginTop:1}}>{pred.region_id}</div>
                      </div>
                    </div>
                  </div>

                  {/* Disaster Type */}
                  <div style={{flex:1, minWidth:120}}>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px'}}>Disaster Type</div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{
                        width:28, height:28, borderRadius:8,
                        background: `${dtypeColor}15`, color: dtypeColor,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.72rem', flexShrink:0
                      }}>
                        <i className={dtypeIcon}></i>
                      </div>
                      <span style={{fontWeight:600, fontSize:'0.84rem', color: dtypeColor}}>{dtype}</span>
                    </div>
                  </div>

                  {/* Risk Score — Circular Gauge */}
                  <div style={{minWidth: 110, flexShrink:0}}>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px'}}>Risk Score</div>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div style={{
                        position:'relative', width:36, height:36,
                        borderRadius:'50%',
                        background: `conic-gradient(${riskColor} ${pred.risk_score * 3.6}deg, rgba(100,150,255,0.08) 0deg)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow: `0 0 12px ${riskGlow}`
                      }}>
                        <div style={{
                          width:26, height:26, borderRadius:'50%',
                          background:'var(--card-bg, #0c1b2e)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'0.68rem', fontWeight:800, color: riskColor
                        }}>
                          {pred.risk_score}
                        </div>
                      </div>
                      <div style={{
                        height:6, flex:1, maxWidth:50,
                        background:'rgba(100,150,255,0.08)', borderRadius:4, overflow:'hidden'
                      }}>
                        <div style={{
                          height:'100%', width:`${pred.risk_score}%`, borderRadius:4,
                          background: `linear-gradient(90deg, ${riskColor}99, ${riskColor})`,
                          transition: 'width 0.6s ease'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  <div style={{minWidth:70, flexShrink:0, textAlign:'center'}}>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px'}}>Level</div>
                    <span className={`risk-badge ${(pred.risk_level || '').toLowerCase()}`} style={{
                      fontSize:'0.7rem', padding:'4px 12px', borderRadius:20, fontWeight:700, letterSpacing:'0.5px'
                    }}>
                      {pred.risk_level || 'N/A'}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div style={{minWidth:130, flexShrink:0, textAlign:'right'}}>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.5px'}}>When</div>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5}}>
                      <i className="fa-regular fa-clock" style={{fontSize:'0.68rem', color:'var(--text-muted)'}}></i>
                      <span style={{fontSize:'0.78rem', color:'var(--text-secondary)'}}>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
